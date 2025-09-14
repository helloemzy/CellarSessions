import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native'
import { ActivityFeed } from './ActivityFeed'
import { RealtimeService, SquadActivityUpdate } from '@/services/api/realtime'
import { ActivityService, ActivityItem, ActivityFilters } from '@/services/api/activity'
import { useAuthStore } from '@/stores/auth/authStore'

interface RealtimeActivityFeedProps {
  filters?: ActivityFilters
  feedType?: 'personalized' | 'public' | 'user' | 'squad'
  userId?: string
  squadId?: string
  onActivityPress?: (activity: ActivityItem) => void
  headerComponent?: React.ComponentType<any>
  enableRealtime?: boolean
  enablePresence?: boolean
}

interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  message?: string
}

interface NewActivityNotification {
  count: number
  latestActivity?: SquadActivityUpdate
}

export function RealtimeActivityFeed({
  filters = {},
  feedType = 'personalized',
  userId,
  squadId,
  onActivityPress,
  headerComponent,
  enableRealtime = true,
  enablePresence = false,
}: RealtimeActivityFeedProps) {
  const { user } = useAuthStore()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected'
  })
  const [newActivityCount, setNewActivityCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const presenceUnsubscribeRef = useRef<(() => void) | null>(null)
  const notificationOpacity = useRef(new Animated.Value(0)).current
  const [showNewActivityBanner, setShowNewActivityBanner] = useState(false)

  // Handle real-time activity updates
  const handleActivityUpdate = useCallback((update: SquadActivityUpdate) => {
    // Don't show notifications for the current user's own activities
    if (update.user_id === user?.id) {
      return
    }

    console.log('Real-time activity update received:', update)
    
    setNewActivityCount(prev => prev + 1)
    setShowNewActivityBanner(true)
    
    // Animate the notification banner
    Animated.sequence([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowNewActivityBanner(false)
    })
  }, [user?.id, notificationOpacity])

  // Handle presence updates
  const handlePresenceUpdate = useCallback((presence: Record<string, any>) => {
    console.log('Presence update:', presence)
    setOnlineUsers(presence)
  }, [])

  // Setup real-time subscriptions
  useEffect(() => {
    if (!enableRealtime || !user) return

    setConnectionStatus({ status: 'connecting', message: 'Connecting to real-time updates...' })

    try {
      if (feedType === 'squad' && squadId) {
        // Subscribe to squad-specific activity
        unsubscribeRef.current = RealtimeService.subscribeToSquadActivity(
          squadId,
          handleActivityUpdate,
          enablePresence ? handlePresenceUpdate : undefined
        )
        setConnectionStatus({ status: 'connected', message: 'Connected to squad activity' })
      } else {
        // Subscribe to general activity feed
        unsubscribeRef.current = RealtimeService.subscribeToActivityFeed(
          user.id,
          handleActivityUpdate
        )
        setConnectionStatus({ status: 'connected', message: 'Connected to activity feed' })
      }

      // Setup presence subscription if enabled
      if (enablePresence && squadId) {
        presenceUnsubscribeRef.current = RealtimeService.subscribeToSquadPresence(
          squadId,
          handlePresenceUpdate
        )
      }
    } catch (error) {
      console.error('Failed to setup real-time subscriptions:', error)
      setConnectionStatus({ 
        status: 'error', 
        message: 'Failed to connect to real-time updates' 
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (presenceUnsubscribeRef.current) {
        presenceUnsubscribeRef.current()
        presenceUnsubscribeRef.current = null
      }
      setConnectionStatus({ status: 'disconnected' })
    }
  }, [enableRealtime, user, feedType, squadId, enablePresence, handleActivityUpdate, handlePresenceUpdate])

  // Handle refresh when new activities arrive
  const handleRefreshFeed = useCallback(() => {
    setNewActivityCount(0)
    setRefreshTrigger(prev => prev + 1)
    setShowNewActivityBanner(false)
    Animated.timing(notificationOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [notificationOpacity])

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (!enableRealtime) return null

    const statusColor = {
      connecting: '#F59E0B',
      connected: '#10B981',
      disconnected: '#6B7280',
      error: '#EF4444',
    }[connectionStatus.status]

    const statusText = {
      connecting: '⚡ Connecting...',
      connected: '⚡ Live',
      disconnected: '⚡ Offline',
      error: '⚡ Error',
    }[connectionStatus.status]

    return (
      <View style={[styles.connectionStatus, { backgroundColor: statusColor }]}>
        <Text style={styles.connectionStatusText}>{statusText}</Text>
      </View>
    )
  }

  // Online users indicator (for squad feeds with presence enabled)
  const renderOnlineUsers = () => {
    if (!enablePresence || !squadId || Object.keys(onlineUsers).length === 0) {
      return null
    }

    const onlineCount = Object.values(onlineUsers).reduce(
      (count, userPresences) => count + (Array.isArray(userPresences) ? userPresences.length : 0),
      0
    )

    return (
      <View style={styles.onlineIndicator}>
        <View style={styles.onlineDot} />
        <Text style={styles.onlineText}>
          {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
        </Text>
      </View>
    )
  }

  // New activity notification banner
  const renderNewActivityBanner = () => {
    if (!showNewActivityBanner || newActivityCount === 0) return null

    return (
      <Animated.View 
        style={[
          styles.newActivityBanner,
          { opacity: notificationOpacity }
        ]}
      >
        <TouchableOpacity style={styles.newActivityTouchable} onPress={handleRefreshFeed}>
          <Text style={styles.newActivityText}>
            {newActivityCount} new {newActivityCount === 1 ? 'activity' : 'activities'} • Tap to refresh
          </Text>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // Enhanced header component with real-time indicators
  const RealtimeHeaderComponent = () => (
    <View>
      {headerComponent && React.createElement(headerComponent)}
      
      <View style={styles.realtimeHeader}>
        {renderConnectionStatus()}
        {renderOnlineUsers()}
      </View>
      
      {renderNewActivityBanner()}
    </View>
  )

  return (
    <View style={styles.container}>
      <ActivityFeed
        filters={filters}
        feedType={feedType}
        userId={userId}
        squadId={squadId}
        onActivityPress={onActivityPress}
        headerComponent={RealtimeHeaderComponent}
        key={refreshTrigger} // Force refresh when new activities arrive
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  realtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  newActivityBanner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  newActivityTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newActivityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  refreshIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
})

// Hook for managing real-time activity feed state
export function useRealtimeActivityFeed(
  squadId?: string,
  enableRealtime: boolean = true
) {
  const { user } = useAuthStore()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected'
  })
  const [hasNewActivity, setHasNewActivity] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const handleActivityUpdate = useCallback(() => {
    setHasNewActivity(true)
  }, [])

  const markAsRead = useCallback(() => {
    setHasNewActivity(false)
  }, [])

  useEffect(() => {
    if (!enableRealtime || !user) return

    setConnectionStatus({ status: 'connecting' })

    try {
      if (squadId) {
        unsubscribeRef.current = RealtimeService.subscribeToSquadActivity(
          squadId,
          handleActivityUpdate
        )
      } else {
        unsubscribeRef.current = RealtimeService.subscribeToActivityFeed(
          user.id,
          handleActivityUpdate
        )
      }
      setConnectionStatus({ status: 'connected' })
    } catch (error) {
      setConnectionStatus({ status: 'error' })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setConnectionStatus({ status: 'disconnected' })
    }
  }, [enableRealtime, user, squadId, handleActivityUpdate])

  return {
    connectionStatus,
    hasNewActivity,
    markAsRead,
  }
}