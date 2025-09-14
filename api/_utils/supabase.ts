import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server-side operations
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return supabaseClient;
}

export interface Wine {
  id: string;
  name: string;
  winery: string;
  region?: string;
  country?: string;
  grape_variety?: string;
  vintage?: number;
  alcohol_content?: number;
  price?: number;
  description?: string;
  image_url?: string;
  rating?: number;
  wine_type: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified';
  created_at: string;
  updated_at: string;
}

export interface TastingNote {
  id: string;
  user_id: string;
  wine_id: string;
  rating: number;
  notes?: string;
  aroma_notes?: string[];
  taste_notes?: string[];
  finish_notes?: string[];
  color?: string;
  clarity?: string;
  body?: string;
  tannins?: string;
  acidity?: string;
  sweetness?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_grape_varieties?: string[];
  preferred_regions?: string[];
  preferred_wine_types?: string[];
  price_range_min?: number;
  price_range_max?: number;
  preferred_alcohol_content_min?: number;
  preferred_alcohol_content_max?: number;
  disliked_characteristics?: string[];
  created_at: string;
  updated_at: string;
}