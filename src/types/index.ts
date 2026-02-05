// Sushi shop data types (from OSM GeoJSON)

export interface SushiShop {
  osm_id: string;
  name: string;
  name_reading?: string;  // ひらがな/カタカナ読み（あれば）
  amenity: string;
  shop: string;
  cuisine: string;
  'addr:prefecture': string;
  'addr:city': string;
  'addr:full': string;
  source: string;
}

export interface SushiFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: SushiShop;
}

export interface SushiGeoJSON {
  type: 'FeatureCollection';
  features: SushiFeature[];
}

// Map pin for display
export interface SushiPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  nameReading: string;  // ソート用（読み仮名があればそれ、なければname）
  type: 'restaurant' | 'fast_food' | 'seafood';
  cuisine: string;
  address: string;
  prefecture: string;   // 都道府県（フィルター用）
  isCustom?: boolean;   // ユーザーが追加した店舗
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
