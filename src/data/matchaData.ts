// ============================================
// My Macha (抹茶) Data Loader
// Loads matcha spots (cafes, tea houses, shops) for map pins
// ============================================

import { MatchaGeoJSON, MatchaFeature, MatchaPin } from '../types';
import { CustomMatchaSpot } from '../store/useStore';

import japanMatchaData from './japan_matcha.json';

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
  '山梨県': [35.2, 36.05, 138.1, 139.2],
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
  '福岡県': [33.0, 34.0, 130.0, 131.2],
  '佐賀県': [32.9, 33.6, 129.7, 130.5],
  '長崎県': [32.5, 34.7, 128.6, 130.4],
  '熊本県': [32.0, 33.2, 130.1, 131.3],
  '大分県': [32.7, 33.8, 130.8, 132.1],
  '宮崎県': [31.3, 32.9, 130.6, 131.9],
  '鹿児島県': [27.0, 32.3, 128.4, 131.2],
  '沖縄県': [24.0, 27.9, 122.9, 131.3],
};

function getPrefectureFromCoords(lat: number, lng: number): string {
  for (const [pref, bounds] of Object.entries(PREFECTURE_BOUNDS)) {
    const [minLat, maxLat, minLng, maxLng] = bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return pref;
    }
  }
  return '';
}

interface MatchaFeatureProps {
  id?: string;
  name: string;
  name_reading?: string;
  prefecture: string;
  address?: string;
  type: MatchaPin['type'];
  characteristics?: string;
  source?: string;
}

function featureToPin(feature: MatchaFeature): MatchaPin {
  const props = feature.properties as MatchaFeatureProps;
  const [lng, lat] = feature.geometry.coordinates;
  const name = props.name || '抹茶スポット';
  return {
    id: props.id || `matcha-${feature.geometry.coordinates.join('-')}`,
    lat,
    lng,
    name,
    nameReading: props.name_reading || name,
    type: props.type || 'cafe',
    address: props.address || props.prefecture || '',
    prefecture: props.prefecture || getPrefectureFromCoords(lat, lng),
    characteristics: props.characteristics,
    isCustom: false,
  };
}

export function customMatchaSpotToPin(spot: CustomMatchaSpot): MatchaPin {
  return {
    id: spot.id,
    lat: spot.lat,
    lng: spot.lng,
    name: spot.name,
    nameReading: spot.name,
    type: spot.type,
    address: spot.address || '',
    prefecture: getPrefectureFromCoords(spot.lat, spot.lng),
    isCustom: true,
  };
}

export function getAllMatchaPins(): MatchaPin[] {
  const data = japanMatchaData as MatchaGeoJSON;
  return data.features.map((f) => featureToPin(f as MatchaFeature));
}

export function getMatchaSpotCount(): number {
  const data = japanMatchaData as MatchaGeoJSON;
  return data.features.length;
}
