import { supabase } from '@/services/api/supabase'
import { Database } from '@/services/api/supabase'

type Squad = Database['public']['Tables']['squads']['Row']
type SquadInsert = Database['public']['Tables']['squads']['Insert']
type SquadUpdate = Database['public']['Tables']['squads']['Update']
type SquadMember = Database['public']['Tables']['squad_members']['Row']
type SquadMemberInsert = Database['public']['Tables']['squad_members']['Insert']
type SquadMemberUpdate = Database['public']['Tables']['squad_members']['Update']

export interface SquadWithMembers extends Squad {
  members: Array<SquadMember & {
    profile: {
      display_name: string
      avatar_url: string | null
      wine_education_background: string | null
    }
  }>
  member_count: number
  user_membership?: SquadMember
}

export interface SquadInvitation {
  squad: Squad
  inviter: {
    display_name: string
    avatar_url: string | null
  }
  invite_code: string
}

export interface SquadFilters {
  privacy_level?: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
  location?: string
  focus_areas?: string[]
  search?: string
}

export class SquadsService {
  /**
   * Create a new squad
   */
  static async createSquad(squadData: SquadInsert): Promise<{
    squad: Squad | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { squad: null, error: 'User not authenticated' }
      }

      const newSquadData: SquadInsert = {
        ...squadData,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .insert(newSquadData)
        .select()
        .single()

      if (squadError) {
        return { squad: null, error: squadError.message }
      }

      // Add creator as admin member
      const memberData: SquadMemberInsert = {
        squad_id: squad.id,
        user_id: user.id,
        role: 'ADMIN',
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
      }

      const { error: memberError } = await supabase
        .from('squad_members')
        .insert(memberData)

      if (memberError) {
        // Clean up the squad if member creation fails
        await supabase.from('squads').delete().eq('id', squad.id)
        return { squad: null, error: memberError.message }
      }

      return { squad, error: null }
    } catch (error) {
      return { 
        squad: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get squads with optional filters and pagination
   */
  static async getSquads(
    filters: SquadFilters = {},
    page: number = 0,
    limit: number = 20
  ): Promise<{
    squads: SquadWithMembers[]
    totalCount: number
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { squads: [], totalCount: 0, error: 'User not authenticated' }
      }

      let query = supabase
        .from('squads')
        .select(`
          *,
          members:squad_members(
            *,
            profile:profiles(display_name, avatar_url, wine_education_background)
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.privacy_level) {
        query = query.eq('privacy_level', filters.privacy_level)
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.focus_areas && filters.focus_areas.length > 0) {
        query = query.overlaps('focus_areas', filters.focus_areas)
      }

      // Apply pagination
      const from = page * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return { squads: [], totalCount: 0, error: error.message }
      }

      // Process data to include member count and user membership
      const processedSquads: SquadWithMembers[] = data?.map(squad => {
        const members = squad.members || []
        const userMembership = members.find((member: any) => member.user_id === user.id)
        
        return {
          ...squad,
          members,
          member_count: members.length,
          user_membership: userMembership || undefined,
        }
      }) || []

      return { squads: processedSquads, totalCount: count || 0, error: null }
    } catch (error) {
      return { 
        squads: [], 
        totalCount: 0, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get user's squads
   */
  static async getUserSquads(): Promise<{
    squads: SquadWithMembers[]
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { squads: [], error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('squad_members')
        .select(`
          *,
          squad:squads(
            *,
            members:squad_members(
              *,
              profile:profiles(display_name, avatar_url, wine_education_background)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')

      if (error) {
        return { squads: [], error: error.message }
      }

      const userSquads: SquadWithMembers[] = data?.map(membership => {
        const squad = membership.squad as Squad & { members: any[] }
        const members = squad.members || []
        
        return {
          ...squad,
          members,
          member_count: members.length,
          user_membership: membership,
        }
      }) || []

      return { squads: userSquads, error: null }
    } catch (error) {
      return { 
        squads: [], 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get a single squad by ID
   */
  static async getSquad(squadId: string): Promise<{
    squad: SquadWithMembers | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { squad: null, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          members:squad_members(
            *,
            profile:profiles(display_name, avatar_url, wine_education_background)
          )
        `)
        .eq('id', squadId)
        .single()

      if (error) {
        return { squad: null, error: error.message }
      }

      const members = data.members || []
      const userMembership = members.find((member: any) => member.user_id === user.id)

      const squad: SquadWithMembers = {
        ...data,
        members,
        member_count: members.length,
        user_membership: userMembership || undefined,
      }

      return { squad, error: null }
    } catch (error) {
      return { 
        squad: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Update a squad
   */
  static async updateSquad(squadId: string, updates: SquadUpdate): Promise<{
    squad: Squad | null
    error: string | null
  }> {
    try {
      const updateData: SquadUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('squads')
        .update(updateData)
        .eq('id', squadId)
        .select()
        .single()

      if (error) {
        return { squad: null, error: error.message }
      }

      return { squad: data, error: null }
    } catch (error) {
      return { 
        squad: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Delete a squad
   */
  static async deleteSquad(squadId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', squadId)

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
   * Join a squad
   */
  static async joinSquad(squadId: string, inviteCode?: string): Promise<{
    membership: SquadMember | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { membership: null, error: 'User not authenticated' }
      }

      const memberData: SquadMemberInsert = {
        squad_id: squadId,
        user_id: user.id,
        role: 'MEMBER',
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
        invite_code: inviteCode || null,
      }

      const { data, error } = await supabase
        .from('squad_members')
        .insert(memberData)
        .select()
        .single()

      if (error) {
        return { membership: null, error: error.message }
      }

      return { membership: data, error: null }
    } catch (error) {
      return { 
        membership: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Leave a squad
   */
  static async leaveSquad(squadId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', user.id)

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
   * Update member role or status
   */
  static async updateMember(
    squadId: string,
    userId: string,
    updates: SquadMemberUpdate
  ): Promise<{
    member: SquadMember | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('squad_members')
        .update(updates)
        .eq('squad_id', squadId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { member: null, error: error.message }
      }

      return { member: data, error: null }
    } catch (error) {
      return { 
        member: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Remove a member from squad
   */
  static async removeMember(squadId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', userId)

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
   * Generate invite code for a squad
   */
  static async generateInviteCode(squadId: string): Promise<{
    inviteCode: string | null
    error: string | null
  }> {
    try {
      // Generate a random invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15)

      // Store the invite code (you might want to create an invites table for this)
      // For now, we'll return the code and it can be used in joinSquad
      
      return { inviteCode, error: null }
    } catch (error) {
      return { 
        inviteCode: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get squad activity feed
   */
  static async getSquadActivityFeed(squadId: string, page: number = 0, limit: number = 20): Promise<{
    activities: any[]
    totalCount: number
    error: string | null
  }> {
    try {
      // This would typically join multiple tables to get various activities
      // For now, we'll get recent tasting notes from squad members
      const { data, error, count } = await supabase
        .from('tasting_notes')
        .select(`
          *,
          wine:wines(name, producer, vintage, wine_type),
          user_profile:profiles(display_name, avatar_url)
        `)
        // Filter to squad members (simplified approach)
        .eq('visibility', 'SQUAD')
        .order('created_at', { ascending: false })
        .range(page * limit, page * limit + limit - 1)

      if (error) {
        return { activities: [], totalCount: 0, error: error.message }
      }

      return { activities: data || [], totalCount: count || 0, error: null }
    } catch (error) {
      return { 
        activities: [], 
        totalCount: 0, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Subscribe to real-time squad updates
   */
  static subscribeToSquadUpdates(squadId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`squad_${squadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `squad_id=eq.${squadId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squads',
          filter: `id=eq.${squadId}`,
        },
        callback
      )

    return channel.subscribe()
  }
}