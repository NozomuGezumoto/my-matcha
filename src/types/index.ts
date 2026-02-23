// ============================================
// My Macha (抹茶) - Matcha spot types
// Pins = 抹茶を楽しめるスポット（カフェ・茶房・販売店）
// ============================================

export type MatchaSpotType = 'cafe' | 'tea_house' | 'shop';

export interface MatchaSpot {
  id: string;
  name: string;
  name_reading?: string;
  prefecture: string;
  address?: string;
  type: MatchaSpotType;
  characteristics?: string;
  source?: string;
}

export interface MatchaFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: MatchaSpot & { 'addr:prefecture'?: string; 'addr:full'?: string };
}

export interface MatchaGeoJSON {
  type: 'FeatureCollection';
  features: MatchaFeature[];
}

export interface MatchaPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  nameReading: string;
  type: MatchaSpotType;
  address: string;
  prefecture: string;
  characteristics?: string;
  isCustom?: boolean;
}


// 都道府県リスト
export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const;

export type Prefecture = typeof PREFECTURES[number];

// ============================================
// Brewery (地ビール) - types for map/data
// ============================================

export type BreweryPinType = 'microbrewery' | 'brewpub' | 'regional';

export interface BreweryPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  nameReading: string;
  type: BreweryPinType;
  address: string;
  prefecture: string;
  characteristics?: string;
  isCustom?: boolean;
}

export interface BreweryFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

export interface BreweryGeoJSON {
  type: 'FeatureCollection';
  features: BreweryFeature[];
}

export interface CustomBrewery {
  id: string;
  name: string;
  type: BreweryPinType;
  lat: number;
  lng: number;
  address?: string;
  createdAt: string;
}

// ============================================
// Sushi - types for map/data
// ============================================

export type SushiPinType = 'restaurant' | 'fast_food' | 'seafood';

export interface SushiPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  nameReading: string;
  type: SushiPinType;
  cuisine: string;
  address: string;
  prefecture: string;
  isCustom?: boolean;
}

export interface SushiFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

export interface SushiGeoJSON {
  type: 'FeatureCollection';
  features: SushiFeature[];
}

export interface CustomShop {
  id: string;
  name: string;
  type: SushiPinType;
  lat: number;
  lng: number;
  address?: string;
  createdAt: string;
}
