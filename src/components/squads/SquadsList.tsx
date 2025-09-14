import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  TextInput,
} from 'react-native'
import { SquadsService, Squad, SquadFilters } from '@/services/api/squads'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface SquadsListProps {
  filters?: SquadFilters
  onSquadPress?: (squad: Squad) => void
  onJoinSquad?: (squadId: string) => void
  showSearch?: boolean
  showJoinButton?: boolean
  headerComponent?: React.ComponentType<any>
}

interface SquadCardProps {
  squad: Squad
  onPress?: (squad: Squad) => void
  onJoin?: (squadId: string) => void
  showJoinButton?: boolean
}

function SquadCard({ squad, onPress, onJoin, showJoinButton = false }: SquadCardProps) {
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    if (!onJoin) return

    setJoining(true)
    try {
      onJoin(squad.id)
    } finally {
      setJoining(false)
    }
  }

  const formatMemberCount = (count: number) => {
    if (count === 1) return '1 member'
    return `${count} members`
  }

  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString)
    return `Created ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    })}`
  }

  const getEducationBadge = (background: string | null) => {
    switch (background) {
      case 'WSET':
        return { label: 'WSET', color: '#F59E0B' }
      case 'CMS':
        return { label: 'CMS', color: '#DC2626' }
      case 'ISG':
        return { label: 'ISG', color: '#059669' }
      case 'OTHER':
        return { label: 'Certified', color: '#7C3AED' }
      default:
        return null
    }
  }

  return (
    <TouchableOpacity style={styles.squadCard} onPress={() => onPress?.(squad)}>
      <View style={styles.squadHeader}>
        <View style={styles.squadInfo}>
          <View style={styles.squadTitleRow}>
            <Text style={styles.squadName} numberOfLines={1}>
              {squad.name}
            </Text>
            {squad.is_private && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>🔒</Text>
              </View>
            )}
          </View>
          
          <View style={styles.squadMeta}>
            <Text style={styles.memberCount}>
              {formatMemberCount(squad.member_count || 0)}
            </Text>
            <Text style={styles.metaDivider}>•</Text>
            <Text style={styles.createdDate}>
              {formatCreatedDate(squad.created_at)}
            </Text>
          </View>
        </View>

        {/* Creator Info */}
        <View style={styles.creatorInfo}>
          {squad.creator_profile?.avatar_url ? (
            <Image
              source={{ uri: squad.creator_profile.avatar_url }}
              style={styles.creatorAvatar}
            />
          ) : (
            <View style={[styles.creatorAvatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {squad.creator_profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          
          <View style={styles.creatorDetails}>
            <Text style={styles.creatorName} numberOfLines={1}>
              {squad.creator_profile?.display_name || 'Anonymous'}
            </Text>
            <Text style={styles.creatorRole}>Creator</Text>
          </View>
        </View>
      </View>

      {squad.description && (
        <Text style={styles.squadDescription} numberOfLines={2}>
          {squad.description}
        </Text>
      )}

      {showJoinButton && !squad.is_private && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.joinButton, joining && styles.disabledButton]} 
            onPress={handleJoin}
            disabled={joining}
          >
            <Text style={[styles.joinButtonText, joining && styles.disabledButtonText]}>
              {joining ? 'Joining...' : 'Join Squad'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function SquadsList({
  filters = {},
  onSquadPress,
  onJoinSquad,
  showSearch = false,
  showJoinButton = false,
  headerComponent,
}: SquadsListProps) {
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [localFilters, setLocalFilters] = useState<SquadFilters>(filters)

  const loadSquads = async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (pageNum === 0) {
        setLoading(true)
      }

      const searchFilters = {
        ...localFilters,
        ...(searchQuery && { search: searchQuery })
      }

      const { squads, totalCount: count, error } = await SquadsService.getUserSquads(
        searchFilters,
        pageNum,
        20
      )

      if (error) {
        setError(error)
        return
      }

      if (isRefresh || pageNum === 0) {
        setSquads(squads)
      } else {
        setSquads(prev => [...prev, ...squads])
      }

      setTotalCount(count)
      setHasMore(squads.length === 20)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load squads')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setPage(0)
    loadSquads(0, true)
  }, [localFilters, searchQuery])

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadSquads(nextPage)
    }
  }, [loading, hasMore, page])

  const handleJoinSquad = async (squadId: string) => {
    try {
      const { error } = await SquadsService.joinSquad(squadId)
      if (error) {
        Alert.alert('Error', `Failed to join squad: ${error}`)
        return
      }

      Alert.alert('Success', 'You have successfully joined the squad!')
      
      // Remove squad from list if showing public squads
      if (showJoinButton) {
        setSquads(prev => prev.filter(squad => squad.id !== squadId))
      }
      
      onJoinSquad?.(squadId)
    } catch (err) {
      Alert.alert('Error', 'Failed to join squad')
    }
  }

  const handleSearch = useCallback(() => {
    setLocalFilters(prev => ({ ...prev, search: searchQuery }))
    setPage(0)
    loadSquads(0)
  }, [searchQuery])

  useEffect(() => {
    setLocalFilters(filters)
    setPage(0)
    loadSquads(0)
  }, [filters])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (showSearch) {
        handleSearch()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, showSearch])

  const renderSquad = ({ item }: { item: Squad }) => (
    <SquadCard
      squad={item}
      onPress={onSquadPress}
      onJoin={handleJoinSquad}
      showJoinButton={showJoinButton}
    />
  )

  const renderEmpty = () => {
    if (loading) return null
    
    const title = showJoinButton 
      ? 'No Public Squads Found' 
      : totalCount === 0 
        ? 'No Squads Yet' 
        : 'No Squads Match Your Filters'
    
    const message = showJoinButton
      ? 'Try different search terms to find squads to join'
      : totalCount === 0
        ? 'Create your first squad to connect with fellow wine lovers!'
        : 'Try adjusting your search or filters'
    
    return (
      <EmptyState
        title={title}
        message={message}
        iconName="group"
        actionText={!showJoinButton ? "Create Squad" : undefined}
        onActionPress={!showJoinButton ? () => {
          // Navigate to create squad
        } : undefined}
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

  const renderHeader = () => (
    <View>
      {headerComponent && React.createElement(headerComponent)}
      
      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search squads..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
      
      {totalCount > 0 && (
        <Text style={styles.resultCount}>
          {totalCount === 1 ? '1 squad' : `${totalCount} squads`}
        </Text>
      )}
    </View>
  )

  if (loading && squads.length === 0) {
    return <LoadingSpinner message="Loading squads..." />
  }

  if (error && squads.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadSquads()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={squads}
      keyExtractor={(item) => item.id}
      renderItem={renderSquad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={squads.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  resultCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  squadCard: {
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
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  squadInfo: {
    flex: 1,
    marginRight: 16,
  },
  squadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  squadName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  privateBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
  },
  privateBadgeText: {
    fontSize: 12,
  },
  squadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
  },
  metaDivider: {
    fontSize: 14,
    color: '#D1D5DB',
    marginHorizontal: 8,
  },
  createdDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  creatorInfo: {
    alignItems: 'center',
    minWidth: 80,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
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
  creatorDetails: {
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  creatorRole: {
    fontSize: 10,
    color: '#6B7280',
  },
  squadDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  joinButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  disabledButtonText: {
    color: '#F3F4F6',
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
})