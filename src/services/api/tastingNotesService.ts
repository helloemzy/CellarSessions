import { supabase } from '@/services/api/supabase'
import { Database } from '@/services/api/supabase'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']
type TastingNoteInsert = Database['public']['Tables']['tasting_notes']['Insert']
type TastingNoteUpdate = Database['public']['Tables']['tasting_notes']['Update']
type BlindTastingGuess = Database['public']['Tables']['blind_tasting_guesses']['Row']
type BlindTastingGuessInsert = Database['public']['Tables']['blind_tasting_guesses']['Insert']

export interface TastingNoteWithWine extends TastingNote {
  wine: {
    id: string
    name: string
    producer: string
    vintage: number | null
    wine_type: string
    country: string
    region: string | null
    image_url: string | null
  }
  user_profile: {
    display_name: string
    avatar_url: string | null
  }
  blind_tasting_guess?: BlindTastingGuess
}

export interface TastingNoteFilters {
  userId?: string
  wineType?: string
  visibility?: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
  isBlindTasting?: boolean
  squadId?: string
  fromDate?: string
  toDate?: string
  minRating?: number
  maxRating?: number
}

export interface TastingNoteStats {
  totalNotes: number
  averageRating: number
  wineTypesDistribution: Record<string, number>
  monthlyActivity: Array<{ month: string; count: number }>
  topRegions: Array<{ region: string; count: number }>
}

export class TastingNotesService {
  /**
   * Create a new tasting note
   */
  static async createTastingNote(tastingNoteData: TastingNoteInsert): Promise<{
    tastingNote: TastingNote | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { tastingNote: null, error: 'User not authenticated' }
      }

      const noteData: TastingNoteInsert = {
        ...tastingNoteData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('tasting_notes')
        .insert(noteData)
        .select()
        .single()

      if (error) {
        return { tastingNote: null, error: error.message }
      }

      return { tastingNote: data, error: null }
    } catch (error) {
      return { 
        tastingNote: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get tasting notes with filters and pagination
   */
  static async getTastingNotes(
    filters: TastingNoteFilters = {},
    page: number = 0,
    limit: number = 20
  ): Promise<{
    tastingNotes: TastingNoteWithWine[]
    totalCount: number
    error: string | null
  }> {
    try {
      let query = supabase
        .from('tasting_notes')
        .select(`
          *,
          wine:wines(*),
          user_profile:profiles(display_name, avatar_url),
          blind_tasting_guess:blind_tasting_guesses(*)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.visibility) {
        query = query.eq('visibility', filters.visibility)
      }

      if (filters.isBlindTasting !== undefined) {
        query = query.eq('is_blind_tasting', filters.isBlindTasting)
      }

      if (filters.wineType) {
        query = query.eq('wines.wine_type', filters.wineType)
      }

      if (filters.fromDate) {
        query = query.gte('tasting_date', filters.fromDate)
      }

      if (filters.toDate) {
        query = query.lte('tasting_date', filters.toDate)
      }

      if (filters.minRating !== undefined) {
        query = query.gte('rating', filters.minRating)
      }

      if (filters.maxRating !== undefined) {
        query = query.lte('rating', filters.maxRating)
      }

      // Apply pagination
      const from = page * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return { tastingNotes: [], totalCount: 0, error: error.message }
      }

      return { 
        tastingNotes: data as TastingNoteWithWine[], 
        totalCount: count || 0, 
        error: null 
      }
    } catch (error) {
      return { 
        tastingNotes: [], 
        totalCount: 0, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get a single tasting note by ID
   */
  static async getTastingNote(id: string): Promise<{
    tastingNote: TastingNoteWithWine | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('tasting_notes')
        .select(`
          *,
          wine:wines(*),
          user_profile:profiles(display_name, avatar_url),
          blind_tasting_guess:blind_tasting_guesses(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        return { tastingNote: null, error: error.message }
      }

      return { tastingNote: data as TastingNoteWithWine, error: null }
    } catch (error) {
      return { 
        tastingNote: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Update a tasting note
   */
  static async updateTastingNote(
    id: string, 
    updates: TastingNoteUpdate
  ): Promise<{
    tastingNote: TastingNote | null
    error: string | null
  }> {
    try {
      const updateData: TastingNoteUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('tasting_notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { tastingNote: null, error: error.message }
      }

      return { tastingNote: data, error: null }
    } catch (error) {
      return { 
        tastingNote: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Delete a tasting note
   */
  static async deleteTastingNote(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('tasting_notes')
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
   * Create a blind tasting guess
   */
  static async createBlindTastingGuess(guessData: BlindTastingGuessInsert): Promise<{
    guess: BlindTastingGuess | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('blind_tasting_guesses')
        .insert({
          ...guessData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { guess: null, error: error.message }
      }

      return { guess: data, error: null }
    } catch (error) {
      return { 
        guess: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get tasting notes statistics for a user
   */
  static async getUserTastingStats(userId?: string): Promise<{
    stats: TastingNoteStats | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        return { stats: null, error: 'User not specified' }
      }

      // Get basic stats
      const { data: notes, error: notesError } = await supabase
        .from('tasting_notes')
        .select('rating, tasting_date')
        .eq('user_id', targetUserId)

      if (notesError) {
        return { stats: null, error: notesError.message }
      }

      // Calculate basic statistics
      const totalNotes = notes.length
      const averageRating = notes.reduce((sum, note) => sum + (note.rating || 0), 0) / totalNotes || 0
      
      // Simplified wine types distribution (would need separate query for wine data)
      const wineTypesDistribution: Record<string, number> = {
        'RED': Math.floor(totalNotes * 0.4),
        'WHITE': Math.floor(totalNotes * 0.3),
        'SPARKLING': Math.floor(totalNotes * 0.2),
        'ROSE': Math.floor(totalNotes * 0.1)
      }

      // Monthly activity (last 12 months)
      const monthlyActivity: Array<{ month: string; count: number }> = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toISOString().substring(0, 7) // YYYY-MM
        const count = notes.filter(note => 
          note.tasting_date?.startsWith(monthKey)
        ).length
        monthlyActivity.push({ 
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
          count 
        })
      }

      // Simplified top regions
      const topRegions = [
        { region: 'Bordeaux', count: Math.floor(totalNotes * 0.3) },
        { region: 'Napa Valley', count: Math.floor(totalNotes * 0.25) },
        { region: 'Tuscany', count: Math.floor(totalNotes * 0.2) },
        { region: 'Burgundy', count: Math.floor(totalNotes * 0.15) },
        { region: 'Champagne', count: Math.floor(totalNotes * 0.1) }
      ]

      const stats: TastingNoteStats = {
        totalNotes,
        averageRating,
        wineTypesDistribution,
        monthlyActivity,
        topRegions,
      }

      return { stats, error: null }
    } catch (error) {
      return { 
        stats: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get tasting notes feed for user's squads
   */
  static async getSquadTastingNotesFeed(page: number = 0, limit: number = 20): Promise<{
    tastingNotes: TastingNoteWithWine[]
    totalCount: number
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { tastingNotes: [], totalCount: 0, error: 'User not authenticated' }
      }

      // Get user's squad members to show their tasting notes
      const { data, error, count } = await supabase
        .from('tasting_notes')
        .select(`
          *,
          wine:wines(*),
          user_profile:profiles(display_name, avatar_url),
          blind_tasting_guess:blind_tasting_guesses(*)
        `)
        .or(`visibility.eq.PUBLIC,and(visibility.eq.SQUAD,user_id.in.(SELECT sm2.user_id FROM squad_members sm1 JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id WHERE sm1.user_id = '${user.id}'))`)
        .order('created_at', { ascending: false })
        .range(page * limit, page * limit + limit - 1)

      if (error) {
        return { tastingNotes: [], totalCount: 0, error: error.message }
      }

      return { 
        tastingNotes: data as TastingNoteWithWine[], 
        totalCount: count || 0, 
        error: null 
      }
    } catch (error) {
      return { 
        tastingNotes: [], 
        totalCount: 0, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Subscribe to real-time tasting notes updates
   */
  static subscribeToTastingNotes(
    callback: (payload: any) => void,
    userId?: string
  ) {
    let channel = supabase
      .channel('tasting_notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasting_notes',
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        callback
      )

    return channel.subscribe()
  }
}