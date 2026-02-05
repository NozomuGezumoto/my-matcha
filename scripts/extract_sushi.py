#!/usr/bin/env python3
"""
extract_sushi.py - Extract sushi restaurants from OSM PBF and output as GeoJSON

Usage:
    python extract_sushi.py input.osm.pbf output.geojson [--pref PREFECTURE]

Requirements:
    - osmium (Python bindings)
    - shapely
"""

import argparse
import json
import sys
from collections import defaultdict
from typing import Optional

import osmium
from shapely.geometry import Point, mapping
from shapely.ops import unary_union


# Prefecture name mappings (Japanese to romanized for filtering)
PREFECTURE_MAP = {
    "tokyo": ["東京都", "東京", "Tokyo"],
    "osaka": ["大阪府", "大阪", "Osaka"],
    "kyoto": ["京都府", "京都", "Kyoto"],
    "hokkaido": ["北海道", "Hokkaido"],
    "kanagawa": ["神奈川県", "神奈川", "Kanagawa"],
    "aichi": ["愛知県", "愛知", "Aichi"],
    "fukuoka": ["福岡県", "福岡", "Fukuoka"],
    "hyogo": ["兵庫県", "兵庫", "Hyogo"],
    "saitama": ["埼玉県", "埼玉", "Saitama"],
    "chiba": ["千葉県", "千葉", "Chiba"],
    "shizuoka": ["静岡県", "静岡", "Shizuoka"],
    "hiroshima": ["広島県", "広島", "Hiroshima"],
    "miyagi": ["宮城県", "宮城", "Miyagi"],
    "niigata": ["新潟県", "新潟", "Niigata"],
    "nagano": ["長野県", "長野", "Nagano"],
    "okinawa": ["沖縄県", "沖縄", "Okinawa"],
    "ibaraki": ["茨城県", "茨城", "Ibaraki"],
    "tochigi": ["栃木県", "栃木", "Tochigi"],
    "gunma": ["群馬県", "群馬", "Gunma"],
    "nara": ["奈良県", "奈良", "Nara"],
    "mie": ["三重県", "三重", "Mie"],
    "gifu": ["岐阜県", "岐阜", "Gifu"],
    "okayama": ["岡山県", "岡山", "Okayama"],
    "kumamoto": ["熊本県", "熊本", "Kumamoto"],
    "kagoshima": ["鹿児島県", "鹿児島", "Kagoshima"],
    "yamaguchi": ["山口県", "山口", "Yamaguchi"],
    "nagasaki": ["長崎県", "長崎", "Nagasaki"],
    "ehime": ["愛媛県", "愛媛", "Ehime"],
    "aomori": ["青森県", "青森", "Aomori"],
    "iwate": ["岩手県", "岩手", "Iwate"],
    "yamagata": ["山形県", "山形", "Yamagata"],
    "fukushima": ["福島県", "福島", "Fukushima"],
    "akita": ["秋田県", "秋田", "Akita"],
    "toyama": ["富山県", "富山", "Toyama"],
    "ishikawa": ["石川県", "石川", "Ishikawa"],
    "fukui": ["福井県", "福井", "Fukui"],
    "yamanashi": ["山梨県", "山梨", "Yamanashi"],
    "wakayama": ["和歌山県", "和歌山", "Wakayama"],
    "tottori": ["鳥取県", "鳥取", "Tottori"],
    "shimane": ["島根県", "島根", "Shimane"],
    "tokushima": ["徳島県", "徳島", "Tokushima"],
    "kagawa": ["香川県", "香川", "Kagawa"],
    "kochi": ["高知県", "高知", "Kochi"],
    "saga": ["佐賀県", "佐賀", "Saga"],
    "oita": ["大分県", "大分", "Oita"],
    "miyazaki": ["宮崎県", "宮崎", "Miyazaki"],
}


def is_sushi_shop(tags: dict) -> bool:
    """
    Check if OSM tags indicate a sushi restaurant.
    
    Criteria (OR conditions):
    1. amenity=restaurant AND cuisine=sushi
    2. amenity=restaurant AND name contains "寿司"
    3. shop=seafood AND name contains "寿司"
    4. amenity=fast_food AND cuisine=sushi
    """
    amenity = tags.get("amenity", "")
    shop = tags.get("shop", "")
    cuisine = tags.get("cuisine", "").lower()
    name = tags.get("name", "")
    
    # Check for sushi in cuisine (can be comma-separated list)
    has_sushi_cuisine = "sushi" in cuisine
    
    # Check for "寿司" in name (various forms)
    sushi_keywords = ["寿司", "すし", "スシ", "鮨", "sushi"]
    has_sushi_name = any(kw in name.lower() for kw in sushi_keywords)
    
    # Condition 1: restaurant with sushi cuisine
    if amenity == "restaurant" and has_sushi_cuisine:
        return True
    
    # Condition 2: restaurant with sushi in name
    if amenity == "restaurant" and has_sushi_name:
        return True
    
    # Condition 3: seafood shop with sushi in name
    if shop == "seafood" and has_sushi_name:
        return True
    
    # Condition 4: fast_food with sushi cuisine (conveyor belt sushi, etc.)
    if amenity == "fast_food" and has_sushi_cuisine:
        return True
    
    return False


def matches_prefecture(tags: dict, pref_filter: Optional[str]) -> bool:
    """Check if the feature matches the prefecture filter."""
    if pref_filter is None:
        return True
    
    pref_names = PREFECTURE_MAP.get(pref_filter.lower(), [pref_filter])
    
    # Check addr:prefecture
    addr_pref = tags.get("addr:prefecture", "")
    if any(p in addr_pref for p in pref_names):
        return True
    
    # Check addr:full for prefecture name
    addr_full = tags.get("addr:full", "")
    if any(p in addr_full for p in pref_names):
        return True
    
    # Check addr:city (sometimes contains prefecture)
    addr_city = tags.get("addr:city", "")
    if any(p in addr_city for p in pref_names):
        return True
    
    return False


def extract_properties(osm_id: str, tags: dict) -> dict:
    """Extract required properties from OSM tags."""
    # Try to get reading/hiragana name for sorting
    # OSM uses various tags: name:ja_rm (romanized), name:ja-Hira (hiragana), 
    # name:ja_kana (kana), name:ja (often kana reading)
    name_reading = (
        tags.get("name:ja-Hira") or 
        tags.get("name:ja_kana") or 
        tags.get("name:ja_rm") or
        tags.get("name:ja") or
        ""
    )
    
    return {
        "osm_id": osm_id,
        "name": tags.get("name", ""),
        "name_reading": name_reading,  # ひらがな/カタカナ/ローマ字の読み
        "amenity": tags.get("amenity", ""),
        "shop": tags.get("shop", ""),
        "cuisine": tags.get("cuisine", ""),
        "addr:prefecture": tags.get("addr:prefecture", ""),
        "addr:city": tags.get("addr:city", ""),
        "addr:full": tags.get("addr:full", ""),
        "source": "OSM"
    }


class NodeCollector(osmium.SimpleHandler):
    """First pass: collect node coordinates for way/relation centroid calculation."""
    
    def __init__(self):
        super().__init__()
        self.node_coords = {}
    
    def node(self, n):
        if n.location.valid():
            self.node_coords[n.id] = (n.location.lon, n.location.lat)


class SushiExtractor(osmium.SimpleHandler):
    """Second pass: extract sushi restaurants."""
    
    def __init__(self, node_coords: dict, pref_filter: Optional[str] = None):
        super().__init__()
        self.node_coords = node_coords
        self.pref_filter = pref_filter
        self.features = []
        self.way_nodes = {}  # Store way node refs for centroid calculation
    
    def node(self, n):
        if not n.location.valid():
            return
        
        tags = dict(n.tags)
        if not is_sushi_shop(tags):
            return
        
        if not matches_prefecture(tags, self.pref_filter):
            return
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [n.location.lon, n.location.lat]
            },
            "properties": extract_properties(f"node/{n.id}", tags)
        }
        self.features.append(feature)
    
    def way(self, w):
        tags = dict(w.tags)
        if not is_sushi_shop(tags):
            return
        
        if not matches_prefecture(tags, self.pref_filter):
            return
        
        # Calculate centroid from way nodes
        coords = []
        for node_ref in w.nodes:
            if node_ref.ref in self.node_coords:
                coords.append(self.node_coords[node_ref.ref])
        
        if not coords:
            return
        
        # Calculate centroid
        lon = sum(c[0] for c in coords) / len(coords)
        lat = sum(c[1] for c in coords) / len(coords)
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": extract_properties(f"way/{w.id}", tags)
        }
        self.features.append(feature)
    
    def relation(self, r):
        tags = dict(r.tags)
        if not is_sushi_shop(tags):
            return
        
        if not matches_prefecture(tags, self.pref_filter):
            return
        
        # Collect coordinates from member nodes/ways
        coords = []
        for member in r.members:
            if member.type == 'n' and member.ref in self.node_coords:
                coords.append(self.node_coords[member.ref])
        
        if not coords:
            return
        
        # Calculate centroid
        lon = sum(c[0] for c in coords) / len(coords)
        lat = sum(c[1] for c in coords) / len(coords)
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": extract_properties(f"relation/{r.id}", tags)
        }
        self.features.append(feature)


def deduplicate_features(features: list) -> list:
    """
    Remove duplicate features based on same coordinates and name.
    Uses (rounded coordinates + name) as key.
    """
    seen = set()
    unique_features = []
    
    for feature in features:
        coords = feature["geometry"]["coordinates"]
        name = feature["properties"]["name"]
        
        # Round coordinates to ~1m precision for deduplication
        key = (round(coords[0], 5), round(coords[1], 5), name)
        
        if key not in seen:
            seen.add(key)
            unique_features.append(feature)
    
    return unique_features


def main():
    parser = argparse.ArgumentParser(
        description="Extract sushi restaurants from OSM PBF file"
    )
    parser.add_argument("input", help="Input OSM PBF file")
    parser.add_argument("output", help="Output GeoJSON file")
    parser.add_argument(
        "--pref", 
        help="Filter by prefecture (e.g., tokyo, osaka)",
        default=None
    )
    parser.add_argument(
        "--no-dedup",
        action="store_true",
        help="Disable deduplication"
    )
    
    args = parser.parse_args()
    
    print(f"Processing: {args.input}")
    if args.pref:
        print(f"Prefecture filter: {args.pref}")
    
    # First pass: collect node coordinates
    print("Pass 1: Collecting node coordinates...")
    node_collector = NodeCollector()
    node_collector.apply_file(args.input, locations=True)
    print(f"  Collected {len(node_collector.node_coords):,} node coordinates")
    
    # Second pass: extract sushi restaurants
    print("Pass 2: Extracting sushi restaurants...")
    extractor = SushiExtractor(node_collector.node_coords, args.pref)
    extractor.apply_file(args.input, locations=True)
    
    features = extractor.features
    print(f"  Found {len(features):,} sushi restaurants")
    
    # Deduplicate
    if not args.no_dedup:
        features = deduplicate_features(features)
        print(f"  After deduplication: {len(features):,} features")
    
    # Create GeoJSON
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"\nOutput written to: {args.output}")
    print(f"Total features: {len(features):,}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
