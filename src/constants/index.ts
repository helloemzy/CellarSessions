// App configuration constants
export const APP_CONFIG = {
  APP_NAME: 'Cellar Sessions',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@cellarsessions.com',
  TERMS_URL: 'https://cellarsessions.com/terms',
  PRIVACY_URL: 'https://cellarsessions.com/privacy',
} as const

// Supabase configuration
export const SUPABASE_CONFIG = {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  SERVICE_ROLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '',
} as const

// Storage bucket names
export const STORAGE_BUCKETS = {
  WINE_PHOTOS: 'wine-photos',
  VOICE_NOTES: 'voice-notes',
  AVATARS: 'avatars',
} as const

// Color theme constants
export const COLORS = {
  // Brand colors
  PRIMARY: '#8B2635', // Wine red
  PRIMARY_LIGHT: '#A13A4A',
  PRIMARY_DARK: '#6B1D28',
  
  SECONDARY: '#C9A96E', // Golden
  SECONDARY_LIGHT: '#D4B983',
  SECONDARY_DARK: '#B8935A',
  
  ACCENT: '#2D3E50', // Dark blue-gray
  
  // Neutral colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F3F4F6',
  GRAY_200: '#E5E7EB',
  GRAY_300: '#D1D5DB',
  GRAY_400: '#9CA3AF',
  GRAY_500: '#6B7280',
  GRAY_600: '#4B5563',
  GRAY_700: '#374151',
  GRAY_800: '#1F2937',
  GRAY_900: '#111827',
  
  // Status colors
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
  
  // Wine type colors
  RED_WINE: '#722F37',
  WHITE_WINE: '#F4E4BC',
  ROSE_WINE: '#E8A4A0',
  SPARKLING_WINE: '#F0F8E8',
  DESSERT_WINE: '#8B4513',
  FORTIFIED_WINE: '#654321',
} as const

// Typography scale
export const TYPOGRAPHY = {
  FONT_SIZE: {
    XS: 12,
    SM: 14,
    BASE: 16,
    LG: 18,
    XL: 20,
    '2XL': 24,
    '3XL': 30,
    '4XL': 36,
    '5XL': 48,
  },
  FONT_WEIGHT: {
    THIN: '100',
    LIGHT: '300',
    NORMAL: '400',
    MEDIUM: '500',
    SEMI_BOLD: '600',
    BOLD: '700',
    EXTRA_BOLD: '800',
    BLACK: '900',
  },
  LINE_HEIGHT: {
    TIGHT: 1.25,
    NORMAL: 1.5,
    RELAXED: 1.625,
    LOOSE: 2,
  },
} as const

// Spacing scale
export const SPACING = {
  XS: 4,
  SM: 8,
  BASE: 16,
  LG: 24,
  XL: 32,
  '2XL': 48,
  '3XL': 64,
  '4XL': 80,
  '5XL': 96,
} as const

// Border radius scale
export const BORDER_RADIUS = {
  NONE: 0,
  SM: 4,
  BASE: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  FULL: 9999,
} as const

// Shadow presets
export const SHADOWS = {
  NONE: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  SM: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  BASE: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  MD: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  LG: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
} as const

// WSET framework constants
export const WSET_FRAMEWORK = {
  APPEARANCE_INTENSITY: [
    { value: 1, label: 'Pale' },
    { value: 2, label: 'Medium(-)' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Medium(+)' },
    { value: 5, label: 'Deep' },
  ],
  
  NOSE_INTENSITY: [
    { value: 1, label: 'Light' },
    { value: 2, label: 'Medium(-)' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Medium(+)' },
    { value: 5, label: 'Pronounced' },
  ],
  
  PALATE_SWEETNESS: [
    { value: 1, label: 'Bone Dry' },
    { value: 2, label: 'Dry' },
    { value: 3, label: 'Off-Dry' },
    { value: 4, label: 'Medium Sweet' },
    { value: 5, label: 'Sweet' },
  ],
  
  PALATE_ACIDITY: [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium(-)' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Medium(+)' },
    { value: 5, label: 'High' },
  ],
  
  PALATE_TANNIN: [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium(-)' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Medium(+)' },
    { value: 5, label: 'High' },
  ],
  
  QUALITY_LEVEL: [
    { value: 1, label: 'Poor' },
    { value: 2, label: 'Acceptable' },
    { value: 3, label: 'Good' },
    { value: 4, label: 'Very Good' },
    { value: 5, label: 'Outstanding' },
  ],
} as const

// Wine descriptor categories
export const WINE_DESCRIPTORS = {
  RED_FRUIT: ['Cherry', 'Strawberry', 'Raspberry', 'Red Plum', 'Cranberry'],
  BLACK_FRUIT: ['Blackberry', 'Blackcurrant', 'Black Cherry', 'Black Plum', 'Blueberry'],
  STONE_FRUIT: ['Peach', 'Apricot', 'Nectarine', 'Plum'],
  CITRUS: ['Lemon', 'Lime', 'Orange', 'Grapefruit', 'Yuzu'],
  TROPICAL: ['Pineapple', 'Mango', 'Passion Fruit', 'Papaya', 'Lychee'],
  TREE_FRUIT: ['Apple', 'Pear', 'Quince'],
  FLORAL: ['Rose', 'Violet', 'Lavender', 'Orange Blossom', 'Elderflower'],
  HERBAL: ['Mint', 'Eucalyptus', 'Dill', 'Fennel', 'Bay Leaf'],
  SPICE: ['Black Pepper', 'Clove', 'Cinnamon', 'Nutmeg', 'Cardamom'],
  EARTH: ['Wet Earth', 'Forest Floor', 'Mushroom', 'Truffle'],
  MINERAL: ['Wet Stone', 'Chalk', 'Slate', 'Flint'],
  OAK: ['Vanilla', 'Toast', 'Smoke', 'Cedar', 'Coconut'],
} as const

// Screen dimensions and breakpoints
export const SCREEN_BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 400,
  VERY_SLOW: 600,
} as const

// Input validation constants
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  DISPLAY_NAME_MIN_LENGTH: 2,
  DISPLAY_NAME_MAX_LENGTH: 30,
  WINE_NAME_MAX_LENGTH: 100,
  TASTING_NOTES_MAX_LENGTH: 1000,
} as const

// Default values
export const DEFAULTS = {
  PAGINATION_LIMIT: 20,
  IMAGE_QUALITY: 0.8,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  DEBOUNCE_DELAY: 300,
  CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes
} as const