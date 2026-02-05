// ============================================
// Sushi Shop Data Loader
// Loads and transforms GeoJSON data for display
// ============================================

import { SushiGeoJSON, SushiFeature, SushiPin } from '../types';
import { CustomShop } from '../store/useStore';

// Import the Japan-wide sushi data
// Note: In production, this would be loaded from an API or async import
import japanSushiData from './japan_sushi.json';

// 都道府県の座標範囲（おおよその境界）
// [minLat, maxLat, minLng, maxLng]
const PREFECTURE_BOUNDS: { [key: string]: [number, number, number, number] } = {
  '北海道': [41.3, 45.6, 139.3, 145.9],
  '青森県': [40.2, 41.6, 139.4, 141.7],
  '岩手県': [38.7, 40.5, 140.6, 142.1],
  '宮城県': [37.7, 39.0, 140.2, 141.7],
  '秋田県': [39.0, 40.5, 139.7, 140.9],
  '山形県': [37.7, 39.2, 139.5, 140.7],
  '福島県': [36.8, 37.9, 139.1, 141.1],
  '茨城県': [35.7, 36.9, 139.6, 140.9],
  '栃木県': [36.2, 37.2, 139.3, 140.3],
  '群馬県': [36.0, 37.1, 138.4, 139.7],
  '埼玉県': [35.7, 36.3, 138.7, 139.9],
  '千葉県': [34.9, 36.1, 139.7, 140.9],
  '東京都': [35.5, 35.9, 138.9, 139.9],
  '神奈川県': [35.1, 35.7, 138.9, 139.8],
  '新潟県': [36.7, 38.6, 137.8, 140.0],
  '富山県': [36.3, 36.9, 136.7, 137.8],
  '石川県': [36.1, 37.9, 136.2, 137.4],
  '福井県': [35.4, 36.3, 135.4, 136.8],
  '山梨県': [35.2, 35.9, 138.1, 139.2],
  '長野県': [35.2, 37.0, 137.3, 138.8],
  '岐阜県': [35.1, 36.5, 136.3, 137.7],
  '静岡県': [34.6, 35.6, 137.4, 139.2],
  '愛知県': [34.5, 35.4, 136.6, 137.8],
  '三重県': [33.7, 35.2, 135.8, 136.9],
  '滋賀県': [34.8, 35.7, 135.7, 136.5],
  '京都府': [34.8, 35.8, 134.8, 136.1],
  '大阪府': [34.2, 35.0, 135.1, 135.8],
  '兵庫県': [34.2, 35.7, 134.2, 135.5],
  '奈良県': [33.8, 34.8, 135.5, 136.2],
  '和歌山県': [33.4, 34.4, 135.0, 136.0],
  '鳥取県': [35.0, 35.6, 133.1, 134.5],
  '島根県': [34.3, 36.3, 131.6, 133.4],
  '岡山県': [34.3, 35.3, 133.4, 134.5],
  '広島県': [34.0, 35.1, 132.0, 133.5],
  '山口県': [33.7, 34.8, 130.8, 132.2],
  '徳島県': [33.7, 34.3, 133.5, 134.8],
  '香川県': [34.0, 34.5, 133.5, 134.5],
  '愛媛県': [32.9, 34.1, 132.0, 133.7],
  '高知県': [32.7, 33.9, 132.4, 134.3],
  '福岡県': [33.0, 33.9, 130.0, 131.2],
  '佐賀県': [32.9, 33.6, 129.7, 130.5],
  '長崎県': [32.5, 34.7, 128.6, 130.4],
  '熊本県': [32.0, 33.2, 130.1, 131.3],
  '大分県': [32.7, 33.8, 130.8, 132.1],
  '宮崎県': [31.3, 32.9, 130.6, 131.9],
  '鹿児島県': [27.0, 32.3, 128.4, 131.2],
  '沖縄県': [24.0, 27.9, 122.9, 131.3],
};

/**
 * Determine prefecture from coordinates
 */
function getPrefectureFromCoords(lat: number, lng: number): string {
  // Check each prefecture's bounds
  for (const [pref, bounds] of Object.entries(PREFECTURE_BOUNDS)) {
    const [minLat, maxLat, minLng, maxLng] = bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return pref;
    }
  }
  return '';
}

// 回転寿司チェーン店の名前パターン
const KAITEN_CHAIN_PATTERNS = [
  'スシロー', 'すしろー', 'SUSHIRO',
  'はま寿司', 'はまずし', 'はま鮨',
  'くら寿司', 'くらずし', 'くら鮨', '無添くら',
  'かっぱ寿司', 'かっぱずし', 'カッパ寿司',
  '元気寿司', 'げんき寿司',
  '魚べい', 'うおべい',
  'がってん寿司',
  'すし銚子丸',
  'ちよだ鮨', '千代田鮨',
];

/**
 * Check if shop name indicates a kaiten-zushi chain
 */
function isKaitenChain(name: string): boolean {
  const lowerName = name.toLowerCase();
  return KAITEN_CHAIN_PATTERNS.some(pattern => 
    lowerName.includes(pattern.toLowerCase())
  );
}

/**
 * Extract prefecture from address fields or coordinates
 */
function extractPrefecture(props: SushiFeature['properties'], lat: number, lng: number): string {
  // First try addr:prefecture
  if (props['addr:prefecture']) {
    return props['addr:prefecture'];
  }
  
  // Try to extract from addr:full
  const addrFull = props['addr:full'] || '';
  const prefectureMatch = addrFull.match(/^(北海道|東京都|大阪府|京都府|.{2,3}県)/);
  if (prefectureMatch) {
    return prefectureMatch[1];
  }
  
  // Try to extract from addr:city (sometimes includes prefecture)
  const addrCity = props['addr:city'] || '';
  const cityMatch = addrCity.match(/^(北海道|東京都|大阪府|京都府|.{2,3}県)/);
  if (cityMatch) {
    return cityMatch[1];
  }
  
  // Fallback: determine from coordinates
  return getPrefectureFromCoords(lat, lng);
}

/**
 * Transform GeoJSON feature to SushiPin format
 */
function featureToPin(feature: SushiFeature): SushiPin {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const name = props.name || '寿司店';
  
  // Determine type (check kaiten chain first, then OSM tags)
  let type: SushiPin['type'] = 'restaurant';
  if (props.amenity === 'fast_food' || isKaitenChain(name)) {
    type = 'fast_food';
  } else if (props.shop === 'seafood') {
    type = 'seafood';
  }
  
  // Extract prefecture (from address or coordinates)
  const prefecture = extractPrefecture(props, lat, lng);
  
  // Build address string
  const addressParts = [
    props['addr:prefecture'],
    props['addr:city'],
    props['addr:full'],
  ].filter(Boolean);
  
  // Use reading for sorting if available, otherwise use name
  const nameReading = props.name_reading || name;
  
  return {
    id: props.osm_id,
    lat,
    lng,
    name,
    nameReading,
    type,
    cuisine: props.cuisine || 'sushi',
    address: addressParts.join(' ') || '',
    prefecture,
    isCustom: false,
  };
}

/**
 * Transform CustomShop to SushiPin format
 */
export function customShopToPin(shop: CustomShop): SushiPin {
  // Check if custom shop is a kaiten chain
  const type = isKaitenChain(shop.name) ? 'fast_food' : shop.type;
  
  return {
    id: shop.id,
    lat: shop.lat,
    lng: shop.lng,
    name: shop.name,
    nameReading: shop.name,
    type,
    cuisine: 'sushi',
    address: shop.address || '',
    prefecture: getPrefectureFromCoords(shop.lat, shop.lng),
    isCustom: true,
  };
}

/**
 * Get all sushi pins for Japan (OSM data only)
 */
export function getAllSushiPins(): SushiPin[] {
  const data = japanSushiData as SushiGeoJSON;
  return data.features.map(featureToPin);
}

/**
 * Get total count of sushi shops (OSM data only)
 */
export function getSushiCount(): number {
  const data = japanSushiData as SushiGeoJSON;
  return data.features.length;
}

// Alias for backward compatibility
export const getTokyoSushiPins = getAllSushiPins;
