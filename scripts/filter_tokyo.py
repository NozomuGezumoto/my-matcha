#!/usr/bin/env python3
"""
Filter sushi GeoJSON data for Tokyo area only.
"""

import json
import sys

# Tokyo bounds (from city config)
TOKYO_BOUNDS = {
    "north": 35.82,
    "south": 35.53,
    "east": 139.91,
    "west": 139.50
}

def main():
    input_file = "data/out/sushi_kanto.geojson"
    output_file = "data/out/sushi_tokyo_filtered.geojson"
    
    print(f"Reading: {input_file}")
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    original_count = len(data["features"])
    print(f"Original features: {original_count}")
    
    # Filter for Tokyo bounds
    tokyo_features = []
    for feature in data["features"]:
        coords = feature["geometry"]["coordinates"]
        lon, lat = coords[0], coords[1]
        
        if (TOKYO_BOUNDS["west"] <= lon <= TOKYO_BOUNDS["east"] and
            TOKYO_BOUNDS["south"] <= lat <= TOKYO_BOUNDS["north"]):
            tokyo_features.append(feature)
    
    print(f"Tokyo features: {len(tokyo_features)}")
    
    # Create new GeoJSON
    tokyo_data = {
        "type": "FeatureCollection",
        "features": tokyo_features
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(tokyo_data, f, ensure_ascii=False, indent=2)
    
    print(f"Output: {output_file}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
