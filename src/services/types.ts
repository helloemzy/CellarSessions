// =============================================================================
// CellarSessions Database Types
// =============================================================================
// Type definitions extracted from the Database interface for easy access

import { Database } from './api/supabase'

// =============================================================================
// TABLE ROW TYPES
// =============================================================================
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Wine = Database['public']['Tables']['wines']['Row']
export type TastingNote = Database['public']['Tables']['tasting_notes']['Row']
export type BlindTastingGuess = Database['public']['Tables']['blind_tasting_guesses']['Row']
export type Squad = Database['public']['Tables']['squads']['Row']
export type SquadMember = Database['public']['Tables']['squad_members']['Row']
export type SecurityAuditLog = Database['public']['Tables']['security_audit_log']['Row']

// =============================================================================
// TABLE INSERT TYPES
// =============================================================================
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type WineInsert = Database['public']['Tables']['wines']['Insert']
export type TastingNoteInsert = Database['public']['Tables']['tasting_notes']['Insert']
export type BlindTastingGuessInsert = Database['public']['Tables']['blind_tasting_guesses']['Insert']
export type SquadInsert = Database['public']['Tables']['squads']['Insert']
export type SquadMemberInsert = Database['public']['Tables']['squad_members']['Insert']
export type SecurityAuditLogInsert = Database['public']['Tables']['security_audit_log']['Insert']

// =============================================================================
// TABLE UPDATE TYPES
// =============================================================================
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type WineUpdate = Database['public']['Tables']['wines']['Update']
export type TastingNoteUpdate = Database['public']['Tables']['tasting_notes']['Update']
export type BlindTastingGuessUpdate = Database['public']['Tables']['blind_tasting_guesses']['Update']
export type SquadUpdate = Database['public']['Tables']['squads']['Update']
export type SquadMemberUpdate = Database['public']['Tables']['squad_members']['Update']
export type SecurityAuditLogUpdate = Database['public']['Tables']['security_audit_log']['Update']

// =============================================================================
// VIEW TYPES
// =============================================================================
export type UserSquadsView = Database['public']['Views']['mv_user_squads']['Row']

// =============================================================================
// FUNCTION TYPES
// =============================================================================
export type IsAdminFunction = Database['public']['Functions']['is_admin']
export type UsersShareSquadFunction = Database['public']['Functions']['users_share_squad']
export type CanAccessTastingNoteFunction = Database['public']['Functions']['can_access_tasting_note']
export type LogSecurityEventFunction = Database['public']['Functions']['log_security_event']

// =============================================================================
// ENUM TYPES
// =============================================================================
export type WineEducationBackground = Database['public']['Enums']['wine_education_background']
export type WineType = Database['public']['Enums']['wine_type']
export type VisibilityLevel = Database['public']['Enums']['visibility_level']
export type SquadPrivacy = Database['public']['Enums']['squad_privacy']
export type SquadMemberRole = Database['public']['Enums']['squad_member_role']
export type MemberStatus = Database['public']['Enums']['member_status']

// =============================================================================
// EXTENDED TYPES (WITH RELATIONS)
// =============================================================================
export interface ProfileWithStats extends Profile {
  tasting_notes_count: number
  squads_count: number
  average_rating: number
  most_recent_tasting: string | null
}

export interface WineWithRelations extends Wine {
  tasting_notes: TastingNote[]
  average_rating: number
  tasting_notes_count: number
}

export interface TastingNoteWithRelations extends TastingNote {
  wine: Wine
  user_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  blind_tasting_guess?: BlindTastingGuess
}

export interface SquadWithRelations extends Squad {
  members: Array<SquadMember & {
    profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'wine_education_background'>
  }>
  creator_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  member_count: number
  current_user_membership?: SquadMember
}

export interface SquadMemberWithProfile extends SquadMember {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'wine_education_background'>
  squad: Pick<Squad, 'id' | 'name' | 'avatar_url'>
}

// =============================================================================
// UTILITY TYPES
// =============================================================================
export type TableName = keyof Database['public']['Tables']
export type ViewName = keyof Database['public']['Views']
export type FunctionName = keyof Database['public']['Functions']
export type EnumName = keyof Database['public']['Enums']

// Extract all possible enum values
export type WineEducationValues = 'WSET' | 'CMS' | 'ISG' | 'OTHER' | 'NONE'
export type WineTypeValues = 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
export type VisibilityLevelValues = 'PRIVATE' | 'SQUAD' | 'PUBLIC'
export type SquadPrivacyValues = 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
export type SquadMemberRoleValues = 'MEMBER' | 'MODERATOR' | 'ADMIN'
export type MemberStatusValues = 'PENDING' | 'ACTIVE' | 'SUSPENDED'

// =============================================================================
// FILTERING AND QUERY TYPES
// =============================================================================
export interface BaseFilter {
  limit?: number
  offset?: number
  order_by?: string
  ascending?: boolean
}

export interface TastingNoteFilter extends BaseFilter {
  user_id?: string
  wine_id?: string
  visibility?: VisibilityLevelValues
  is_blind_tasting?: boolean
  rating_min?: number
  rating_max?: number
  date_from?: string
  date_to?: string
  wine_type?: WineTypeValues
  wine_country?: string
  wine_region?: string
}

export interface WineFilter extends BaseFilter {
  wine_type?: WineTypeValues
  country?: string
  region?: string
  producer?: string
  vintage_min?: number
  vintage_max?: number
  price_min?: number
  price_max?: number
  grape_varieties?: string[]
  search?: string
}

export interface SquadFilter extends BaseFilter {
  privacy_level?: SquadPrivacyValues
  location?: string
  focus_areas?: string[]
  search?: string
  member_count_min?: number
  member_count_max?: number
}

export interface ProfileFilter extends BaseFilter {
  wine_education_background?: WineEducationValues
  location?: string
  search?: string
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  total_count?: number
  has_more?: boolean
  next_offset?: number
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: any
  validation_errors?: ValidationError[]
}

// =============================================================================
// STATISTICS AND ANALYTICS TYPES
// =============================================================================
export interface UserStatistics {
  total_tasting_notes: number
  total_wines_tasted: number
  average_rating: number
  favorite_wine_type: WineTypeValues | null
  favorite_region: string | null
  tasting_streak_days: number
  squads_joined: number
  monthly_activity: Array<{
    month: string
    count: number
  }>
}

export interface WineStatistics {
  total_tastings: number
  average_rating: number
  rating_distribution: Record<number, number>
  most_active_regions: Array<{
    region: string
    count: number
  }>
  seasonal_trends: Array<{
    season: string
    count: number
    avg_rating: number
  }>
}

export interface SquadStatistics {
  total_members: number
  active_members_30d: number
  total_tasting_notes: number
  average_member_rating: number
  top_wine_types: Array<{
    wine_type: WineTypeValues
    count: number
  }>
  member_engagement: Array<{
    user_id: string
    display_name: string
    tasting_notes_count: number
    last_active: string
  }>
}