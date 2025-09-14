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
import { TastingNotesService, TastingNoteWithWine, TastingNoteFilters } from '@/services/api/tastingNotesService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { LikeCommentSystem } from '@/components/social/LikeCommentSystem'

interface TastingNotesListProps {
  filters?: TastingNoteFilters
  onNotePress?: (note: TastingNoteWithWine) => void
  onNoteEdit?: (note: TastingNoteWithWine) => void
  onNoteDelete?: (noteId: string) => void
  showUserInfo?: boolean
  allowDelete?: boolean
  showSocialFeatures?: boolean
  headerComponent?: React.ComponentType<any>
}

interface TastingNoteItemProps {
  note: TastingNoteWithWine
  onPress?: (note: TastingNoteWithWine) => void
  onEdit?: (note: TastingNoteWithWine) => void
  onDelete?: (noteId: string) => void
  showUserInfo?: boolean
  allowDelete?: boolean
  showSocialFeatures?: boolean
}

function TastingNoteItem({
  note,
  onPress,
  onEdit,
  onDelete,
  showUserInfo = false,
  allowDelete = false,
  showSocialFeatures = false,
}: TastingNoteItemProps) {
  const handleDelete = () => {
    if (!onDelete) return

    Alert.alert(
      'Delete Tasting Note',
      'Are you sure you want to delete this tasting note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(note.id),
        },
      ]
    )
  }

  const formatRating = (rating: number | null) => {
    if (!rating) return 'No rating'
    return `${rating}/5 ⭐`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <TouchableOpacity style={styles.noteCard} onPress={() => onPress?.(note)}>
      <View style={styles.noteHeader}>
        <View style={styles.wineInfo}>
          {note.wine?.image_url && (
            <Image source={{ uri: note.wine.image_url }} style={styles.wineImage} />
          )}
          <View style={styles.wineDetails}>
            <Text style={styles.wineName}>{note.wine?.name || 'Unknown Wine'}</Text>
            <Text style={styles.producer}>
              {note.wine?.producer}
              {note.wine?.vintage && ` • ${note.wine.vintage}`}
            </Text>
            {note.wine?.region && (
              <Text style={styles.region}>{note.wine.region}</Text>
            )}
          </View>
        </View>

        {showUserInfo && (
          <View style={styles.userInfo}>
            {note.user_profile?.avatar_url ? (
              <Image
                source={{ uri: note.user_profile.avatar_url }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={[styles.userAvatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>
                  {note.user_profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.userName}>{note.user_profile?.display_name || 'Anonymous'}</Text>
          </View>
        )}
      </View>

      <View style={styles.tastingInfo}>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>{formatRating(note.rating)}</Text>
          <Text style={styles.tastingDate}>{formatDate(note.tasting_date)}</Text>
        </View>

        {note.is_blind_tasting && (
          <View style={styles.blindTastingBadge}>
            <Text style={styles.blindTastingText}>🙈 Blind Tasting</Text>
          </View>
        )}

        <View style={styles.visibilityRow}>
          <Text style={[
            styles.visibility,
            note.visibility === 'PRIVATE' && styles.privateVisibility,
            note.visibility === 'SQUAD' && styles.squadVisibility,
            note.visibility === 'PUBLIC' && styles.publicVisibility,
          ]}>
            {note.visibility?.toLowerCase() || 'private'}
          </Text>
        </View>

        {note.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {note.notes}
          </Text>
        )}
      </View>

      {(onEdit || allowDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.editButton} onPress={() => onEdit(note)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          {allowDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Social Features */}
      {showSocialFeatures && (
        <LikeCommentSystem
          tastingNoteId={note.id}
          onEngagementChange={(likeCount, commentCount) => {
            // Could update local state or trigger callbacks here
            console.log(`Note ${note.id} now has ${likeCount} likes and ${commentCount} comments`)
          }}
        />
      )}
    </TouchableOpacity>
  )
}

export function TastingNotesList({
  filters = {},
  onNotePress,
  onNoteEdit,
  onNoteDelete,
  showUserInfo = false,
  allowDelete = false,
  showSocialFeatures = false,
  headerComponent,
}: TastingNotesListProps) {
  const [notes, setNotes] = useState<TastingNoteWithWine[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const loadTastingNotes = async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (pageNum === 0) {
        setLoading(true)
      }

      const { tastingNotes, totalCount: count, error } = await TastingNotesService.getTastingNotes(
        filters,
        pageNum,
        20
      )

      if (error) {
        setError(error)
        return
      }

      if (isRefresh || pageNum === 0) {
        setNotes(tastingNotes)
      } else {
        setNotes(prev => [...prev, ...tastingNotes])
      }

      setTotalCount(count)
      setHasMore(tastingNotes.length === 20) // Assume more if we got a full page
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasting notes')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setPage(0)
    loadTastingNotes(0, true)
  }, [filters])

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadTastingNotes(nextPage)
    }
  }, [loading, hasMore, page])

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await TastingNotesService.deleteTastingNote(noteId)
      if (error) {
        Alert.alert('Error', `Failed to delete tasting note: ${error}`)
        return
      }

      // Remove note from local state
      setNotes(prev => prev.filter(note => note.id !== noteId))
      setTotalCount(prev => Math.max(0, prev - 1))

      // Call parent callback if provided
      onNoteDelete?.(noteId)
    } catch (err) {
      Alert.alert('Error', 'Failed to delete tasting note')
    }
  }

  useEffect(() => {
    loadTastingNotes()
  }, [filters])

  const renderTastingNote = ({ item }: { item: TastingNoteWithWine }) => (
    <TastingNoteItem
      note={item}
      onPress={onNotePress}
      onEdit={onNoteEdit}
      onDelete={handleDeleteNote}
      showUserInfo={showUserInfo}
      allowDelete={allowDelete}
      showSocialFeatures={showSocialFeatures}
    />
  )

  const renderEmpty = () => {
    if (loading) return null
    
    return (
      <EmptyState
        title="No Tasting Notes"
        message="Start your wine journey by creating your first tasting note!"
        iconName="wine-glass"
        actionText="Create Tasting Note"
        onActionPress={() => {
          // Navigate to create tasting note
        }}
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

  if (loading && notes.length === 0) {
    return <LoadingSpinner message="Loading tasting notes..." />
  }

  if (error && notes.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTastingNotes()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      renderItem={renderTastingNote}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={headerComponent}
      contentContainerStyle={notes.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  wineInfo: {
    flex: 1,
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
  userInfo: {
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 14,
  },
  userName: {
    fontSize: 10,
    color: '#6B7280',
  },
  tastingInfo: {
    marginBottom: 12,
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
  visibilityRow: {
    marginBottom: 8,
  },
  visibility: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  privateVisibility: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  squadVisibility: {
    backgroundColor: '#DBEAFE',
    color: '#2563EB',
  },
  publicVisibility: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
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