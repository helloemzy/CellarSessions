import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTrendingTastingNotes } from '@/hooks/useSocialInteractions'
import { TastingNotesList } from '@/components/tasting/TastingNotesList'
import { formatDistanceToNow } from 'date-fns'

interface TrendingScreenProps {
  onTastingNotePress?: (noteId: string) => void
}

interface TrendingStatsProps {
  stats: {
    totalNotes: number
    averageEngagement: number
    topWineTypes: string[]
  }
}

function TrendingStats({ stats }: TrendingStatsProps) {
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>🔥 Community Highlights</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalNotes}</Text>
          <Text style={styles.statLabel}>Trending Notes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.averageEngagement}</Text>
          <Text style={styles.statLabel}>Avg. Engagement</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.topWineTypes.length}</Text>
          <Text style={styles.statLabel}>Wine Types</Text>
        </View>
      </View>
      {stats.topWineTypes.length > 0 && (
        <View style={styles.wineTypesContainer}>
          <Text style={styles.wineTypesLabel}>Popular This Week:</Text>
          <View style={styles.wineTypesList}>
            {stats.topWineTypes.slice(0, 3).map((type, index) => (
              <View key={index} style={styles.wineTypeBadge}>
                <Text style={styles.wineTypeText}>{type}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

export function TrendingScreen({ onTastingNotePress }: TrendingScreenProps) {
  const { 
    trendingNotes, 
    isLoading, 
    error, 
    refreshTrending 
  } = useTrendingTastingNotes(20)
  
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week')

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshTrending()
    setRefreshing(false)
  }, [refreshTrending])

  const handleTastingNotePress = (note: any) => {
    onTastingNotePress?.(note.id)
  }

  // Calculate stats from trending notes
  const stats = {
    totalNotes: trendingNotes.length,
    averageEngagement: trendingNotes.length > 0 
      ? Math.round(trendingNotes.reduce((sum, note) => sum + note.engagement_score, 0) / trendingNotes.length)
      : 0,
    topWineTypes: [...new Set(trendingNotes.map(note => note.wine_name?.split(' ')[0] || 'Red').slice(0, 5))]
  }

  const TrendingHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Trending Tasting Notes</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={isLoading}>
          <Ionicons 
            name="refresh" 
            size={24} 
            color={isLoading ? "#9CA3AF" : "#7C3AED"} 
          />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>
        Discover what the wine community is talking about
      </Text>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {(['day', 'week', 'month'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Section */}
      {trendingNotes.length > 0 && (
        <TrendingStats stats={stats} />
      )}
    </View>
  )

  if (isLoading && trendingNotes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Finding trending notes...</Text>
      </View>
    )
  }

  if (error && trendingNotes.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Unable to Load Trending Notes</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (trendingNotes.length === 0) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <TrendingHeader />
        <View style={styles.emptyState}>
          <Ionicons name="trending-up" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Trending Notes Yet</Text>
          <Text style={styles.emptyText}>
            Be the first to share a tasting note and start the conversation!
          </Text>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.createButtonText}>Create Tasting Note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // Convert trending notes to the format expected by TastingNotesList
  const formattedNotes = trendingNotes.map(note => ({
    id: note.id || note.tasting_note_id,
    wine: {
      name: note.wine_name,
      producer: 'Unknown Producer', // Add if available in your data
      vintage: null,
      region: null,
      image_url: null
    },
    rating: note.rating,
    tasting_date: note.created_at,
    created_at: note.created_at,
    is_blind_tasting: false,
    visibility: 'PUBLIC' as const,
    notes: `🔥 ${note.engagement_score} engagement score • ${note.like_count} likes • ${note.comment_count} comments`,
    user_profile: {
      display_name: note.display_name,
      avatar_url: note.avatar_url,
      wine_education_background: null
    },
    user_id: note.user_id,
    wine_id: null,
    location: null,
    food_pairing: null,
    serving_temperature: null,
    appearance: null,
    nose: null,
    palate: null,
    finish: null,
    overall_impression: null,
    metadata: {}
  }))

  return (
    <View style={styles.container}>
      <TastingNotesList
        filters={{}}
        onNotePress={handleTastingNotePress}
        showUserInfo={true}
        showSocialFeatures={true}
        headerComponent={TrendingHeader}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#7C3AED',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C3AED',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  wineTypesContainer: {
    marginTop: 8,
  },
  wineTypesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  wineTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wineTypeBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wineTypeText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})