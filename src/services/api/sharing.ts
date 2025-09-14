import { supabase } from '@/services/api/supabase'

export interface ShareTastingNoteRequest {
  tastingNoteId: string
  shareType: 'SQUAD' | 'PUBLIC'
  squadId?: string
  message?: string
}

export interface SharedTastingNote {
  id: string
  tasting_note_id: string
  shared_by: string
  share_type: 'SQUAD' | 'PUBLIC'
  squad_id?: string
  message?: string
  created_at: string
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
  shared_by_profile?: {
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
  }
  squad?: {
    id: string
    name: string
  }
}

export interface SharingFilters {
  shareType?: 'SQUAD' | 'PUBLIC'
  squadId?: string
  sharedBy?: string
}

export class SharingService {
  static async shareTastingNote(shareData: ShareTastingNoteRequest): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Verify the user owns the tasting note
      const { data: tastingNote, error: noteError } = await supabase
        .from('tasting_notes')
        .select('user_id, visibility')
        .eq('id', shareData.tastingNoteId)
        .single()

      if (noteError || !tastingNote) {
        return { error: 'Tasting note not found' }
      }

      if (tastingNote.user_id !== user.id) {
        return { error: 'You can only share your own tasting notes' }
      }

      // Check if note visibility allows sharing
      if (shareData.shareType === 'SQUAD' && tastingNote.visibility === 'PRIVATE') {
        return { error: 'Cannot share private tasting notes to squads' }
      }

      if (shareData.shareType === 'PUBLIC' && tastingNote.visibility !== 'PUBLIC') {
        return { error: 'Can only share public tasting notes publicly' }
      }

      // If sharing to squad, verify user is a member
      if (shareData.shareType === 'SQUAD' && shareData.squadId) {
        const { data: membership, error: memberError } = await supabase
          .from('squad_members')
          .select('id')
          .eq('squad_id', shareData.squadId)
          .eq('user_id', user.id)
          .single()

        if (memberError || !membership) {
          return { error: 'You must be a member of the squad to share to it' }
        }
      }

      // Check if already shared to prevent duplicates
      const existingShare = await supabase
        .from('shared_tasting_notes')
        .select('id')
        .eq('tasting_note_id', shareData.tastingNoteId)
        .eq('shared_by', user.id)
        .eq('share_type', shareData.shareType)
        .eq('squad_id', shareData.squadId || null)
        .single()

      if (existingShare.data) {
        return { error: 'Tasting note already shared to this location' }
      }

      // Create the share record
      const { error: shareError } = await supabase
        .from('shared_tasting_notes')
        .insert([{
          tasting_note_id: shareData.tastingNoteId,
          shared_by: user.id,
          share_type: shareData.shareType,
          squad_id: shareData.squadId || null,
          message: shareData.message || null,
        }])

      if (shareError) {
        return { error: shareError.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to share tasting note' }
    }
  }

  static async getSharedTastingNotes(
    filters: SharingFilters = {},
    page = 0,
    limit = 20
  ): Promise<{ sharedNotes: SharedTastingNote[]; totalCount: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { sharedNotes: [], totalCount: 0, error: 'User not authenticated' }
      }

      let query = supabase
        .from('shared_tasting_notes')
        .select(`
          *,
          tasting_note:tasting_notes(
            id,
            rating,
            notes,
            tasting_date,
            is_blind_tasting,
            visibility,
            wine:wines(
              id,
              name,
              producer,
              vintage,
              region,
              wine_type,
              image_url
            )
          ),
          shared_by_profile:profiles!shared_by(
            display_name,
            avatar_url,
            wine_education_background
          ),
          squad:squads(
            id,
            name
          )
        `, { count: 'exact' })

      // Apply filters
      if (filters.shareType) {
        query = query.eq('share_type', filters.shareType)
      }

      if (filters.squadId) {
        query = query.eq('squad_id', filters.squadId)
      }

      if (filters.sharedBy) {
        query = query.eq('shared_by', filters.sharedBy)
      } else {
        // Only show shares visible to the current user
        // For SQUAD shares, user must be a member
        // For PUBLIC shares, show all
        if (filters.shareType === 'SQUAD' || !filters.shareType) {
          // This is complex - we need to join with squad_members to check visibility
          // For now, let's get all and filter in the service layer
        }
      }

      const { data: sharedNotes, error, count } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) {
        return { sharedNotes: [], totalCount: 0, error: error.message }
      }

      // Filter SQUAD shares to only show those where user is a member
      const filteredNotes = await this.filterVisibleShares(sharedNotes || [], user.id)

      return { 
        sharedNotes: filteredNotes, 
        totalCount: count || 0, 
        error: null 
      }
    } catch (err) {
      return { sharedNotes: [], totalCount: 0, error: err instanceof Error ? err.message : 'Failed to fetch shared notes' }
    }
  }

  private static async filterVisibleShares(shares: any[], userId: string): Promise<SharedTastingNote[]> {
    const visibleShares: SharedTastingNote[] = []

    for (const share of shares) {
      // Public shares are always visible
      if (share.share_type === 'PUBLIC') {
        visibleShares.push(share)
        continue
      }

      // For squad shares, check if user is a member
      if (share.share_type === 'SQUAD' && share.squad_id) {
        const { data: membership } = await supabase
          .from('squad_members')
          .select('id')
          .eq('squad_id', share.squad_id)
          .eq('user_id', userId)
          .single()

        if (membership) {
          visibleShares.push(share)
        }
      }
    }

    return visibleShares
  }

  static async getSquadSharedNotes(
    squadId: string,
    page = 0,
    limit = 20
  ): Promise<{ sharedNotes: SharedTastingNote[]; totalCount: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { sharedNotes: [], totalCount: 0, error: 'User not authenticated' }
      }

      // Verify user is a member of the squad
      const { data: membership, error: memberError } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

      if (memberError || !membership) {
        return { sharedNotes: [], totalCount: 0, error: 'You must be a member of this squad to view shared notes' }
      }

      return this.getSharedTastingNotes({ shareType: 'SQUAD', squadId }, page, limit)
    } catch (err) {
      return { sharedNotes: [], totalCount: 0, error: err instanceof Error ? err.message : 'Failed to fetch squad shared notes' }
    }
  }

  static async getPublicSharedNotes(
    page = 0,
    limit = 20
  ): Promise<{ sharedNotes: SharedTastingNote[]; totalCount: number; error: string | null }> {
    return this.getSharedTastingNotes({ shareType: 'PUBLIC' }, page, limit)
  }

  static async getUserSharedNotes(
    userId?: string,
    page = 0,
    limit = 20
  ): Promise<{ sharedNotes: SharedTastingNote[]; totalCount: number; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id

    if (!targetUserId) {
      return { sharedNotes: [], totalCount: 0, error: 'User not specified' }
    }

    return this.getSharedTastingNotes({ sharedBy: targetUserId }, page, limit)
  }

  static async unshareNote(sharedNoteId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Verify the user owns the share
      const { data: share, error: shareError } = await supabase
        .from('shared_tasting_notes')
        .select('shared_by')
        .eq('id', sharedNoteId)
        .single()

      if (shareError || !share) {
        return { error: 'Shared note not found' }
      }

      if (share.shared_by !== user.id) {
        return { error: 'You can only unshare your own notes' }
      }

      const { error } = await supabase
        .from('shared_tasting_notes')
        .delete()
        .eq('id', sharedNoteId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to unshare note' }
    }
  }

  static async getShareCount(tastingNoteId: string): Promise<{ count: number; error: string | null }> {
    try {
      const { count, error } = await supabase
        .from('shared_tasting_notes')
        .select('*', { count: 'exact', head: true })
        .eq('tasting_note_id', tastingNoteId)

      if (error) {
        return { count: 0, error: error.message }
      }

      return { count: count || 0, error: null }
    } catch (err) {
      return { count: 0, error: err instanceof Error ? err.message : 'Failed to get share count' }
    }
  }
}