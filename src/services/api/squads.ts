import { supabase } from '@/lib/supabase'

export interface Squad {
  id: string
  name: string
  description?: string
  is_private: boolean
  created_by: string
  created_at: string
  updated_at: string
  member_count?: number
  creator_profile?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export interface SquadMember {
  id: string
  squad_id: string
  user_id: string
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joined_at: string
  user_profile?: {
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
  }
}

export interface CreateSquadRequest {
  name: string
  description?: string
  is_private?: boolean
}

export interface UpdateSquadRequest {
  name?: string
  description?: string
  is_private?: boolean
}

export interface SquadFilters {
  search?: string
  isPrivate?: boolean
  userRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER'
}

export class SquadsService {
  static async createSquad(squadData: CreateSquadRequest): Promise<{ squad: Squad | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { squad: null, error: 'User not authenticated' }
      }

      // Create squad
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .insert([{
          name: squadData.name,
          description: squadData.description,
          is_private: squadData.is_private || false,
          created_by: user.id
        }])
        .select(`
          *,
          creator_profile:profiles!created_by(display_name, avatar_url)
        `)
        .single()

      if (squadError) {
        return { squad: null, error: squadError.message }
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('squad_members')
        .insert([{
          squad_id: squad.id,
          user_id: user.id,
          role: 'ADMIN'
        }])

      if (memberError) {
        // Clean up squad if member creation fails
        await supabase.from('squads').delete().eq('id', squad.id)
        return { squad: null, error: 'Failed to create squad membership' }
      }

      return { squad: { ...squad, member_count: 1 }, error: null }
    } catch (err) {
      return { squad: null, error: err instanceof Error ? err.message : 'Failed to create squad' }
    }
  }

  static async getSquadById(squadId: string): Promise<{ squad: Squad | null; error: string | null }> {
    try {
      const { data: squad, error } = await supabase
        .from('squads')
        .select(`
          *,
          creator_profile:profiles!created_by(display_name, avatar_url),
          member_count:squad_members(count)
        `)
        .eq('id', squadId)
        .single()

      if (error) {
        return { squad: null, error: error.message }
      }

      return { 
        squad: {
          ...squad,
          member_count: squad.member_count?.[0]?.count || 0
        }, 
        error: null 
      }
    } catch (err) {
      return { squad: null, error: err instanceof Error ? err.message : 'Failed to fetch squad' }
    }
  }

  static async getUserSquads(
    filters: SquadFilters = {},
    page = 0,
    limit = 20
  ): Promise<{ squads: Squad[]; totalCount: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { squads: [], totalCount: 0, error: 'User not authenticated' }
      }

      let query = supabase
        .from('squads')
        .select(`
          *,
          creator_profile:profiles!created_by(display_name, avatar_url),
          member_count:squad_members(count),
          user_member:squad_members!inner(role)
        `, { count: 'exact' })
        .eq('user_member.user_id', user.id)

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.isPrivate !== undefined) {
        query = query.eq('is_private', filters.isPrivate)
      }

      if (filters.userRole) {
        query = query.eq('user_member.role', filters.userRole)
      }

      const { data: squads, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) {
        return { squads: [], totalCount: 0, error: error.message }
      }

      const processedSquads = squads?.map(squad => ({
        ...squad,
        member_count: squad.member_count?.[0]?.count || 0
      })) || []

      return { squads: processedSquads, totalCount: count || 0, error: null }
    } catch (err) {
      return { squads: [], totalCount: 0, error: err instanceof Error ? err.message : 'Failed to fetch squads' }
    }
  }

  static async searchPublicSquads(
    query: string,
    page = 0,
    limit = 20
  ): Promise<{ squads: Squad[]; totalCount: number; error: string | null }> {
    try {
      const { data: squads, error, count } = await supabase
        .from('squads')
        .select(`
          *,
          creator_profile:profiles!created_by(display_name, avatar_url),
          member_count:squad_members(count)
        `, { count: 'exact' })
        .eq('is_private', false)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('member_count', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) {
        return { squads: [], totalCount: 0, error: error.message }
      }

      const processedSquads = squads?.map(squad => ({
        ...squad,
        member_count: squad.member_count?.[0]?.count || 0
      })) || []

      return { squads: processedSquads, totalCount: count || 0, error: null }
    } catch (err) {
      return { squads: [], totalCount: 0, error: err instanceof Error ? err.message : 'Failed to search squads' }
    }
  }

  static async updateSquad(
    squadId: string,
    updates: UpdateSquadRequest
  ): Promise<{ squad: Squad | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { squad: null, error: 'User not authenticated' }
      }

      // Check if user is admin of the squad
      const { data: membership, error: memberError } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

      if (memberError || membership?.role !== 'ADMIN') {
        return { squad: null, error: 'Insufficient permissions to update squad' }
      }

      const { data: squad, error } = await supabase
        .from('squads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', squadId)
        .select(`
          *,
          creator_profile:profiles!created_by(display_name, avatar_url),
          member_count:squad_members(count)
        `)
        .single()

      if (error) {
        return { squad: null, error: error.message }
      }

      return { 
        squad: {
          ...squad,
          member_count: squad.member_count?.[0]?.count || 0
        }, 
        error: null 
      }
    } catch (err) {
      return { squad: null, error: err instanceof Error ? err.message : 'Failed to update squad' }
    }
  }

  static async deleteSquad(squadId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Check if user is admin of the squad
      const { data: membership, error: memberError } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

      if (memberError || membership?.role !== 'ADMIN') {
        return { error: 'Insufficient permissions to delete squad' }
      }

      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', squadId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete squad' }
    }
  }

  static async joinSquad(squadId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Check if squad exists and is not private
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('is_private')
        .eq('id', squadId)
        .single()

      if (squadError) {
        return { error: 'Squad not found' }
      }

      if (squad.is_private) {
        return { error: 'Cannot join private squad without invitation' }
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        return { error: 'Already a member of this squad' }
      }

      const { error } = await supabase
        .from('squad_members')
        .insert([{
          squad_id: squadId,
          user_id: user.id,
          role: 'MEMBER'
        }])

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to join squad' }
    }
  }

  static async leaveSquad(squadId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Check if user is the only admin
      const { data: admins, error: adminError } = await supabase
        .from('squad_members')
        .select('user_id')
        .eq('squad_id', squadId)
        .eq('role', 'ADMIN')

      if (adminError) {
        return { error: 'Failed to check admin status' }
      }

      if (admins.length === 1 && admins[0].user_id === user.id) {
        return { error: 'Cannot leave squad as the only admin. Transfer admin role first.' }
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
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to leave squad' }
    }
  }

  static async getSquadMembers(
    squadId: string,
    page = 0,
    limit = 20
  ): Promise<{ members: SquadMember[]; totalCount: number; error: string | null }> {
    try {
      const { data: members, error, count } = await supabase
        .from('squad_members')
        .select(`
          *,
          user_profile:profiles(display_name, avatar_url, wine_education_background)
        `, { count: 'exact' })
        .eq('squad_id', squadId)
        .order('joined_at', { ascending: true })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) {
        return { members: [], totalCount: 0, error: error.message }
      }

      return { members: members || [], totalCount: count || 0, error: null }
    } catch (err) {
      return { members: [], totalCount: 0, error: err instanceof Error ? err.message : 'Failed to fetch squad members' }
    }
  }

  static async updateMemberRole(
    squadId: string,
    userId: string,
    newRole: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  ): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Check if current user is admin
      const { data: membership, error: memberError } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

      if (memberError || membership?.role !== 'ADMIN') {
        return { error: 'Insufficient permissions to update member role' }
      }

      const { error } = await supabase
        .from('squad_members')
        .update({ role: newRole })
        .eq('squad_id', squadId)
        .eq('user_id', userId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update member role' }
    }
  }

  static async removeMember(squadId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Check if current user is admin
      const { data: membership, error: memberError } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

      if (memberError || membership?.role !== 'ADMIN') {
        return { error: 'Insufficient permissions to remove member' }
      }

      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', userId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to remove member' }
    }
  }
}