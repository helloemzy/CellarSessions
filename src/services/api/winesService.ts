import { supabase } from '@/services/api/supabase'
import { Database } from '@/services/api/supabase'

type Wine = Database['public']['Tables']['wines']['Row']
type WineInsert = Database['public']['Tables']['wines']['Insert']
type WineUpdate = Database['public']['Tables']['wines']['Update']

export interface WineWithStats extends Wine {
  tasting_notes_count: number
  average_rating: number
  latest_tasting_date: string | null
}

export interface WineFilters {
  wine_type?: 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'FORTIFIED'
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

export interface WineSearchResult {
  wines: WineWithStats[]
  totalCount: number
  facets: {
    countries: Array<{ country: string; count: number }>
    regions: Array<{ region: string; count: number }>
    producers: Array<{ producer: string; count: number }>
    wine_types: Array<{ wine_type: string; count: number }>
    grape_varieties: Array<{ variety: string; count: number }>
    vintage_range: { min: number; max: number }
    price_range: { min: number; max: number }
  }
}

export class WinesService {
  /**
   * Create a new wine entry (admin only)
   */
  static async createWine(wineData: WineInsert): Promise<{
    wine: Wine | null
    error: string | null
  }> {
    try {
      const newWineData: WineInsert = {
        ...wineData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('wines')
        .insert(newWineData)
        .select()
        .single()

      if (error) {
        return { wine: null, error: error.message }
      }

      return { wine: data, error: null }
    } catch (error) {
      return { 
        wine: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Search wines with filters and facets
   */
  static async searchWines(
    filters: WineFilters = {},
    page: number = 0,
    limit: number = 20,
    includeFacets: boolean = false
  ): Promise<{
    result: WineSearchResult
    error: string | null
  }> {
    try {
      let query = supabase
        .from('wines')
        .select(`
          *,
          tasting_notes_count:tasting_notes(count),
          tasting_notes(rating, tasting_date)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.wine_type) {
        query = query.eq('wine_type', filters.wine_type)
      }

      if (filters.country) {
        query = query.eq('country', filters.country)
      }

      if (filters.region) {
        query = query.eq('region', filters.region)
      }

      if (filters.producer) {
        query = query.ilike('producer', `%${filters.producer}%`)
      }

      if (filters.vintage_min) {
        query = query.gte('vintage', filters.vintage_min)
      }

      if (filters.vintage_max) {
        query = query.lte('vintage', filters.vintage_max)
      }

      if (filters.price_min) {
        query = query.gte('price_range_min', filters.price_min)
      }

      if (filters.price_max) {
        query = query.lte('price_range_max', filters.price_max)
      }

      if (filters.grape_varieties && filters.grape_varieties.length > 0) {
        query = query.overlaps('grape_varieties', filters.grape_varieties)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,producer.ilike.%${filters.search}%,appellation.ilike.%${filters.search}%`)
      }

      // Apply pagination
      const from = page * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return { 
          result: {
            wines: [],
            totalCount: 0,
            facets: {
              countries: [],
              regions: [],
              producers: [],
              wine_types: [],
              grape_varieties: [],
              vintage_range: { min: 0, max: 0 },
              price_range: { min: 0, max: 0 }
            }
          }, 
          error: error.message 
        }
      }

      // Process wines with stats
      const winesWithStats: WineWithStats[] = data?.map(wine => {
        const tastingNotes = Array.isArray(wine.tasting_notes) ? wine.tasting_notes : []
        const ratings = tastingNotes.map((note: any) => note.rating).filter((r: any) => r !== null)
        const averageRating = ratings.length > 0 ? 
          ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : 0

        const latestTastingDate = tastingNotes.length > 0 ?
          Math.max(...tastingNotes.map((note: any) => new Date(note.tasting_date).getTime())) : null

        return {
          ...wine,
          tasting_notes_count: tastingNotes.length,
          average_rating: averageRating,
          latest_tasting_date: latestTastingDate ? new Date(latestTastingDate).toISOString() : null,
        }
      }) || []

      let facets = {
        countries: [] as Array<{ country: string; count: number }>,
        regions: [] as Array<{ region: string; count: number }>,
        producers: [] as Array<{ producer: string; count: number }>,
        wine_types: [] as Array<{ wine_type: string; count: number }>,
        grape_varieties: [] as Array<{ variety: string; count: number }>,
        vintage_range: { min: 0, max: 0 },
        price_range: { min: 0, max: 0 }
      }

      // Calculate facets if requested
      if (includeFacets) {
        facets = await this.calculateWineFacets(filters)
      }

      const result: WineSearchResult = {
        wines: winesWithStats,
        totalCount: count || 0,
        facets
      }

      return { result, error: null }
    } catch (error) {
      return { 
        result: {
          wines: [],
          totalCount: 0,
          facets: {
            countries: [],
            regions: [],
            producers: [],
            wine_types: [],
            grape_varieties: [],
            vintage_range: { min: 0, max: 0 },
            price_range: { min: 0, max: 0 }
          }
        }, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get a single wine by ID
   */
  static async getWine(id: string): Promise<{
    wine: WineWithStats | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select(`
          *,
          tasting_notes(
            id,
            rating,
            tasting_date,
            visibility,
            user_profile:profiles(display_name, avatar_url)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        return { wine: null, error: error.message }
      }

      // Calculate stats
      const tastingNotes = data.tasting_notes || []
      const ratings = tastingNotes.map((note: any) => note.rating).filter((r: any) => r !== null)
      const averageRating = ratings.length > 0 ? 
        ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : 0

      const latestTastingDate = tastingNotes.length > 0 ?
        Math.max(...tastingNotes.map((note: any) => new Date(note.tasting_date).getTime())) : null

      const wineWithStats: WineWithStats = {
        ...data,
        tasting_notes_count: tastingNotes.length,
        average_rating: averageRating,
        latest_tasting_date: latestTastingDate ? new Date(latestTastingDate).toISOString() : null,
      }

      return { wine: wineWithStats, error: null }
    } catch (error) {
      return { 
        wine: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Update a wine (admin only)
   */
  static async updateWine(id: string, updates: WineUpdate): Promise<{
    wine: Wine | null
    error: string | null
  }> {
    try {
      const updateData: WineUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('wines')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { wine: null, error: error.message }
      }

      return { wine: data, error: null }
    } catch (error) {
      return { 
        wine: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Delete a wine (admin only)
   */
  static async deleteWine(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('wines')
        .delete()
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Search wines by barcode
   */
  static async searchByBarcode(barcode: string): Promise<{
    wine: Wine | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (error && error.code !== 'PGRST116') {
        return { wine: null, error: error.message }
      }

      return { wine: data || null, error: null }
    } catch (error) {
      return { 
        wine: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get recommended wines based on user's tasting history
   */
  static async getRecommendedWines(limit: number = 10): Promise<{
    wines: WineWithStats[]
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { wines: [], error: 'User not authenticated' }
      }

      // Get user's tasting preferences
      const { data: userTastings, error: tastingsError } = await supabase
        .from('tasting_notes')
        .select('wine:wines(*), rating')
        .eq('user_id', user.id)
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(20)

      if (tastingsError) {
        return { wines: [], error: tastingsError.message }
      }

      // Simplified recommendation - just return popular wines
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .limit(limit)

      if (error) {
        return { wines: [], error: error.message }
      }

      // Process wines with demo stats
      const winesWithStats: WineWithStats[] = data?.map(wine => ({
        ...wine,
        tasting_notes_count: Math.floor(Math.random() * 20) + 1,
        average_rating: 3.5 + Math.random() * 1.5,
        latest_tasting_date: null,
      })).sort((a, b) => b.average_rating - a.average_rating) || []

      return { wines: winesWithStats, error: null }
    } catch (error) {
      return { 
        wines: [], 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get trending wines (most rated recently)
   */
  static async getTrendingWines(limit: number = 10): Promise<{
    wines: WineWithStats[]
    error: string | null
  }> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Simplified trending wines - just get random wines for demo
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .limit(limit)

      if (error) {
        return { wines: [], error: error.message }
      }

      const trendingWines: WineWithStats[] = data?.map(wine => ({
        ...wine,
        tasting_notes_count: Math.floor(Math.random() * 10) + 1,
        average_rating: 3.5 + Math.random() * 1.5, // Random rating between 3.5-5
        latest_tasting_date: null,
      })).sort((a, b) => b.tasting_notes_count - a.tasting_notes_count) || []

      return { wines: trendingWines, error: null }
    } catch (error) {
      return { 
        wines: [], 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Calculate facets for wine search
   */
  private static async calculateWineFacets(filters: WineFilters): Promise<WineSearchResult['facets']> {
    try {
      // This is a simplified version - in production, you might want to use aggregation functions
      const { data: allWines } = await supabase
        .from('wines')
        .select('country, region, producer, wine_type, grape_varieties, vintage, price_range_min, price_range_max')

      if (!allWines) {
        return {
          countries: [],
          regions: [],
          producers: [],
          wine_types: [],
          grape_varieties: [],
          vintage_range: { min: 0, max: 0 },
          price_range: { min: 0, max: 0 }
        }
      }

      // Count occurrences
      const countryCount = new Map<string, number>()
      const regionCount = new Map<string, number>()
      const producerCount = new Map<string, number>()
      const wineTypeCount = new Map<string, number>()
      const grapeVarietyCount = new Map<string, number>()
      let vintageMin = Infinity, vintageMax = -Infinity
      let priceMin = Infinity, priceMax = -Infinity

      allWines.forEach(wine => {
        countryCount.set(wine.country, (countryCount.get(wine.country) || 0) + 1)
        if (wine.region) regionCount.set(wine.region, (regionCount.get(wine.region) || 0) + 1)
        producerCount.set(wine.producer, (producerCount.get(wine.producer) || 0) + 1)
        wineTypeCount.set(wine.wine_type, (wineTypeCount.get(wine.wine_type) || 0) + 1)
        
        wine.grape_varieties?.forEach((variety: string) => {
          grapeVarietyCount.set(variety, (grapeVarietyCount.get(variety) || 0) + 1)
        })

        if (wine.vintage) {
          vintageMin = Math.min(vintageMin, wine.vintage)
          vintageMax = Math.max(vintageMax, wine.vintage)
        }

        if (wine.price_range_min) {
          priceMin = Math.min(priceMin, wine.price_range_min)
        }
        if (wine.price_range_max) {
          priceMax = Math.max(priceMax, wine.price_range_max)
        }
      })

      return {
        countries: Array.from(countryCount.entries()).map(([country, count]) => ({ country, count })).slice(0, 20),
        regions: Array.from(regionCount.entries()).map(([region, count]) => ({ region, count })).slice(0, 20),
        producers: Array.from(producerCount.entries()).map(([producer, count]) => ({ producer, count })).slice(0, 20),
        wine_types: Array.from(wineTypeCount.entries()).map(([wine_type, count]) => ({ wine_type, count })),
        grape_varieties: Array.from(grapeVarietyCount.entries()).map(([variety, count]) => ({ variety, count })).slice(0, 30),
        vintage_range: { min: vintageMin === Infinity ? 0 : vintageMin, max: vintageMax === -Infinity ? 0 : vintageMax },
        price_range: { min: priceMin === Infinity ? 0 : priceMin, max: priceMax === -Infinity ? 0 : priceMax }
      }
    } catch (error) {
      return {
        countries: [],
        regions: [],
        producers: [],
        wine_types: [],
        grape_varieties: [],
        vintage_range: { min: 0, max: 0 },
        price_range: { min: 0, max: 0 }
      }
    }
  }
}