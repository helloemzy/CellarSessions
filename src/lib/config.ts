import Constants from 'expo-constants'

// Environment variables from app.config.js
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// API Keys for external services
export const GOOGLE_VISION_API_KEY = Constants.expoConfig?.extra?.googleVisionApiKey || process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY
export const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY

// Wine data API keys
export const WINE_COM_API_KEY = Constants.expoConfig?.extra?.wineComApiKey || process.env.EXPO_PUBLIC_WINE_COM_API_KEY
export const SNOOTH_API_KEY = Constants.expoConfig?.extra?.snoothApiKey || process.env.EXPO_PUBLIC_SNOOTH_API_KEY

// App configuration
export const APP_CONFIG = {
  // Feature flags
  features: {
    blindTasting: true,
    voiceNotes: true,
    labelRecognition: true,
    socialFeatures: true,
    realTimeUpdates: true,
    aiRecommendations: true,
  },
  
  // Limits for free tier users
  freeTierLimits: {
    maxTastingNotesPerMonth: 10,
    maxSquads: 1,
    maxPhotosPerNote: 3,
    maxVoiceNoteMinutes: 5,
  },
  
  // Premium tier limits
  premiumLimits: {
    maxTastingNotesPerMonth: -1, // Unlimited
    maxSquads: -1, // Unlimited
    maxPhotosPerNote: 10,
    maxVoiceNoteMinutes: 30,
  },
  
  // API rate limits
  rateLimits: {
    googleVision: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
    },
    openai: {
      requestsPerMinute: 60,
      requestsPerDay: 500,
    },
    wineData: {
      requestsPerMinute: 100,
      requestsPerDay: 2000,
    },
  },
  
  // Cache settings
  cache: {
    wineDataTtlHours: 24,
    userProfileTtlHours: 1,
    squadActivityTtlMinutes: 5,
  },
  
  // Upload settings
  uploads: {
    maxImageSizeMB: 10,
    maxAudioSizeMB: 25,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/m4a'],
  },
}

// Validate required configuration
export function validateConfig(): { isValid: boolean; missing: string[] } {
  const required = [
    { key: 'SUPABASE_URL', value: SUPABASE_URL },
    { key: 'SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
  ]
  
  const missing = required
    .filter(config => !config.value)
    .map(config => config.key)
  
  return {
    isValid: missing.length === 0,
    missing,
  }
}

// Get configuration status for debugging
export function getConfigStatus() {
  return {
    supabase: {
      url: !!SUPABASE_URL,
      anonKey: !!SUPABASE_ANON_KEY,
    },
    apis: {
      googleVision: !!GOOGLE_VISION_API_KEY,
      openai: !!OPENAI_API_KEY,
      wineCom: !!WINE_COM_API_KEY,
      snooth: !!SNOOTH_API_KEY,
    },
    environment: Constants.executionEnvironment,
    platform: Constants.platform,
  }
}