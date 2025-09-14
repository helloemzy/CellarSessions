// Core domain types based on database schema
export interface UserProfile {
  id: string
  email: string
  display_name: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  wine_education_background?: WineEducationBackground
  graduation_class?: string
  graduation_year?: number
  location?: string
  bio?: string
  created_at: string
  updated_at: string
}

export type WineEducationBackground = 'WSET' | 'CMS' | 'ISG' | 'OTHER' | 'NONE'

export interface Wine {
  id: string
  name: string
  producer: string
  vintage?: number
  region?: string
  country: string
  wine_type: WineType
  grape_varieties: string[]
  alcohol_content?: number
  price_range?: PriceRange
  serving_temperature_min?: number
  serving_temperature_max?: number
  created_at: string
  updated_at: string
}

export type WineType = 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
export type PriceRange = 'UNDER_15' | '15_30' | '30_50' | '50_100' | 'OVER_100'

export interface TastingNote {
  id: string
  user_id: string
  wine_id: string
  session_date: string
  is_blind_tasting: boolean
  
  // WSET SAT Framework
  // Appearance
  appearance_intensity: number
  appearance_color: string
  appearance_other_observations?: string
  
  // Nose
  nose_intensity: number
  nose_aroma_characteristics: string[]
  nose_development: string
  
  // Palate
  palate_sweetness: number
  palate_acidity: number
  palate_tannin?: number
  palate_alcohol: number
  palate_body: number
  palate_flavor_intensity: number
  palate_flavor_characteristics: string[]
  palate_finish: string
  
  // Conclusions
  quality_level: number
  readiness_for_drinking: string
  aging_potential?: string
  
  // Additional notes
  food_pairing_suggestions?: string[]
  personal_notes?: string
  rating: number // 1-5 stars
  
  // Metadata
  tasting_location?: string
  tasting_companions?: string[]
  photo_urls?: string[]
  voice_note_url?: string
  
  visibility: VisibilityLevel
  created_at: string
  updated_at: string
}

export type VisibilityLevel = 'PRIVATE' | 'SQUAD' | 'PUBLIC'

export interface BlindTastingGuess {
  id: string
  tasting_note_id: string
  
  // Guessed wine information
  guessed_wine_name?: string
  guessed_producer?: string
  guessed_vintage?: number
  guessed_region?: string
  guessed_country?: string
  guessed_wine_type: WineType
  guessed_grape_varieties: string[]
  
  confidence_level: number // 1-5
  guess_reasoning?: string
  
  // Calculated accuracy
  accuracy_score?: number
  variety_accuracy?: number
  region_accuracy?: number
  country_accuracy?: number
  vintage_accuracy?: number
  
  created_at: string
}

export interface Squad {
  id: string
  name: string
  description?: string
  privacy_level: SquadPrivacyLevel
  invite_code?: string
  created_by: string
  member_count: number
  max_members?: number
  created_at: string
  updated_at: string
}

export type SquadPrivacyLevel = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'

export interface SquadMember {
  id: string
  squad_id: string
  user_id: string
  role: SquadRole
  joined_at: string
}

export type SquadRole = 'ADMIN' | 'MODERATOR' | 'MEMBER'

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  hasMore: boolean
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  TastingForm: { wineId?: string }
  WineDetail: { wineId: string }
  Profile: { userId?: string }
  Squad: { squadId: string }
}

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
}

export type MainTabParamList = {
  Home: undefined
  Discover: undefined
  Camera: undefined
  Squads: undefined
  Profile: undefined
}

// Form validation schemas
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

export interface TastingFormData extends Omit<TastingNote, 'id' | 'user_id' | 'created_at' | 'updated_at'> {}

// State management types
export interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface TastingState {
  currentTasting: Partial<TastingNote> | null
  tastingHistory: TastingNote[]
  isLoading: boolean
  error: string | null
}

export interface SquadState {
  userSquads: Squad[]
  currentSquad: Squad | null
  squadMembers: SquadMember[]
  isLoading: boolean
  error: string | null
}