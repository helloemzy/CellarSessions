import { supabase } from '@/services/api/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeActivityUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: any
  old_record?: any
}

export interface SquadActivityUpdate {
  id: string
  type: 'TASTING_NOTE_CREATED' | 'NOTE_SHARED' | 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'CHALLENGE_CREATED'
  squad_id: string
  user_id: string
  metadata: Record<string, any>
  created_at: string
  user_profile?: {
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
  }
}

export type ActivityUpdateCallback = (update: SquadActivityUpdate) => void
export type PresenceUpdateCallback = (presence: Record<string, any>) => void

export class RealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map()
  
  /**
   * Subscribe to real-time activity updates for a specific squad
   */
  static subscribeToSquadActivity(
    squadId: string,
    onActivity: ActivityUpdateCallback,
    onPresence?: PresenceUpdateCallback
  ): () => void {
    const channelName = `squad_${squadId}_activity`
    
    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribeFromSquadActivity(squadId)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasting_notes',
          filter: `visibility=eq.SQUAD`
        },
        async (payload) => {
          // Check if this tasting note is for our squad
          if (payload.new && await this.isNoteForSquad(payload.new.id, squadId)) {
            const activityUpdate: SquadActivityUpdate = {
              id: `tasting_${payload.new.id}`,
              type: 'TASTING_NOTE_CREATED',
              squad_id: squadId,
              user_id: payload.new.user_id,
              metadata: {
                tasting_note_id: payload.new.id,
                wine_name: payload.new.wine?.name,
                rating: payload.new.rating,
                is_blind: payload.new.is_blind_tasting
              },
              created_at: payload.new.created_at
            }
            
            // Fetch user profile
            const userProfile = await this.getUserProfile(payload.new.user_id)
            if (userProfile) {
              activityUpdate.user_profile = userProfile
            }
            
            onActivity(activityUpdate)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_tasting_notes',
          filter: `squad_id=eq.${squadId}`
        },
        async (payload) => {
          if (payload.new) {
            const activityUpdate: SquadActivityUpdate = {
              id: `shared_${payload.new.id}`,
              type: 'NOTE_SHARED',
              squad_id: squadId,
              user_id: payload.new.shared_by,
              metadata: {
                shared_note_id: payload.new.id,
                tasting_note_id: payload.new.tasting_note_id,
                message: payload.new.message
              },
              created_at: payload.new.created_at
            }
            
            const userProfile = await this.getUserProfile(payload.new.shared_by)
            if (userProfile) {
              activityUpdate.user_profile = userProfile
            }
            
            onActivity(activityUpdate)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `squad_id=eq.${squadId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const activityUpdate: SquadActivityUpdate = {
              id: `member_joined_${payload.new.id}`,
              type: 'MEMBER_JOINED',
              squad_id: squadId,
              user_id: payload.new.user_id,
              metadata: {
                role: payload.new.role
              },
              created_at: payload.new.joined_at
            }
            
            const userProfile = await this.getUserProfile(payload.new.user_id)
            if (userProfile) {
              activityUpdate.user_profile = userProfile
            }
            
            onActivity(activityUpdate)
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const activityUpdate: SquadActivityUpdate = {
              id: `member_left_${payload.old.id}`,
              type: 'MEMBER_LEFT',
              squad_id: squadId,
              user_id: payload.old.user_id,
              metadata: {
                role: payload.old.role
              },
              created_at: new Date().toISOString()
            }
            
            const userProfile = await this.getUserProfile(payload.old.user_id)
            if (userProfile) {
              activityUpdate.user_profile = userProfile
            }
            
            onActivity(activityUpdate)
          }
        }
      )

    // Add presence tracking if callback provided
    if (onPresence) {
      channel.on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        onPresence(newState)
      })
      
      // Join presence when user enters the squad screen
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await channel.track({
              user_id: user.id,
              last_seen: new Date().toISOString(),
              status: 'online'
            })
          }
        }
      })
    } else {
      channel.subscribe()
    }

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromSquadActivity(squadId)
  }

  /**
   * Unsubscribe from squad activity updates
   */
  static unsubscribeFromSquadActivity(squadId: string): void {
    const channelName = `squad_${squadId}_activity`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Subscribe to general activity feed updates
   */
  static subscribeToActivityFeed(
    userId: string,
    onActivity: ActivityUpdateCallback
  ): () => void {
    const channelName = `user_${userId}_feed`
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromActivityFeed(userId)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasting_notes',
          filter: `visibility=eq.PUBLIC`
        },
        async (payload) => {
          if (payload.new && payload.new.user_id !== userId) {
            const activityUpdate: SquadActivityUpdate = {
              id: `public_tasting_${payload.new.id}`,
              type: 'TASTING_NOTE_CREATED',
              squad_id: '',
              user_id: payload.new.user_id,
              metadata: {
                tasting_note_id: payload.new.id,
                wine_name: payload.new.wine?.name,
                rating: payload.new.rating,
                is_blind: payload.new.is_blind_tasting
              },
              created_at: payload.new.created_at
            }
            
            const userProfile = await this.getUserProfile(payload.new.user_id)
            if (userProfile) {
              activityUpdate.user_profile = userProfile
            }
            
            onActivity(activityUpdate)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_tasting_notes',
          filter: `share_type=eq.PUBLIC`
        },
        async (payload) => {
          if (payload.new && payload.new.shared_by !== userId) {
            const activityUpdate: SquadActivityUpdate = {
              id: `public_shared_${payload.new.id}`,
              type: 'NOTE_SHARED',
              squad_id: '',
              user_id: payload.new.shared_by,
              metadata: {
                shared_note_id: payload.new.id,
                tasting_note_id: payload.new.tasting_note_id,
                message: payload.new.message
              },
              created_at: payload.new.created_at
            }
            
            const userProfile = await this.getUserProfile(payload.new.shared_by)
            if (userProfile) {
              activityUpdate.user_profile = userProfile
            }
            
            onActivity(activityUpdate)
          }
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromActivityFeed(userId)
  }

  /**
   * Unsubscribe from activity feed updates
   */
  static unsubscribeFromActivityFeed(userId: string): void {
    const channelName = `user_${userId}_feed`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Subscribe to user presence in a squad
   */
  static subscribeToSquadPresence(
    squadId: string,
    onPresenceUpdate: PresenceUpdateCallback
  ): () => void {
    const channelName = `squad_${squadId}_presence`
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromSquadPresence(squadId)
    }

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        onPresenceUpdate(newState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        onPresenceUpdate({ [key]: newPresences })
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        onPresenceUpdate({ [key]: [] })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await channel.track({
              user_id: user.id,
              last_seen: new Date().toISOString(),
              status: 'online',
              squad_id: squadId
            })
          }
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromSquadPresence(squadId)
  }

  /**
   * Unsubscribe from squad presence updates
   */
  static unsubscribeFromSquadPresence(squadId: string): void {
    const channelName = `squad_${squadId}_presence`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Clean up all subscriptions
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  /**
   * Send a real-time notification to a squad
   */
  static async sendSquadNotification(
    squadId: string,
    notification: {
      type: string
      title: string
      message: string
      metadata?: Record<string, any>
    }
  ): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Send notification through the squad channel
      const channelName = `squad_${squadId}_notifications`
      const channel = supabase.channel(channelName)
      
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          ...notification,
          from_user_id: user.id,
          squad_id: squadId,
          timestamp: new Date().toISOString()
        }
      })

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to send notification' }
    }
  }

  // Private helper methods
  private static async isNoteForSquad(noteId: string, squadId: string): Promise<boolean> {
    // This would require checking if the note's visibility settings
    // make it visible to the squad. For now, we'll assume all SQUAD visibility notes
    // are relevant to all squads the user is in.
    return true
  }

  private static async getUserProfile(userId: string): Promise<{
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
  } | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, wine_education_background')
        .eq('id', userId)
        .single()

      if (error) return null
      return profile
    } catch {
      return null
    }
  }

  /**
   * Get current online users in a squad
   */
  static getSquadOnlineUsers(squadId: string): Record<string, any> {
    const channelName = `squad_${squadId}_presence`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      return channel.presenceState()
    }
    
    return {}
  }

  /**
   * Update user's presence status
   */
  static async updatePresenceStatus(
    squadId: string,
    status: 'online' | 'away' | 'busy'
  ): Promise<void> {
    const channelName = `squad_${squadId}_presence`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await channel.track({
          user_id: user.id,
          last_seen: new Date().toISOString(),
          status,
          squad_id: squadId
        })
      }
    }
  }
}