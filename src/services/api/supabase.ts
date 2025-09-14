import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'
import { SUPABASE_CONFIG } from '@/constants'

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Comprehensive Database Types Generated from Schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          wine_education_background: 'WSET' | 'CMS' | 'ISG' | 'OTHER' | 'NONE' | null
          graduation_class: string | null
          graduation_year: number | null
          location: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          wine_education_background?: 'WSET' | 'CMS' | 'ISG' | 'OTHER' | 'NONE' | null
          graduation_class?: string | null
          graduation_year?: number | null
          location?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          wine_education_background?: 'WSET' | 'CMS' | 'ISG' | 'OTHER' | 'NONE' | null
          graduation_class?: string | null
          graduation_year?: number | null
          location?: string | null
          bio?: string | null
          updated_at?: string
        }
      }
      wines: {
        Row: {
          id: string
          name: string
          producer: string
          vintage: number | null
          appellation: string | null
          country: string
          region: string | null
          sub_region: string | null
          wine_type: 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
          grape_varieties: string[]
          alcohol_percentage: number | null
          serving_temperature_min: number | null
          serving_temperature_max: number | null
          bottle_size_ml: number
          price_range_min: number | null
          price_range_max: number | null
          image_url: string | null
          barcode: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          producer: string
          vintage?: number | null
          appellation?: string | null
          country: string
          region?: string | null
          sub_region?: string | null
          wine_type: 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
          grape_varieties: string[]
          alcohol_percentage?: number | null
          serving_temperature_min?: number | null
          serving_temperature_max?: number | null
          bottle_size_ml?: number
          price_range_min?: number | null
          price_range_max?: number | null
          image_url?: string | null
          barcode?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          producer?: string
          vintage?: number | null
          appellation?: string | null
          country?: string
          region?: string | null
          sub_region?: string | null
          wine_type?: 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
          grape_varieties?: string[]
          alcohol_percentage?: number | null
          serving_temperature_min?: number | null
          serving_temperature_max?: number | null
          bottle_size_ml?: number
          price_range_min?: number | null
          price_range_max?: number | null
          image_url?: string | null
          barcode?: string | null
          updated_at?: string
        }
      }
      tasting_notes: {
        Row: {
          id: string
          user_id: string
          wine_id: string
          visibility: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
          is_blind_tasting: boolean
          tasting_date: string
          location: string | null
          occasion: string | null
          
          // WSET Appearance
          appearance_intensity: number | null
          appearance_color: string | null
          appearance_rim_variation: boolean | null
          appearance_clarity: string | null
          appearance_observations: string | null
          
          // WSET Nose
          nose_intensity: number | null
          nose_aroma_characteristics: string[]
          nose_development: string | null
          nose_observations: string | null
          
          // WSET Palate
          palate_sweetness: number | null
          palate_acidity: number | null
          palate_tannin: number | null
          palate_alcohol: number | null
          palate_body: string | null
          palate_flavor_intensity: number | null
          palate_flavor_characteristics: string[]
          palate_finish: string | null
          palate_observations: string | null
          
          // Overall Assessment
          quality_level: number | null
          readiness: string | null
          ageing_potential: string | null
          overall_observations: string | null
          
          // Media and Social
          voice_note_url: string | null
          voice_note_duration: number | null
          photo_urls: string[]
          rating: number | null
          would_buy_again: boolean | null
          food_pairing_suggestions: string[]
          
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wine_id: string
          visibility?: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
          is_blind_tasting?: boolean
          tasting_date: string
          location?: string | null
          occasion?: string | null
          
          appearance_intensity?: number | null
          appearance_color?: string | null
          appearance_rim_variation?: boolean | null
          appearance_clarity?: string | null
          appearance_observations?: string | null
          
          nose_intensity?: number | null
          nose_aroma_characteristics?: string[]
          nose_development?: string | null
          nose_observations?: string | null
          
          palate_sweetness?: number | null
          palate_acidity?: number | null
          palate_tannin?: number | null
          palate_alcohol?: number | null
          palate_body?: string | null
          palate_flavor_intensity?: number | null
          palate_flavor_characteristics?: string[]
          palate_finish?: string | null
          palate_observations?: string | null
          
          quality_level?: number | null
          readiness?: string | null
          ageing_potential?: string | null
          overall_observations?: string | null
          
          voice_note_url?: string | null
          voice_note_duration?: number | null
          photo_urls?: string[]
          rating?: number | null
          would_buy_again?: boolean | null
          food_pairing_suggestions?: string[]
          
          created_at?: string
          updated_at?: string
        }
        Update: {
          visibility?: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
          is_blind_tasting?: boolean
          tasting_date?: string
          location?: string | null
          occasion?: string | null
          
          appearance_intensity?: number | null
          appearance_color?: string | null
          appearance_rim_variation?: boolean | null
          appearance_clarity?: string | null
          appearance_observations?: string | null
          
          nose_intensity?: number | null
          nose_aroma_characteristics?: string[]
          nose_development?: string | null
          nose_observations?: string | null
          
          palate_sweetness?: number | null
          palate_acidity?: number | null
          palate_tannin?: number | null
          palate_alcohol?: number | null
          palate_body?: string | null
          palate_flavor_intensity?: number | null
          palate_flavor_characteristics?: string[]
          palate_finish?: string | null
          palate_observations?: string | null
          
          quality_level?: number | null
          readiness?: string | null
          ageing_potential?: string | null
          overall_observations?: string | null
          
          voice_note_url?: string | null
          voice_note_duration?: number | null
          photo_urls?: string[]
          rating?: number | null
          would_buy_again?: boolean | null
          food_pairing_suggestions?: string[]
          
          updated_at?: string
        }
      }
      blind_tasting_guesses: {
        Row: {
          id: string
          tasting_note_id: string
          guessed_wine_id: string | null
          guessed_producer: string | null
          guessed_vintage: number | null
          guessed_appellation: string | null
          guessed_grape_varieties: string[]
          confidence_score: number | null
          reasoning: string | null
          is_correct: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          tasting_note_id: string
          guessed_wine_id?: string | null
          guessed_producer?: string | null
          guessed_vintage?: number | null
          guessed_appellation?: string | null
          guessed_grape_varieties?: string[]
          confidence_score?: number | null
          reasoning?: string | null
          is_correct?: boolean | null
          created_at?: string
        }
        Update: {
          guessed_wine_id?: string | null
          guessed_producer?: string | null
          guessed_vintage?: number | null
          guessed_appellation?: string | null
          guessed_grape_varieties?: string[]
          confidence_score?: number | null
          reasoning?: string | null
          is_correct?: boolean | null
        }
      }
      squads: {
        Row: {
          id: string
          name: string
          description: string | null
          privacy_level: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
          created_by: string
          member_limit: number | null
          location: string | null
          focus_areas: string[]
          avatar_url: string | null
          banner_url: string | null
          rules: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          privacy_level?: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
          created_by: string
          member_limit?: number | null
          location?: string | null
          focus_areas?: string[]
          avatar_url?: string | null
          banner_url?: string | null
          rules?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          privacy_level?: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
          member_limit?: number | null
          location?: string | null
          focus_areas?: string[]
          avatar_url?: string | null
          banner_url?: string | null
          rules?: string | null
          updated_at?: string
        }
      }
      squad_members: {
        Row: {
          id: string
          squad_id: string
          user_id: string
          role: 'MEMBER' | 'MODERATOR' | 'ADMIN'
          status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
          joined_at: string
          last_active_at: string | null
          invite_code: string | null
          invited_by: string | null
        }
        Insert: {
          id?: string
          squad_id: string
          user_id: string
          role?: 'MEMBER' | 'MODERATOR' | 'ADMIN'
          status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
          joined_at?: string
          last_active_at?: string | null
          invite_code?: string | null
          invited_by?: string | null
        }
        Update: {
          role?: 'MEMBER' | 'MODERATOR' | 'ADMIN'
          status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
          last_active_at?: string | null
        }
      }
      security_audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          details: Record<string, any> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          details?: Record<string, any> | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          details?: Record<string, any> | null
        }
      }
    }
    Views: {
      mv_user_squads: {
        Row: {
          user_id: string
          squad_id: string
          squad_name: string
          privacy_level: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
          role: 'MEMBER' | 'MODERATOR' | 'ADMIN'
          joined_at: string
          is_creator: boolean
        }
      }
    }
    Functions: {
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      users_share_squad: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      can_access_tasting_note: {
        Args: { note_id: string; user_id?: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_action: string
          p_table_name: string
          p_record_id?: string
          p_details?: Record<string, any>
        }
        Returns: void
      }
    }
    Enums: {
      wine_education_background: 'WSET' | 'CMS' | 'ISG' | 'OTHER' | 'NONE'
      wine_type: 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
      visibility_level: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
      squad_privacy: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
      squad_member_role: 'MEMBER' | 'MODERATOR' | 'ADMIN'
      member_status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
    }
  }
}

export type SupabaseClient = typeof supabase