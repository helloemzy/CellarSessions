import { supabase } from './supabase'
import type { Database } from './supabase'
import type { WineType } from '@/types'

type Wine = Database['public']['Tables']['wines']['Row']
type WineInsert = Database['public']['Tables']['wines']['Insert']
type WineUpdate = Database['public']['Tables']['wines']['Update']

export interface CreateWineRequest {
  name: string
  producer: string
  vintage?: number
  wine_type: WineType
  region?: string
  country?: string
  alcohol_content?: number
  price?: number
  notes?: string
  is_verified?: boolean
  source?: 'MANUAL_ENTRY' | 'CAMERA_RECOGNITION' | 'DATABASE_IMPORT'
  image_url?: string
}

export interface WineSearchFilters {
  wine_type?: WineType
  country?: string
  region?: string
  vintage_min?: number
  vintage_max?: number
  price_min?: number
  price_max?: number
  search?: string
}

class WineService {
  async createWine(wineData: CreateWineRequest): Promise<Wine> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const wineInsert: WineInsert = {
      ...wineData,
      created_by: user.id,
      is_verified: wineData.is_verified ?? false,
      source: wineData.source ?? 'MANUAL_ENTRY',
    }

    const { data, error } = await supabase
      .from('wines')
      .insert([wineInsert])
      .select()
      .single()

    if (error) {
      console.error('Error creating wine:', error)
      throw new Error(`Failed to create wine: ${error.message}`)
    }

    return data
  }

  async getWineById(id: string): Promise<Wine | null> {
    const { data, error } = await supabase
      .from('wines')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Wine not found
      }
      console.error('Error fetching wine:', error)
      throw new Error(`Failed to fetch wine: ${error.message}`)
    }

    return data
  }

  async getUserWines(userId?: string, filters?: WineSearchFilters): Promise<Wine[]> {
    let query = supabase.from('wines').select('*')

    // Filter by user if specified, otherwise get current user's wines
    if (userId) {
      query = query.eq('created_by', userId)
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        query = query.eq('created_by', user.id)
      }
    }

    // Apply filters
    if (filters?.wine_type) {
      query = query.eq('wine_type', filters.wine_type)
    }
    if (filters?.country) {
      query = query.ilike('country', `%${filters.country}%`)
    }
    if (filters?.region) {
      query = query.ilike('region', `%${filters.region}%`)
    }
    if (filters?.vintage_min) {
      query = query.gte('vintage', filters.vintage_min)
    }
    if (filters?.vintage_max) {
      query = query.lte('vintage', filters.vintage_max)
    }
    if (filters?.price_min) {
      query = query.gte('price', filters.price_min)
    }
    if (filters?.price_max) {
      query = query.lte('price', filters.price_max)
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,producer.ilike.%${filters.search}%`)
    }

    // Order by creation date, newest first
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user wines:', error)
      throw new Error(`Failed to fetch wines: ${error.message}`)
    }

    return data || []
  }

  async updateWine(id: string, updates: WineUpdate): Promise<Wine> {
    const { data, error } = await supabase
      .from('wines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating wine:', error)
      throw new Error(`Failed to update wine: ${error.message}`)
    }

    return data
  }

  async deleteWine(id: string): Promise<void> {
    const { error } = await supabase.from('wines').delete().eq('id', id)

    if (error) {
      console.error('Error deleting wine:', error)
      throw new Error(`Failed to delete wine: ${error.message}`)
    }
  }

  async searchWines(searchTerm: string, limit = 20): Promise<Wine[]> {
    const { data, error } = await supabase
      .from('wines')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,producer.ilike.%${searchTerm}%,region.ilike.%${searchTerm}%`)
      .eq('is_verified', true) // Only search verified wines for public search
      .limit(limit)

    if (error) {
      console.error('Error searching wines:', error)
      throw new Error(`Failed to search wines: ${error.message}`)
    }

    return data || []
  }

  async getPopularWines(limit = 20): Promise<Wine[]> {
    // This would ideally use a view or function that calculates popularity
    // For now, we'll get recently added verified wines
    const { data, error } = await supabase
      .from('wines')
      .select('*')
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching popular wines:', error)
      throw new Error(`Failed to fetch popular wines: ${error.message}`)
    }

    return data || []
  }

  async getWinesByType(wineType: WineType, limit = 20): Promise<Wine[]> {
    const { data, error } = await supabase
      .from('wines')
      .select('*')
      .eq('wine_type', wineType)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching wines by type:', error)
      throw new Error(`Failed to fetch wines: ${error.message}`)
    }

    return data || []
  }
}

export const wineService = new WineService()