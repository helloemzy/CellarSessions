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
} from 'react-native'
import { SharingService, SharedTastingNote, SharingFilters } from '@/services/api/sharing'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface SharedNotesListProps {
  filters?: SharingFilters
  onNotePress?: (sharedNote: SharedTastingNote) => void
  showUserInfo?: boolean
  headerComponent?: React.ComponentType<any>
  listType?: 'all' | 'public' | 'squad' | 'user'
  squadId?: string
  userId?: string
}

interface SharedNoteCardProps {
  sharedNote: SharedTastingNote
  onPress?: (sharedNote: SharedTastingNote) => void
  showUserInfo?: boolean
}

function SharedNoteCard({ sharedNote, onPress, showUserInfo = true }: SharedNoteCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRating = (rating: number | null) => {
    if (!rating) return 'No rating'
    return `${rating}/5 ⭐`
  }

  const getShareTypeLabel = () => {
    if (sharedNote.share_type === 'SQUAD' && sharedNote.squad) {
      return `Shared to ${sharedNote.squad.name}`
    }
    return 'Shared publicly'
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

  return (
    <TouchableOpacity style={styles.noteCard} onPress={() => onPress?.(sharedNote)}>
      {/* Share Header */}
      <View style={styles.shareHeader}>
        {showUserInfo && (
          <View style={styles.userInfo}>
            {sharedNote.shared_by_profile?.avatar_url ? (
              <Image
                source={{ uri: sharedNote.shared_by_profile.avatar_url }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={[styles.userAvatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>
                  {getInitials(sharedNote.shared_by_profile?.display_name)}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {sharedNote.shared_by_profile?.display_name || 'Anonymous'}
              </Text>
              <Text style={styles.shareType}>{getShareTypeLabel()}</Text>
            </View>
          </View>
        )}
        <Text style={styles.shareDate}>{formatDate(sharedNote.created_at)}</Text>
      </View>

      {/* Share Message */}
      {sharedNote.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.shareMessage}>"{sharedNote.message}"</Text>
        </View>
      )}

      {/* Wine Info */}
      <View style={styles.wineHeader}>
        <View style={styles.wineInfo}>
          {sharedNote.tasting_note?.wine?.image_url && (
            <Image 
              source={{ uri: sharedNote.tasting_note.wine.image_url }} 
              style={styles.wineImage} 
            />
          )}
          <View style={styles.wineDetails}>
            <Text style={styles.wineName}>
              {sharedNote.tasting_note?.wine?.name || 'Unknown Wine'}
            </Text>
            <Text style={styles.producer}>
              {sharedNote.tasting_note?.wine?.producer}
              {sharedNote.tasting_note?.wine?.vintage && 
                ` • ${sharedNote.tasting_note.wine.vintage}`}
            </Text>
            {sharedNote.tasting_note?.wine?.region && (
              <Text style={styles.region}>
                {sharedNote.tasting_note.wine.region}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Tasting Info */}
      <View style={styles.tastingInfo}>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>
            {formatRating(sharedNote.tasting_note?.rating)}
          </Text>
          {sharedNote.tasting_note?.tasting_date && (
            <Text style={styles.tastingDate}>
              Tasted {formatDate(sharedNote.tasting_note.tasting_date)}
            </Text>
          )}
        </View>

        {sharedNote.tasting_note?.is_blind_tasting && (
          <View style={styles.blindTastingBadge}>
            <Text style={styles.blindTastingText}>🙈 Blind Tasting</Text>
          </View>
        )}

        {sharedNote.tasting_note?.notes && (
          <Text style={styles.notes} numberOfLines={3}>
            {sharedNote.tasting_note.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export function SharedNotesList({
  filters = {},
  onNotePress,
  showUserInfo = true,
  headerComponent,
  listType = 'all',
  squadId,
  userId,
}: SharedNotesListProps) {
  const [sharedNotes, setSharedNotes] = useState<SharedTastingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const loadSharedNotes = async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (pageNum === 0) {
        setLoading(true)
      }

      let result

      switch (listType) {
        case 'public':
          result = await SharingService.getPublicSharedNotes(pageNum, 20)
          break
        case 'squad':
          if (!squadId) throw new Error('Squad ID required for squad shared notes')
          result = await SharingService.getSquadSharedNotes(squadId, pageNum, 20)
          break
        case 'user':
          result = await SharingService.getUserSharedNotes(userId, pageNum, 20)
          break
        default:
          result = await SharingService.getSharedTastingNotes(filters, pageNum, 20)
      }

      const { sharedNotes, totalCount: count, error } = result

      if (error) {
        setError(error)
        return
      }

      if (isRefresh || pageNum === 0) {
        setSharedNotes(sharedNotes)
      } else {
        setSharedNotes(prev => [...prev, ...sharedNotes])
      }

      setTotalCount(count)
      setHasMore(sharedNotes.length === 20)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared notes')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setPage(0)
    loadSharedNotes(0, true)
  }, [filters, listType, squadId, userId])

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadSharedNotes(nextPage)
    }
  }, [loading, hasMore, page])

  useEffect(() => {
    setPage(0)
    loadSharedNotes(0)
  }, [filters, listType, squadId, userId])

  const renderSharedNote = ({ item }: { item: SharedTastingNote }) => (
    <SharedNoteCard
      sharedNote={item}
      onPress={onNotePress}
      showUserInfo={showUserInfo}
    />
  )

  const renderEmpty = () => {
    if (loading) return null
    
    const getEmptyMessage = () => {
      switch (listType) {
        case 'public':
          return {
            title: 'No Public Shares',
            message: 'No one has shared tasting notes publicly yet. Be the first to share!',
          }
        case 'squad':
          return {
            title: 'No Squad Shares',
            message: 'No one in this squad has shared tasting notes yet. Start the conversation!',
          }
        case 'user':
          return {
            title: 'No Shared Notes',
            message: 'This user hasn\'t shared any tasting notes yet.',
          }
        default:
          return {
            title: 'No Shared Notes',
            message: 'No shared tasting notes found. Share your first tasting note to get started!',
          }
      }
    }

    const { title, message } = getEmptyMessage()
    
    return (
      <EmptyState
        title={title}
        message={message}
        iconName="wine-glass"
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
      
      {totalCount > 0 && (
        <Text style={styles.resultCount}>
          {totalCount === 1 ? '1 shared note' : `${totalCount} shared notes`}
        </Text>
      )}
    </View>
  )

  if (loading && sharedNotes.length === 0) {
    return <LoadingSpinner message="Loading shared notes..." />
  }

  if (error && sharedNotes.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadSharedNotes()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={sharedNotes}
      keyExtractor={(item) => item.id}
      renderItem={renderSharedNote}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={sharedNotes.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  noteCard: {
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
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  shareType: {
    fontSize: 12,
    color: '#6B7280',
  },
  shareDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  shareMessage: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  wineHeader: {
    marginBottom: 12,
  },
  wineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wineImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  wineDetails: {
    flex: 1,
  },
  wineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  producer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  region: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tastingInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  tastingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  blindTastingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  blindTastingText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '500',
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
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