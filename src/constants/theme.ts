// ============================================
// My Macha (抹茶) - Theme Configuration
// Matcha / tea inspired palette
// ============================================

export const BEER_COLORS = {
  // Primary - 抹茶色 (Matcha green)
  primary: '#2d5016',
  primaryLight: '#4a7c23',
  primaryDark: '#1e3d0f',

  // Accent colors
  accent: '#6b8e4e',          // 行きたい (落ち着いた緑)
  accentSecondary: '#2d5016',  // ごちそうさまでした (濃い抹茶)
  accentTertiary: '#5a8f3a',   // アクセント緑

  // Backgrounds
  background: '#f5f7f2',
  backgroundElevated: '#ffffff',
  backgroundCard: '#ffffff',

  // Surface
  surface: '#eef2e8',
  surfaceLight: '#f5f7f2',
  surfaceDark: '#dfe6d8',

  // Text
  textPrimary: '#1c1917',
  textSecondary: '#4a5d3a',
  textMuted: '#6b7c5e',

  // Semantic
  success: '#2d5016',
  warning: '#8b6914',
  error: '#b91c1c',

  // Map
  mapOverlay: 'rgba(245, 247, 242, 0.95)',
  mapOverlayLight: 'rgba(245, 247, 242, 0.80)',

  // Pins
  beerPin: '#2d5016',
  cluster: '#4a7c23',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
};

// Alias for components that reference SUSHI_COLORS
export const SUSHI_COLORS = BEER_COLORS;

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
