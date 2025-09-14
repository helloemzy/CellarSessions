import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

export interface PushNotificationData {
  type: 'SQUAD_ACTIVITY' | 'LIKE' | 'COMMENT' | 'CHALLENGE' | 'MEMBER_JOINED'
  squadId?: string
  tastingNoteId?: string
  challengeId?: string
  fromUserId: string
  fromUserName: string
  title: string
  body: string
  data: Record<string, any>
}

export class PushNotificationService {
  /**
   * Configure notification handling
   */
  static configure() {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })

    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification)
    })

    // Handle notification tapped/clicked
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response)
      // Handle navigation based on notification data
      const data = response.notification.request.content.data
      PushNotificationService.handleNotificationTap(data)
    })
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<{
    granted: boolean
    token: string | null
    error: string | null
  }> {
    try {
      if (!Device.isDevice) {
        return {
          granted: false,
          token: null,
          error: 'Push notifications only work on physical devices'
        }
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        return {
          granted: false,
          token: null,
          error: 'Permission to receive push notifications was denied'
        }
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with actual project ID
      })

      return {
        granted: true,
        token: tokenData.data,
        error: null
      }
    } catch (error) {
      return {
        granted: false,
        token: null,
        error: error instanceof Error ? error.message : 'Failed to get push token'
      }
    }
  }

  /**
   * Save push token to user profile
   */
  static async savePushToken(token: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: token,
          push_notifications_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save push token'
      }
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(preferences: {
    squad_activities?: boolean
    likes?: boolean
    comments?: boolean
    challenges?: boolean
    member_updates?: boolean
  }): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences'
      }
    }
  }

  /**
   * Send push notification to user(s)
   */
  static async sendNotification(
    recipientUserIds: string[],
    notificationData: PushNotificationData
  ): Promise<{
    success: boolean
    sentCount: number
    error: string | null
  }> {
    try {
      // Get push tokens for recipient users
      const { data: recipients, error: fetchError } = await supabase
        .from('profiles')
        .select('id, push_token, push_notifications_enabled, notification_preferences')
        .in('id', recipientUserIds)
        .eq('push_notifications_enabled', true)
        .not('push_token', 'is', null)

      if (fetchError) {
        return { success: false, sentCount: 0, error: fetchError.message }
      }

      if (!recipients || recipients.length === 0) {
        return { success: true, sentCount: 0, error: null }
      }

      // Filter recipients based on notification preferences
      const eligibleRecipients = recipients.filter(recipient => {
        const prefs = recipient.notification_preferences || {}
        
        switch (notificationData.type) {
          case 'SQUAD_ACTIVITY':
            return prefs.squad_activities !== false
          case 'LIKE':
            return prefs.likes !== false
          case 'COMMENT':
            return prefs.comments !== false
          case 'CHALLENGE':
            return prefs.challenges !== false
          case 'MEMBER_JOINED':
            return prefs.member_updates !== false
          default:
            return true
        }
      })

      if (eligibleRecipients.length === 0) {
        return { success: true, sentCount: 0, error: null }
      }

      // Prepare push messages
      const messages = eligibleRecipients.map(recipient => ({
        to: recipient.push_token,
        sound: 'default',
        title: notificationData.title,
        body: notificationData.body,
        data: {
          ...notificationData.data,
          type: notificationData.type,
          fromUserId: notificationData.fromUserId,
          fromUserName: notificationData.fromUserName,
        },
        badge: 1,
      }))

      // Send notifications via Expo Push API
      const chunks = this.chunkArray(messages, 100) // Expo limit is 100 per request
      let totalSent = 0

      for (const chunk of chunks) {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        })

        if (response.ok) {
          const result = await response.json()
          totalSent += result.data?.filter((r: any) => r.status === 'ok').length || 0
        }
      }

      // Store notification record in database
      await this.storeNotificationRecord(recipientUserIds, notificationData)

      return { success: true, sentCount: totalSent, error: null }
    } catch (error) {
      return {
        success: false,
        sentCount: 0,
        error: error instanceof Error ? error.message : 'Failed to send notifications'
      }
    }
  }

  /**
   * Send squad activity notification
   */
  static async sendSquadActivityNotification(
    squadId: string,
    activityType: 'TASTING_NOTE' | 'COMMENT' | 'CHALLENGE' | 'MEMBER_JOINED',
    fromUserId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Get squad members (excluding the activity creator)
      const { data: members, error } = await supabase
        .from('squad_members')
        .select(`
          user_id,
          profiles!inner(
            display_name,
            push_notifications_enabled
          )
        `)
        .eq('squad_id', squadId)
        .neq('user_id', fromUserId)

      if (error || !members || members.length === 0) {
        return
      }

      // Get squad info
      const { data: squad } = await supabase
        .from('squads')
        .select('name')
        .eq('id', squadId)
        .single()

      // Get sender info
      const { data: sender } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', fromUserId)
        .single()

      const squadName = squad?.name || 'your squad'
      const senderName = sender?.display_name || 'Someone'

      // Generate notification content based on activity type
      let title: string
      let body: string

      switch (activityType) {
        case 'TASTING_NOTE':
          title = `New tasting note in ${squadName}`
          body = `${senderName} shared a new tasting note${metadata.wineName ? ` for ${metadata.wineName}` : ''}`
          break
        case 'COMMENT':
          title = `New comment in ${squadName}`
          body = `${senderName} commented on a tasting note`
          break
        case 'CHALLENGE':
          title = `New challenge in ${squadName}`
          body = `${senderName} created a new wine challenge`
          break
        case 'MEMBER_JOINED':
          title = `New member joined ${squadName}`
          body = `${senderName} joined your squad`
          break
        default:
          title = `Activity in ${squadName}`
          body = `${senderName} was active in your squad`
      }

      const notificationData: PushNotificationData = {
        type: 'SQUAD_ACTIVITY',
        squadId,
        fromUserId,
        fromUserName: senderName,
        title,
        body,
        data: {
          squadId,
          activityType,
          ...metadata
        }
      }

      const recipientIds = members.map(m => m.user_id)
      await this.sendNotification(recipientIds, notificationData)

    } catch (error) {
      console.error('Failed to send squad activity notification:', error)
    }
  }

  /**
   * Send like notification
   */
  static async sendLikeNotification(
    tastingNoteId: string,
    likedByUserId: string
  ): Promise<void> {
    try {
      // Get tasting note and owner info
      const { data: note, error } = await supabase
        .from('tasting_notes')
        .select(`
          user_id,
          wines(name),
          profiles!tasting_notes_user_id_fkey(display_name)
        `)
        .eq('id', tastingNoteId)
        .single()

      if (error || !note || note.user_id === likedByUserId) {
        return // Don't notify if it's their own note
      }

      // Get liker info
      const { data: liker } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', likedByUserId)
        .single()

      const likerName = liker?.display_name || 'Someone'
      const wineName = note.wines?.name || 'your wine'

      const notificationData: PushNotificationData = {
        type: 'LIKE',
        tastingNoteId,
        fromUserId: likedByUserId,
        fromUserName: likerName,
        title: 'Your tasting note was liked!',
        body: `${likerName} liked your note about ${wineName}`,
        data: {
          tastingNoteId,
          wineName
        }
      }

      await this.sendNotification([note.user_id], notificationData)

    } catch (error) {
      console.error('Failed to send like notification:', error)
    }
  }

  /**
   * Send comment notification
   */
  static async sendCommentNotification(
    tastingNoteId: string,
    commentedByUserId: string,
    commentContent: string
  ): Promise<void> {
    try {
      // Get tasting note and owner info
      const { data: note, error } = await supabase
        .from('tasting_notes')
        .select(`
          user_id,
          wines(name),
          profiles!tasting_notes_user_id_fkey(display_name)
        `)
        .eq('id', tastingNoteId)
        .single()

      if (error || !note || note.user_id === commentedByUserId) {
        return // Don't notify if it's their own note
      }

      // Get commenter info
      const { data: commenter } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', commentedByUserId)
        .single()

      const commenterName = commenter?.display_name || 'Someone'
      const wineName = note.wines?.name || 'your wine'

      const notificationData: PushNotificationData = {
        type: 'COMMENT',
        tastingNoteId,
        fromUserId: commentedByUserId,
        fromUserName: commenterName,
        title: 'New comment on your tasting note',
        body: `${commenterName} commented on your note about ${wineName}`,
        data: {
          tastingNoteId,
          wineName,
          commentContent: commentContent.substring(0, 100)
        }
      }

      await this.sendNotification([note.user_id], notificationData)

    } catch (error) {
      console.error('Failed to send comment notification:', error)
    }
  }

  /**
   * Handle notification tap/click
   */
  static handleNotificationTap(data: any) {
    // This would typically use navigation service to navigate to appropriate screen
    console.log('Handling notification tap:', data)
    
    switch (data.type) {
      case 'SQUAD_ACTIVITY':
        // Navigate to squad screen
        // NavigationService.navigate('Squad', { squadId: data.squadId })
        break
      case 'LIKE':
      case 'COMMENT':
        // Navigate to tasting note detail
        // NavigationService.navigate('TastingNoteDetail', { noteId: data.tastingNoteId })
        break
      case 'CHALLENGE':
        // Navigate to challenge screen
        // NavigationService.navigate('Challenge', { challengeId: data.challengeId })
        break
      default:
        // Navigate to home or activity feed
        // NavigationService.navigate('Home')
        break
    }
  }

  /**
   * Get user's notification settings
   */
  static async getNotificationSettings(): Promise<{
    settings: {
      enabled: boolean
      preferences: Record<string, boolean>
    } | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { settings: null, error: 'User not authenticated' }
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_notifications_enabled, notification_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        return { settings: null, error: error.message }
      }

      return {
        settings: {
          enabled: profile.push_notifications_enabled || false,
          preferences: profile.notification_preferences || {
            squad_activities: true,
            likes: true,
            comments: true,
            challenges: true,
            member_updates: true
          }
        },
        error: null
      }
    } catch (error) {
      return {
        settings: null,
        error: error instanceof Error ? error.message : 'Failed to get settings'
      }
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync()
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  /**
   * Set badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count)
    } catch (error) {
      console.error('Failed to set badge count:', error)
    }
  }

  // Private helper methods

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private static async storeNotificationRecord(
    recipientIds: string[],
    notificationData: PushNotificationData
  ): Promise<void> {
    try {
      const records = recipientIds.map(userId => ({
        user_id: userId,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
        sent_at: new Date().toISOString(),
        read: false
      }))

      await supabase
        .from('push_notifications')
        .insert(records)
    } catch (error) {
      console.error('Failed to store notification record:', error)
    }
  }
}