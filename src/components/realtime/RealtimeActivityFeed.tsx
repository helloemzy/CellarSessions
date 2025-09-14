import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native'
import { RealtimeService, SquadActivityUpdate } from '@/services/api/realtime'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { ActivityItem } from '@/services/api/activity'

interface RealtimeActivityFeedProps {
  squadId?: string
  userId?: string
  onActivityPress?: (activity: ActivityItem) => void
  showPresence?: boolean
  headerComponent?: React.ComponentType<any>
}

interface RealtimeActivityItemProps {
  activity: SquadActivityUpdate
  onPress?: (activity: SquadActivityUpdate) => void
  isNew?: boolean
}

function RealtimeActivityItem({ activity, onPress, isNew = false }: RealtimeActivityItemProps) {
  const fadeAnim = React.useRef(new Animated.Value(isNew ? 0 : 1)).current
  const scaleAnim = React.useRef(new Animated.Value(isNew ? 0.8 : 1)).current

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isNew, fadeAnim, scaleAnim])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  const getActivityText = () => {
    const userName = activity.user_profile?.display_name || 'Someone'
    
    switch (activity.type) {
      case 'TASTING_NOTE_CREATED':
        return {
          action: `${userName} tasted a new wine`,
          details: activity.metadata.wine_name || 'Unknown wine',
          icon: '🍷',
          color: '#7C3AED'
        }
      case 'NOTE_SHARED':
        return {
          action: `${userName} shared a tasting note`,
          details: activity.metadata.message || 'Check out this wine!',
          icon: '📤',
          color: '#059669'
        }
      case 'MEMBER_JOINED':
        return {
          action: `${userName} joined the squad`,
          details: `Welcome to the wine community!`,
          icon: '👋',
          color: '#F59E0B'
        }
      case 'MEMBER_LEFT':
        return {
          action: `${userName} left the squad`,
          details: `Thanks for being part of our wine journey`,
          icon: '👋',
          color: '#6B7280'
        }
      case 'CHALLENGE_CREATED':
        return {
          action: `${userName} created a new challenge`,
          details: activity.metadata.challenge_name || 'Wine challenge',
          icon: '🏆',
          color: '#EF4444'
        }
      default:
        return {
          action: `${userName} did something`,
          details: 'Unknown activity',
          icon: '❓',
          color: '#6B7280'
        }
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const { action, details, icon, color } = getActivityText()

  return (
    <Animated.View
      style={[
        styles.activityItem,
        isNew && styles.newActivityItem,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.activityContent}
        onPress={() => onPress?.(activity)}
        activeOpacity={0.7}
      >
        <View style={styles.activityHeader}>
          <View style={styles.userSection}>
            {activity.user_profile?.avatar_url ? (
              <Image
                source={{ uri: activity.user_profile.avatar_url }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={[styles.userAvatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>
                  {getInitials(activity.user_profile?.display_name)}
                </Text>
              </View>
            )}
            
            <View style={[styles.activityIcon, { backgroundColor: color }]}>
              <Text style={styles.activityIconText}>{icon}</Text>
            </View>
          </View>
          
          <View style={styles.activityDetails}>
            <Text style={styles.activityAction}>{action}</Text>
            <Text style={styles.activityDescription} numberOfLines={2}>
              {details}
            </Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(activity.created_at)}</Text>
          </View>
          
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Additional metadata based on activity type */}
        {activity.type === 'TASTING_NOTE_CREATED' && activity.metadata.rating && (
          <View style={styles.metadata}>
            <Text style={styles.rating}>
              ⭐ {activity.metadata.rating}/5
            </Text>
            {activity.metadata.is_blind && (
              <Text style={styles.blindBadge}>🙈 Blind</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export function RealtimeActivityFeed({
  squadId,
  userId,
  onActivityPress,
  showPresence = false,
  headerComponent,
}: RealtimeActivityFeedProps) {
  const [realtimeActivities, setRealtimeActivities] = useState<SquadActivityUpdate[]>([])
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set())
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({})

  const handleRealtimeActivity = useCallback((activity: SquadActivityUpdate) => {
    setRealtimeActivities(prev => {
      // Avoid duplicates
      const exists = prev.some(item => item.id === activity.id)
      if (exists) return prev
      
      // Add to the beginning of the list
      const newList = [activity, ...prev].slice(0, 50) // Keep only latest 50
      return newList
    })
    
    // Mark as new for animation
    setNewActivityIds(prev => new Set(prev).add(activity.id))
    
    // Remove new badge after 3 seconds
    setTimeout(() => {
      setNewActivityIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(activity.id)
        return newSet
      })
    }, 3000)
  }, [])

  const handlePresenceUpdate = useCallback((presence: Record<string, any>) => {
    setOnlineUsers(presence)
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    if (squadId) {
      // Subscribe to squad activity
      unsubscribe = RealtimeService.subscribeToSquadActivity(
        squadId,
        handleRealtimeActivity,
        showPresence ? handlePresenceUpdate : undefined
      )
    } else if (userId) {
      // Subscribe to user's general feed
      unsubscribe = RealtimeService.subscribeToActivityFeed(
        userId,
        handleRealtimeActivity
      )
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [squadId, userId, handleRealtimeActivity, handlePresenceUpdate, showPresence])

  const handleActivityPress = (activity: SquadActivityUpdate) => {
    // Convert realtime activity to ActivityItem for consistency
    const activityItem: ActivityItem = {
      id: activity.id,
      type: activity.type === 'TASTING_NOTE_CREATED' ? 'TASTING_NOTE' : 'SHARED_NOTE',
      user_id: activity.user_id,
      created_at: activity.created_at,
      user_profile: activity.user_profile,
      // Add other required fields based on type
    }
    
    onActivityPress?.(activityItem)
  }

  const renderRealtimeActivity = ({ item }: { item: SquadActivityUpdate }) => (
    <RealtimeActivityItem
      activity={item}
      onPress={handleActivityPress}
      isNew={newActivityIds.has(item.id)}
    />
  )

  const renderOnlineUsers = () => {
    if (!showPresence || Object.keys(onlineUsers).length === 0) return null

    const users = Object.values(onlineUsers).flat()
    
    return (
      <View style={styles.presenceContainer}>
        <Text style={styles.presenceTitle}>
          🟢 {users.length} online now
        </Text>
        <View style={styles.onlineUsers}>
          {users.slice(0, 5).map((user, index) => (
            <View key={user.user_id || index} style={styles.onlineUserBadge}>
              <Text style={styles.onlineUserText}>
                {user.user_id?.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          ))}
          {users.length > 5 && (
            <Text style={styles.moreUsers}>+{users.length - 5} more</Text>
          )}
        </View>
      </View>
    )
  }

  const renderHeader = () => (
    <View>
      {headerComponent && React.createElement(headerComponent)}
      {renderOnlineUsers()}
      {realtimeActivities.length > 0 && (
        <View style={styles.realtimeHeader}>
          <Text style={styles.realtimeTitle}>🔴 Live Activity</Text>
          <Text style={styles.realtimeSubtitle}>
            Real-time updates from your wine community
          </Text>
        </View>
      )}
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⏳</Text>
      <Text style={styles.emptyTitle}>Waiting for activity...</Text>
      <Text style={styles.emptyMessage}>
        {squadId 
          ? 'New squad activity will appear here in real-time'
          : 'Public wine activity will appear here as it happens'
        }
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Real-time activities */}
      {realtimeActivities.length > 0 && (
        <FlatList
          data={realtimeActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderRealtimeActivity}
          style={styles.realtimeList}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Header and empty state */}
      <View style={styles.headerContainer}>
        {renderHeader()}
        {realtimeActivities.length === 0 && renderEmpty()}
      </View>
      
      {/* Regular activity feed below real-time updates */}
      <View style={styles.staticFeedContainer}>
        <ActivityFeed
          feedType={squadId ? 'squad' : 'public'}
          squadId={squadId}
          userId={userId}
          onActivityPress={onActivityPress}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#F9FAFB',
  },
  realtimeList: {
    backgroundColor: '#FFFFFF',
    maxHeight: 300,
    marginBottom: 8,
  },
  staticFeedContainer: {
    flex: 1,
  },
  presenceContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  presenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  onlineUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineUserBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineUserText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreUsers: {
    fontSize: 12,
    color: '#6B7280',
  },
  realtimeHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  realtimeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  realtimeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  newActivityItem: {
    borderColor: '#7C3AED',
    backgroundColor: '#FEFBFF',
  },
  activityContent: {
    padding: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userSection: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultAvatar: {
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  activityIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activityIconText: {
    fontSize: 10,
  },
  activityDetails: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  timeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  newBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  rating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  blindBadge: {
    fontSize: 10,
    color: '#7C3AED',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})