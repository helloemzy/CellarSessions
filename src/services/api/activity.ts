import { supabase } from '@/services/api/supabase'

export interface ActivityItem {
  id: string
  type: 'TASTING_NOTE' | 'SHARED_NOTE' | 'SQUAD_JOIN' | 'SQUAD_CREATE'
  user_id: string
  created_at: string
  metadata?: Record<string, any>
  user_profile?: {
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
  }
  tasting_note?: {
    id: string
    rating: number | null
    notes: string | null
    tasting_date: string | null
    is_blind_tasting: boolean
    visibility: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
    wine?: {
      id: string
      name: string
      producer: string
      vintage?: number
      region?: string
      wine_type: string
      image_url?: string
    }
  }
  shared_note?: {
    id: string
    share_type: 'SQUAD' | 'PUBLIC'
    message?: string
    squad?: {
      id: string
      name: string
    }
    tasting_note?: {
      id: string
      rating: number | null
      wine?: {
        id: string
        name: string
        producer: string
        vintage?: number
      }
    }
  }
  squad?: {
    id: string
    name: string
    is_private: boolean
    member_count?: number
  }
}

export interface ActivityFilters {
  userId?: string
  squadId?: string
  activityTypes?: ActivityItem['type'][]
  visibility?: 'PRIVATE' | 'SQUAD' | 'PUBLIC'
}

export class ActivityService {
  static async getActivityFeed(
    filters: ActivityFilters = {},
    page = 0,
    limit = 20
  ): Promise<{ activities: ActivityItem[]; totalCount: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { activities: [], totalCount: 0, error: 'User not authenticated' }
      }

      const activities: ActivityItem[] = []

      // Get tasting notes activity
      if (!filters.activityTypes || filters.activityTypes.includes('TASTING_NOTE')) {
        const tastingNotes = await this.getTastingNotesActivity(user.id, filters, page, limit)
        activities.push(...tastingNotes)
      }

      // Get shared notes activity
      if (!filters.activityTypes || filters.activityTypes.includes('SHARED_NOTE')) {
        const sharedNotes = await this.getSharedNotesActivity(user.id, filters, page, limit)
        activities.push(...sharedNotes)
      }

      // Get squad activity
      if (!filters.activityTypes || 
          filters.activityTypes.includes('SQUAD_JOIN') || 
          filters.activityTypes.includes('SQUAD_CREATE')) {
        const squadActivity = await this.getSquadActivity(user.id, filters, page, limit)
        activities.push(...squadActivity)
      }

      // Sort by created_at descending and apply pagination
      const sortedActivities = activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(page * limit, (page + 1) * limit)

      return { 
        activities: sortedActivities, 
        totalCount: activities.length, 
        error: null 
      }
    } catch (err) {
      return { 
        activities: [], 
        totalCount: 0, 
        error: err instanceof Error ? err.message : 'Failed to fetch activity feed' 
      }
    }
  }

  private static async getTastingNotesActivity(
    userId: string, 
    filters: ActivityFilters, 
    page: number, 
    limit: number
  ): Promise<ActivityItem[]> {
    try {
      let query = supabase
        .from('tasting_notes')
        .select(`
          id,
          user_id,
          created_at,
          rating,
          notes,
          tasting_date,
          is_blind_tasting,
          visibility,
          user_profile:profiles!user_id(
            display_name,
            avatar_url,
            wine_education_background
          ),
          wine:wines(
            id,
            name,
            producer,
            vintage,
            region,
            wine_type,
            image_url
          )
        `)

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      } else {
        // Show notes from user's squads or public notes
        // This is complex - for now, show user's own notes + public notes
        query = query.or(`user_id.eq.${userId},visibility.eq.PUBLIC`)
      }

      if (filters.visibility) {
        query = query.eq('visibility', filters.visibility)
      }

      const { data: tastingNotes, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit * 2) // Get more to account for filtering

      if (error) {
        console.error('Error fetching tasting notes activity:', error)
        return []
      }

      return (tastingNotes || []).map(note => ({
        id: `tasting_${note.id}`,
        type: 'TASTING_NOTE' as const,
        user_id: note.user_id,
        created_at: note.created_at,
        user_profile: note.user_profile,
        tasting_note: {
          id: note.id,
          rating: note.rating,
          notes: note.notes,
          tasting_date: note.tasting_date,
          is_blind_tasting: note.is_blind_tasting,
          visibility: note.visibility,
          wine: note.wine
        }
      }))
    } catch (err) {
      console.error('Error in getTastingNotesActivity:', err)
      return []
    }
  }

  private static async getSharedNotesActivity(
    userId: string, 
    filters: ActivityFilters, 
    page: number, 
    limit: number
  ): Promise<ActivityItem[]> {
    try {
      let query = supabase
        .from('shared_tasting_notes')
        .select(`
          id,
          shared_by,
          created_at,
          share_type,
          message,
          shared_by_profile:profiles!shared_by(
            display_name,
            avatar_url,
            wine_education_background
          ),
          squad:squads(
            id,
            name
          ),
          tasting_note:tasting_notes(
            id,
            rating,
            wine:wines(
              id,
              name,
              producer,
              vintage
            )
          )
        `)

      // Apply filters
      if (filters.userId) {
        query = query.eq('shared_by', filters.userId)
      } else {
        // Show public shares and shares from user's squads
        query = query.eq('share_type', 'PUBLIC')
      }

      const { data: sharedNotes, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit * 2)

      if (error) {
        console.error('Error fetching shared notes activity:', error)
        return []
      }

      return (sharedNotes || []).map(share => ({
        id: `shared_${share.id}`,
        type: 'SHARED_NOTE' as const,
        user_id: share.shared_by,
        created_at: share.created_at,
        user_profile: share.shared_by_profile,
        shared_note: {
          id: share.id,
          share_type: share.share_type,
          message: share.message,
          squad: share.squad,
          tasting_note: share.tasting_note
        }
      }))
    } catch (err) {
      console.error('Error in getSharedNotesActivity:', err)
      return []
    }
  }

  private static async getSquadActivity(
    userId: string, 
    filters: ActivityFilters, 
    page: number, 
    limit: number
  ): Promise<ActivityItem[]> {
    try {
      const activities: ActivityItem[] = []

      // Get squad creation activity
      if (!filters.activityTypes || filters.activityTypes.includes('SQUAD_CREATE')) {
        const { data: createdSquads, error: createError } = await supabase
          .from('squads')
          .select(`
            id,
            created_by,
            created_at,
            name,
            is_private,
            creator_profile:profiles!created_by(
              display_name,
              avatar_url,
              wine_education_background
            ),
            member_count:squad_members(count)
          `)
          .eq('is_private', false) // Only show public squad creations
          .order('created_at', { ascending: false })
          .limit(limit)

        if (!createError && createdSquads) {
          activities.push(...createdSquads.map(squad => ({
            id: `squad_create_${squad.id}`,
            type: 'SQUAD_CREATE' as const,
            user_id: squad.created_by,
            created_at: squad.created_at,
            user_profile: squad.creator_profile,
            squad: {
              id: squad.id,
              name: squad.name,
              is_private: squad.is_private,
              member_count: squad.member_count?.[0]?.count || 0
            }
          })))
        }
      }

      // Get squad join activity
      if (!filters.activityTypes || filters.activityTypes.includes('SQUAD_JOIN')) {
        const { data: squadJoins, error: joinError } = await supabase
          .from('squad_members')
          .select(`
            id,
            user_id,
            joined_at,
            user_profile:profiles!user_id(
              display_name,
              avatar_url,
              wine_education_background
            ),
            squad:squads(
              id,
              name,
              is_private,
              member_count:squad_members(count)
            )
          `)
          .eq('squad.is_private', false) // Only show public squad joins
          .order('joined_at', { ascending: false })
          .limit(limit)

        if (!joinError && squadJoins) {
          activities.push(...squadJoins.map(join => ({
            id: `squad_join_${join.id}`,
            type: 'SQUAD_JOIN' as const,
            user_id: join.user_id,
            created_at: join.joined_at,
            user_profile: join.user_profile,
            squad: join.squad ? {
              id: join.squad.id,
              name: join.squad.name,
              is_private: join.squad.is_private,
              member_count: join.squad.member_count?.[0]?.count || 0
            } : undefined
          })))
        }
      }

      return activities
    } catch (err) {
      console.error('Error in getSquadActivity:', err)
      return []
    }
  }

  static async getUserActivity(
    userId: string,
    page = 0,
    limit = 20
  ): Promise<{ activities: ActivityItem[]; totalCount: number; error: string | null }> {
    return this.getActivityFeed({ userId }, page, limit)
  }

  static async getSquadActivity(
    squadId: string,
    page = 0,
    limit = 20
  ): Promise<{ activities: ActivityItem[]; totalCount: number; error: string | null }> {
    return this.getActivityFeed({ squadId }, page, limit)
  }

  static async getPublicActivity(
    page = 0,
    limit = 20
  ): Promise<{ activities: ActivityItem[]; totalCount: number; error: string | null }> {
    return this.getActivityFeed({ visibility: 'PUBLIC' }, page, limit)
  }

  static async getPersonalizedFeed(
    page = 0,
    limit = 20
  ): Promise<{ activities: ActivityItem[]; totalCount: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { activities: [], totalCount: 0, error: 'User not authenticated' }
      }

      // Get activities from:
      // 1. User's own activities
      // 2. Public shared notes
      // 3. Activities from squads user is a member of
      // For simplicity, we'll start with user's own + public activities

      return this.getActivityFeed({}, page, limit)
    } catch (err) {
      return { 
        activities: [], 
        totalCount: 0, 
        error: err instanceof Error ? err.message : 'Failed to fetch personalized feed' 
      }
    }
  }
}