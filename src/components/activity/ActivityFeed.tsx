import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Animated,
} from 'react-native'
import { ActivityService, ActivityItem, ActivityFilters } from '@/services/api/activity'
import { RealtimeService, SquadActivityUpdate } from '@/services/api/realtime'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/stores/authStore'

interface ActivityFeedProps {
  filters?: ActivityFilters
  feedType?: 'personalized' | 'public' | 'user' | 'squad'
  userId?: string
  squadId?: string
  onActivityPress?: (activity: ActivityItem) => void
  headerComponent?: React.ComponentType<any>
}

interface ActivityCardProps {
  activity: ActivityItem
  onPress?: (activity: ActivityItem) => void
}

function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return `${minutes}m ago`
    }
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    }
    if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days}d ago`
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const renderActivityContent = () => {
    switch (activity.type) {
      case 'TASTING_NOTE':
        return (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.userName}>
                {activity.user_profile?.display_name || 'Someone'}
              </Text>
              <Text style={styles.actionText}> tasted </Text>
              <Text style={styles.wineName}>
                {activity.tasting_note?.wine?.name || 'a wine'}
              </Text>
            </Text>
            
            {activity.tasting_note?.wine && (
              <View style={styles.wineInfo}>
                {activity.tasting_note.wine.image_url && (
                  <Image 
                    source={{ uri: activity.tasting_note.wine.image_url }} 
                    style={styles.wineImage} 
                  />
                )}
                <View style={styles.wineDetails}>
                  <Text style={styles.wineProducer}>
                    {activity.tasting_note.wine.producer}
                    {activity.tasting_note.wine.vintage && 
                      ` • ${activity.tasting_note.wine.vintage}`}
                  </Text>
                  {activity.tasting_note.wine.region && (
                    <Text style={styles.wineRegion}>
                      {activity.tasting_note.wine.region}
                    </Text>
                  )}
                  {activity.tasting_note.rating && (
                    <Text style={styles.rating}>
                      {activity.tasting_note.rating}/5 ⭐
                    </Text>
                  )}
                </View>
              </View>
            )}

            {activity.tasting_note?.is_blind_tasting && (
              <View style={styles.blindBadge}>
                <Text style={styles.blindBadgeText}>🙈 Blind Tasting</Text>
              </View>
            )}

            {activity.tasting_note?.notes && (
              <Text style={styles.tastingNotes} numberOfLines={2}>
                {activity.tasting_note.notes}
              </Text>
            )}
          </View>
        )

      case 'SHARED_NOTE':
        return (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.userName}>
                {activity.user_profile?.display_name || 'Someone'}
              </Text>
              <Text style={styles.actionText}> shared a tasting note</Text>
              {activity.shared_note?.share_type === 'SQUAD' && activity.shared_note.squad && (
                <Text style={styles.actionText}>
                  {' '}with <Text style={styles.squadName}>{activity.shared_note.squad.name}</Text>
                </Text>
              )}
            </Text>

            {activity.shared_note?.message && (
              <View style={styles.shareMessage}>
                <Text style={styles.shareMessageText}>
                  "{activity.shared_note.message}"
                </Text>
              </View>
            )}

            {activity.shared_note?.tasting_note?.wine && (
              <View style={styles.sharedWineInfo}>
                <Text style={styles.sharedWineName}>
                  🍷 {activity.shared_note.tasting_note.wine.name}
                </Text>
                <Text style={styles.sharedWineDetails}>
                  {activity.shared_note.tasting_note.wine.producer}
                  {activity.shared_note.tasting_note.wine.vintage && 
                    ` • ${activity.shared_note.tasting_note.wine.vintage}`}
                </Text>
                {activity.shared_note.tasting_note.rating && (
                  <Text style={styles.sharedRating}>
                    {activity.shared_note.tasting_note.rating}/5 ⭐
                  </Text>
                )}
              </View>
            )}
          </View>
        )

      case 'SQUAD_CREATE':
        return (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.userName}>
                {activity.user_profile?.display_name || 'Someone'}
              </Text>
              <Text style={styles.actionText}> created squad </Text>
              <Text style={styles.squadName}>
                {activity.squad?.name || 'Unknown Squad'}
              </Text>
            </Text>
            
            {activity.squad && (
              <View style={styles.squadInfo}>
                <Text style={styles.squadMeta}>
                  👥 {activity.squad.member_count || 0} members
                  {activity.squad.is_private && ' • 🔒 Private'}
                </Text>
              </View>
            )}
          </View>
        )

      case 'SQUAD_JOIN':
        return (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.userName}>
                {activity.user_profile?.display_name || 'Someone'}
              </Text>
              <Text style={styles.actionText}> joined squad </Text>
              <Text style={styles.squadName}>
                {activity.squad?.name || 'Unknown Squad'}
              </Text>
            </Text>
          </View>
        )

      default:
        return (
          <Text style={styles.activityText}>Unknown activity</Text>
        )
    }
  }

  return (
    <TouchableOpacity style={styles.activityCard} onPress={() => onPress?.(activity)}>
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
          
          {activity.user_profile?.wine_education_background && (
            <View style={styles.educationBadge}>
              <Text style={styles.educationText}>
                {activity.user_profile.wine_education_background}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.timeAgo}>{formatDate(activity.created_at)}</Text>
      </View>

      {renderActivityContent()}
    </TouchableOpacity>
  )
}

export function ActivityFeed({
  filters = {},
  feedType = 'personalized',
  userId,
  squadId,
  onActivityPress,
  headerComponent,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [newActivityCount, setNewActivityCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({})
  
  const { user } = useAuthStore()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const newActivityAnimation = useRef(new Animated.Value(0)).current

  const loadActivities = async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (pageNum === 0) {
        setLoading(true)
      }

      let result
      switch (feedType) {
        case 'public':
          result = await ActivityService.getPublicActivity(pageNum, 20)
          break
        case 'user':
          if (!userId) throw new Error('User ID required for user activity feed')
          result = await ActivityService.getUserActivity(userId, pageNum, 20)
          break
        case 'squad':
          if (!squadId) throw new Error('Squad ID required for squad activity feed')
          result = await ActivityService.getSquadActivity(squadId, pageNum, 20)
          break
        default:
          result = await ActivityService.getPersonalizedFeed(pageNum, 20)
      }

      const { activities, totalCount: count, error } = result

      if (error) {
        setError(error)
        return
      }

      if (isRefresh || pageNum === 0) {
        setActivities(activities)
      } else {
        setActivities(prev => [...prev, ...activities])
      }

      setTotalCount(count)
      setHasMore(activities.length === 20)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity feed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setPage(0)
    loadActivities(0, true)
  }, [filters, feedType, userId, squadId])

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadActivities(nextPage)
    }
  }, [loading, hasMore, page])

  useEffect(() => {
    setPage(0)
    loadActivities(0)
  }, [filters, feedType, userId, squadId])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    const handleNewActivity = (update: SquadActivityUpdate) => {
      // Convert real-time update to ActivityItem format
      const newActivity: ActivityItem = {
        id: update.id,
        type: convertUpdateType(update.type),
        user_id: update.user_id,
        created_at: update.created_at,
        user_profile: update.user_profile,
        metadata: update.metadata
      }

      // Add new activity to the top of the list
      setActivities(prevActivities => {
        // Check if activity already exists to avoid duplicates
        if (prevActivities.some(activity => activity.id === newActivity.id)) {
          return prevActivities
        }
        
        const updatedActivities = [newActivity, ...prevActivities]
        
        // Animate new activity indicator
        setNewActivityCount(prev => prev + 1)
        Animated.sequence([
          Animated.timing(newActivityAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(newActivityAnimation, {
            toValue: 0,
            duration: 300,
            delay: 2000,
            useNativeDriver: true,
          }),
        ]).start()
        
        return updatedActivities
      })
      
      setTotalCount(prev => prev + 1)
    }

    const handlePresenceUpdate = (presence: Record<string, any>) => {
      setOnlineUsers(presence)
    }

    // Subscribe based on feed type
    if (feedType === 'squad' && squadId) {
      unsubscribeRef.current = RealtimeService.subscribeToSquadActivity(
        squadId,
        handleNewActivity,
        handlePresenceUpdate
      )
    } else if (feedType === 'public' || feedType === 'personalized') {
      unsubscribeRef.current = RealtimeService.subscribeToActivityFeed(
        user.id,
        handleNewActivity
      )
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [feedType, squadId, user])

  const convertUpdateType = (updateType: SquadActivityUpdate['type']): ActivityItem['type'] => {
    switch (updateType) {
      case 'TASTING_NOTE_CREATED':
        return 'TASTING_NOTE'
      case 'NOTE_SHARED':
        return 'SHARED_NOTE'
      case 'MEMBER_JOINED':
        return 'SQUAD_JOIN'
      case 'MEMBER_LEFT':
        return 'SQUAD_JOIN' // We can handle this as a special case
      case 'CHALLENGE_CREATED':
        return 'TASTING_NOTE' // Map to closest existing type
      default:
        return 'TASTING_NOTE'
    }
  }

  const renderActivity = ({ item }: { item: ActivityItem }) => (
    <ActivityCard
      activity={item}
      onPress={onActivityPress}
    />
  )

  const renderEmpty = () => {
    if (loading) return null
    
    const getEmptyMessage = () => {
      switch (feedType) {
        case 'public':
          return {
            title: 'No Public Activity',
            message: 'No public activity found. Be the first to share something!',
          }
        case 'user':
          return {
            title: 'No User Activity',
            message: 'This user hasn\'t created any tasting notes or shared any activity yet.',
          }
        case 'squad':
          return {
            title: 'No Squad Activity',
            message: 'No activity in this squad yet. Start by sharing a tasting note!',
          }
        default:
          return {
            title: 'No Activity Yet',
            message: 'Your feed will show activity from your squads and wine community. Join a squad or follow other wine lovers to see more!',
          }
      }
    }

    const { title, message } = getEmptyMessage()
    
    return (
      <EmptyState
        title={title}
        message={message}
        iconName="activity"
      />
    )
  }

  const renderFooter = () => {
    if (!hasMore || loading) return null
    
    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    )
  }

  const handleScrollToTop = () => {
    setNewActivityCount(0)
    // You could also scroll to top here if you have a FlatList ref
  }

  const renderHeader = () => (
    <View>
      {headerComponent && React.createElement(headerComponent)}
      
      {/* New Activity Indicator */}
      {newActivityCount > 0 && (
        <Animated.View
          style={[
            styles.newActivityIndicator,
            {
              opacity: newActivityAnimation,
              transform: [
                {
                  translateY: newActivityAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.newActivityButton} onPress={handleScrollToTop}>
            <Text style={styles.newActivityText}>
              🔔 {newActivityCount} new {newActivityCount === 1 ? 'activity' : 'activities'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Online Users Indicator for Squad Feeds */}
      {feedType === 'squad' && Object.keys(onlineUsers).length > 0 && (
        <View style={styles.onlineUsersContainer}>
          <Text style={styles.onlineUsersLabel}>
            🟢 {Object.keys(onlineUsers).length} online
          </Text>
          <View style={styles.onlineUsersList}>
            {Object.entries(onlineUsers).slice(0, 5).map(([userId, presence]) => (
              <View key={userId} style={styles.onlineUserDot}>
                <Text style={styles.onlineUserInitial}>
                  {presence[0]?.user_id?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            ))}
            {Object.keys(onlineUsers).length > 5 && (
              <Text style={styles.moreOnlineText}>
                +{Object.keys(onlineUsers).length - 5}
              </Text>
            )}
          </View>
        </View>
      )}
      
      {totalCount > 0 && (
        <Text style={styles.resultCount}>
          {totalCount === 1 ? '1 activity' : `${totalCount} activities`}
        </Text>
      )}
    </View>
  )

  if (loading && activities.length === 0) {
    return <LoadingSpinner message="Loading activity feed..." />
  }

  if (error && activities.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadActivities()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      renderItem={renderActivity}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={activities.length === 0 ? styles.emptyContainer : styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultAvatar: {
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  educationBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  educationText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 8,
  },
  userName: {
    fontWeight: '600',
    color: '#7C3AED',
  },
  actionText: {
    color: '#6B7280',
  },
  wineName: {
    fontWeight: '600',
    color: '#1F2937',
  },
  squadName: {
    fontWeight: '600',
    color: '#059669',
  },
  wineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  wineImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  wineDetails: {
    flex: 1,
  },
  wineProducer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  wineRegion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  rating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  blindBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  blindBadgeText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '500',
  },
  tastingNotes: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  shareMessage: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  shareMessageText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  sharedWineInfo: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sharedWineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sharedWineDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  sharedRating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  squadInfo: {
    marginTop: 8,
  },
  squadMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Real-time styles
  newActivityIndicator: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  newActivityButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newActivityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  onlineUsersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  onlineUsersLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  onlineUsersList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineUserDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineUserInitial: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  moreOnlineText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 4,
  },
})