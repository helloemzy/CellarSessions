import { supabase } from '@/services/api/supabase'
import { Database } from '@/services/api/supabase'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']
type Squad = Database['public']['Tables']['squads']['Row']
type SquadMember = Database['public']['Tables']['squad_members']['Row']

export interface RealtimeSubscription {
  channel: any
  unsubscribe: () => void
}

export interface TastingNoteEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: TastingNote | null
  old: TastingNote | null
}

export interface SquadEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Squad | null
  old: Squad | null
}

export interface SquadMemberEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: SquadMember | null
  old: SquadMember | null
}

export interface PresenceState {
  userId: string
  displayName: string
  avatarUrl?: string
  lastSeen: string
}

export class RealTimeService {
  /**
   * Subscribe to user's tasting notes changes
   */
  static subscribeToUserTastingNotes(
    userId: string,
    callback: (event: TastingNoteEvent) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`user_tasting_notes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasting_notes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as TastingNote | null,
            old: payload.old as TastingNote | null,
          })
        }
      )
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to squad tasting notes feed
   */
  static subscribeToSquadTastingNotes(
    squadId: string,
    callback: (event: TastingNoteEvent) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`squad_tasting_notes_${squadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasting_notes',
          filter: 'visibility=eq.SQUAD',
        },
        async (payload) => {
          // Additional filtering to ensure the user is in the squad
          const tastingNote = payload.new as TastingNote
          if (tastingNote) {
            const { data: isMember } = await supabase
              .from('squad_members')
              .select('id')
              .eq('squad_id', squadId)
              .eq('user_id', tastingNote.user_id)
              .single()

            if (isMember) {
              callback({
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                new: payload.new as TastingNote | null,
                old: payload.old as TastingNote | null,
              })
            }
          }
        }
      )
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to public tasting notes feed
   */
  static subscribeToPublicTastingNotes(
    callback: (event: TastingNoteEvent) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel('public_tasting_notes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasting_notes',
          filter: 'visibility=eq.PUBLIC',
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as TastingNote | null,
            old: payload.old as TastingNote | null,
          })
        }
      )
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to squad changes
   */
  static subscribeToSquadChanges(
    squadId: string,
    callback: (event: SquadEvent) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`squad_changes_${squadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squads',
          filter: `id=eq.${squadId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Squad | null,
            old: payload.old as Squad | null,
          })
        }
      )
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to squad membership changes
   */
  static subscribeToSquadMembershipChanges(
    squadId: string,
    callback: (event: SquadMemberEvent) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`squad_membership_${squadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `squad_id=eq.${squadId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as SquadMember | null,
            old: payload.old as SquadMember | null,
          })
        }
      )
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to user's squad memberships
   */
  static subscribeToUserSquadMemberships(
    userId: string,
    callback: (event: SquadMemberEvent) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`user_squad_memberships_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as SquadMember | null,
            old: payload.old as SquadMember | null,
          })
        }
      )
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Track presence in a squad
   */
  static trackSquadPresence(
    squadId: string,
    userState: PresenceState,
    onPresenceUpdate?: (presences: PresenceState[]) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`squad_presence_${squadId}`, {
        config: {
          presence: {
            key: userState.userId,
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        if (onPresenceUpdate) {
          const presences = Object.values(channel.presenceState())
            .flat()
            .map((presence: any) => presence as PresenceState)
          onPresenceUpdate(presences)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (onPresenceUpdate) {
          const allPresences = Object.values(channel.presenceState())
            .flat()
            .map((presence: any) => presence as PresenceState)
          onPresenceUpdate(allPresences)
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (onPresenceUpdate) {
          const allPresences = Object.values(channel.presenceState())
            .flat()
            .map((presence: any) => presence as PresenceState)
          onPresenceUpdate(allPresences)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userState)
        }
      })

    return {
      channel,
      unsubscribe: async () => {
        await channel.untrack()
        supabase.removeChannel(channel)
      }
    }
  }

  /**
   * Send real-time message to squad channel
   */
  static async sendSquadMessage(
    squadId: string,
    message: {
      type: string
      payload: any
      senderId: string
      senderName: string
    }
  ): Promise<{ error: string | null }> {
    try {
      await supabase
        .channel(`squad_${squadId}`)
        .send({
          type: 'broadcast',
          event: 'squad_message',
          payload: {
            ...message,
            timestamp: new Date().toISOString(),
          },
        })

      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to send message'
      }
    }
  }

  /**
   * Listen for squad messages
   */
  static subscribeToSquadMessages(
    squadId: string,
    callback: (message: {
      type: string
      payload: any
      senderId: string
      senderName: string
      timestamp: string
    }) => void
  ): RealtimeSubscription {
    const channel = supabase
      .channel(`squad_${squadId}`)
      .on('broadcast', { event: 'squad_message' }, ({ payload }) => {
        callback(payload)
      })
      .subscribe()

    return {
      channel,
      unsubscribe: () => supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to typing indicators in a squad
   */
  static subscribeToTypingIndicators(
    squadId: string,
    onTypingUpdate: (typingUsers: { userId: string; displayName: string }[]) => void
  ): RealtimeSubscription {
    const typingUsers = new Map<string, { displayName: string; timeout: NodeJS.Timeout }>()

    const channel = supabase
      .channel(`squad_typing_${squadId}`)
      .on('broadcast', { event: 'typing_start' }, ({ payload }) => {
        const { userId, displayName } = payload
        
        // Clear existing timeout for this user
        const existing = typingUsers.get(userId)
        if (existing?.timeout) {
          clearTimeout(existing.timeout)
        }

        // Set new timeout to automatically remove user after 3 seconds
        const timeout = setTimeout(() => {
          typingUsers.delete(userId)
          onTypingUpdate(Array.from(typingUsers.entries()).map(([id, data]) => ({
            userId: id,
            displayName: data.displayName
          })))
        }, 3000)

        typingUsers.set(userId, { displayName, timeout })
        
        onTypingUpdate(Array.from(typingUsers.entries()).map(([id, data]) => ({
          userId: id,
          displayName: data.displayName
        })))
      })
      .on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
        const { userId } = payload
        const existing = typingUsers.get(userId)
        if (existing?.timeout) {
          clearTimeout(existing.timeout)
        }
        typingUsers.delete(userId)
        
        onTypingUpdate(Array.from(typingUsers.entries()).map(([id, data]) => ({
          userId: id,
          displayName: data.displayName
        })))
      })
      .subscribe()

    return {
      channel,
      unsubscribe: () => {
        // Clear all timeouts
        typingUsers.forEach(({ timeout }) => clearTimeout(timeout))
        typingUsers.clear()
        supabase.removeChannel(channel)
      }
    }
  }

  /**
   * Send typing indicator
   */
  static async sendTypingIndicator(
    squadId: string,
    userId: string,
    displayName: string,
    isTyping: boolean
  ): Promise<{ error: string | null }> {
    try {
      await supabase
        .channel(`squad_typing_${squadId}`)
        .send({
          type: 'broadcast',
          event: isTyping ? 'typing_start' : 'typing_stop',
          payload: { userId, displayName },
        })

      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to send typing indicator'
      }
    }
  }

  /**
   * Multiple subscription manager
   */
  static createSubscriptionManager() {
    const subscriptions = new Map<string, RealtimeSubscription>()

    return {
      add: (key: string, subscription: RealtimeSubscription) => {
        // Clean up existing subscription with same key
        const existing = subscriptions.get(key)
        if (existing) {
          existing.unsubscribe()
        }
        subscriptions.set(key, subscription)
      },

      remove: (key: string) => {
        const subscription = subscriptions.get(key)
        if (subscription) {
          subscription.unsubscribe()
          subscriptions.delete(key)
        }
      },

      removeAll: () => {
        subscriptions.forEach((subscription) => {
          subscription.unsubscribe()
        })
        subscriptions.clear()
      },

      list: () => Array.from(subscriptions.keys()),

      has: (key: string) => subscriptions.has(key),
    }
  }

  /**
   * Get connection status
   */
  static getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR' {
    // This would depend on the Supabase client's connection state
    // For now, we'll return a basic implementation
    try {
      return 'OPEN' // Assume connected if no error
    } catch {
      return 'ERROR'
    }
  }

  /**
   * Reconnect to realtime
   */
  static async reconnect(): Promise<{ error: string | null }> {
    try {
      // Supabase handles reconnection automatically, but we can force it
      await supabase.realtime.disconnect()
      await supabase.realtime.connect()
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to reconnect'
      }
    }
  }
}