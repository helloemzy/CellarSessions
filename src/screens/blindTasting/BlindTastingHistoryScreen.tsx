import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { BlindTastingResultCard } from '@/components/blindTasting/BlindTastingResultCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BlindTastingService, BlindTastingResult, BlindTastingStats } from '@/services/api/blindTasting'

type BlindTastingHistoryScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'BlindTastingHistory'
>

interface StatsCardProps {
  stats: BlindTastingStats
  onViewDetails?: () => void
}

function StatsCard({ stats, onViewDetails }: StatsCardProps) {
  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 80) return '#059669'
    if (accuracy >= 60) return '#F59E0B'
    return '#EF4444'
  }

  const getPerformanceLabel = (accuracy: number) => {
    if (accuracy >= 90) return 'Master Level'
    if (accuracy >= 80) return 'Expert Level'
    if (accuracy >= 70) return 'Advanced'
    if (accuracy >= 60) return 'Intermediate'
    if (accuracy >= 50) return 'Novice'
    return 'Learning'
  }

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>Your Blind Tasting Performance</Text>
        <TouchableOpacity onPress={onViewDetails}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total_attempts}</Text>
          <Text style={styles.statLabel}>Total Attempts</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[
            styles.statNumber,
            { color: getPerformanceColor(stats.average_accuracy) }
          ]}>
            {stats.average_accuracy}%
          </Text>
          <Text style={styles.statLabel}>Avg Accuracy</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.rank_percentile}%</Text>
          <Text style={styles.statLabel}>Percentile</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[
            styles.performanceLabel,
            { color: getPerformanceColor(stats.average_accuracy) }
          ]}>
            {getPerformanceLabel(stats.average_accuracy)}
          </Text>
        </View>
      </View>

      {stats.strengths.length > 0 && (
        <View style={styles.strengthsSection}>
          <Text style={styles.strengthsTitle}>💪 Your Strengths</Text>
          <Text style={styles.strengthsList}>
            {stats.strengths.slice(0, 3).join(' • ')}
          </Text>
        </View>
      )}

      {stats.areas_for_improvement.length > 0 && (
        <View style={styles.improvementSection}>
          <Text style={styles.improvementTitle}>🎯 Areas to Improve</Text>
          <Text style={styles.improvementList}>
            {stats.areas_for_improvement.slice(0, 3).join(' • ')}
          </Text>
        </View>
      )}
    </View>
  )
}

export default function BlindTastingHistoryScreen() {
  const navigation = useNavigation<BlindTastingHistoryScreenNavigationProp>()
  
  const [results, setResults] = useState<BlindTastingResult[]>([])
  const [stats, setStats] = useState<BlindTastingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadData = async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (pageNum === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      // Load results and stats in parallel
      const [resultsResponse, statsResponse] = await Promise.all([
        BlindTastingService.getBlindTastingResults(undefined, pageNum, 10),
        pageNum === 0 ? BlindTastingService.getBlindTastingStats() : Promise.resolve({ stats: null, error: null })
      ])

      if (resultsResponse.error) {
        Alert.alert('Error', `Failed to load results: ${resultsResponse.error}`)
        return
      }

      if (statsResponse.error) {
        Alert.alert('Error', `Failed to load stats: ${statsResponse.error}`)
        return
      }

      if (isRefresh || pageNum === 0) {
        setResults(resultsResponse.results)
        if (statsResponse.stats) {
          setStats(statsResponse.stats)
        }
      } else {
        setResults(prev => [...prev, ...resultsResponse.results])
      }

      setHasMore(resultsResponse.results.length === 10)
      setPage(pageNum)
    } catch (error) {
      Alert.alert('Error', 'Failed to load blind tasting history')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    loadData(0, true)
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(page + 1)
    }
  }

  const handleResultPress = (result: BlindTastingResult) => {
    navigation.navigate('BlindTastingResult', { resultId: result.id })
  }

  const handleViewStatsDetails = () => {
    navigation.navigate('BlindTastingStats')
  }

  const handleStartNewBlindTasting = () => {
    navigation.navigate('TastingForm', { blindTasting: true })
  }

  const renderResult = ({ item }: { item: BlindTastingResult }) => (
    <BlindTastingResultCard
      result={item}
      onPress={handleResultPress}
      showComparison={false}
    />
  )

  const renderHeader = () => (
    <View>
      {stats && (
        <StatsCard
          stats={stats}
          onViewDetails={handleViewStatsDetails}
        />
      )}
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Results</Text>
        <TouchableOpacity 
          style={styles.newTastingButton}
          onPress={handleStartNewBlindTasting}
        >
          <Text style={styles.newTastingButtonText}>+ New Blind Tasting</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderFooter = () => {
    if (!hasMore) return null
    
    return (
      <View style={styles.loadMoreContainer}>
        {loadingMore ? (
          <LoadingSpinner message="Loading more results..." />
        ) : (
          <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderEmpty = () => {
    if (loading) return null
    
    return (
      <EmptyState
        title="No Blind Tastings Yet"
        message="Start building your palate accuracy with systematic blind tasting practice!"
        iconName="wine-glass-outline"
        actionText="Start First Blind Tasting"
        onActionPress={handleStartNewBlindTasting}
      />
    )
  }

  if (loading && results.length === 0) {
    return <LoadingSpinner message="Loading your blind tasting history..." />
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  strengthsSection: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  strengthsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  strengthsList: {
    fontSize: 12,
    color: '#047857',
  },
  improvementSection: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  improvementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  improvementList: {
    fontSize: 12,
    color: '#D97706',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  newTastingButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newTastingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
})