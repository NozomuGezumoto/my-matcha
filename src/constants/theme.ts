// ============================================
// My Sushi - Theme Configuration
// Modern Japanese-inspired palette
// ============================================

export const SUSHI_COLORS = {
  // Primary - 藍色 (Indigo) - 落ち着いた日本的な色
  primary: '#3b5998',
  primaryLight: '#5a7fc2',
  primaryDark: '#2d4373',

  // Accent colors
  accent: '#e85d75',          // 桜色 (Sakura pink) - 行きたい
  accentSecondary: '#2d9d78', // 若竹色 (Bamboo green) - 行った
  accentTertiary: '#f0a500',  // 山吹色 (Yamabuki gold)
  
  // Backgrounds - クリーンで落ち着いた白
  background: '#f8f9fa',
  backgroundElevated: '#ffffff',
  backgroundCard: '#ffffff',

  // Surface - ほんのり暖かみ
  surface: '#f1f3f4',
  surfaceLight: '#f8f9fa',
  surfaceDark: '#e8eaed',

  // Text - しっかりしたコントラスト
  textPrimary: '#202124',
  textSecondary: '#5f6368',
  textMuted: '#9aa0a6',

  // Semantic
  success: '#2d9d78',
  warning: '#f0a500',
  error: '#d93025',

  // Map
  mapOverlay: 'rgba(248, 249, 250, 0.95)',
  mapOverlayLight: 'rgba(248, 249, 250, 0.80)',

  // Pins
  sushiPin: '#3b5998',
  cluster: '#e85d75',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
};

export const TOKYO_CENTER = {
  latitude: 35.6762,
  longitude: 139.6503,
};

export const TOKYO_INITIAL_REGION = {
  latitude: 35.6762,
  longitude: 139.6503,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

// Japan-wide view (centered roughly on Honshu)
export const JAPAN_CENTER = {
  latitude: 36.5,
  longitude: 138.0,
};

export const JAPAN_INITIAL_REGION = {
  latitude: 36.5,
  longitude: 138.0,
  latitudeDelta: 12.0,  // Show most of Japan
  longitudeDelta: 12.0,
};

export const PIN_SIZE = {
  marker: 44,
  cluster: 48,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
};
