import React, { useState } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { ActivityItem } from '@/services/api/activity'

type ActivityFeedScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'ActivityFeed'
>

export default function ActivityFeedScreen() {
  const navigation = useNavigation<ActivityFeedScreenNavigationProp>()
  const [feedType, setFeedType] = useState<'personalized' | 'public'>('personalized')

  const handleActivityPress = (activity: ActivityItem) => {
    // Navigate to appropriate detail screen based on activity type
    switch (activity.type) {
      case 'TASTING_NOTE':
        if (activity.tasting_note?.id) {
          navigation.navigate('TastingNoteDetail', { noteId: activity.tasting_note.id })
        }
        break
      case 'SHARED_NOTE':
        if (activity.shared_note?.tasting_note?.id) {
          navigation.navigate('TastingNoteDetail', { 
            noteId: activity.shared_note.tasting_note.id 
          })
        }
        break
      case 'SQUAD_CREATE':
      case 'SQUAD_JOIN':
        if (activity.squad?.id) {
          navigation.navigate('SquadDetail', { squadId: activity.squad.id })
        }
        break
    }
  }

  const HeaderComponent = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Activity Feed</Text>
      <Text style={styles.subtitle}>
        Stay connected with your wine community
      </Text>
      
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterTab, feedType === 'personalized' && styles.activeTab]}
          onPress={() => setFeedType('personalized')}
        >
          <Text style={[styles.filterTabText, feedType === 'personalized' && styles.activeTabText]}>
            🏠 For You
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterTab, feedType === 'public' && styles.activeTab]}
          onPress={() => setFeedType('public')}
        >
          <Text style={[styles.filterTabText, feedType === 'public' && styles.activeTabText]}>
            🌍 Public
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {feedType === 'personalized' 
            ? '🍷 Your personalized feed shows activity from your squads and wine community'
            : '🌍 Discover what wine lovers around the world are tasting and sharing'
          }
        </Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ActivityFeed
        feedType={feedType}
        onActivityPress={handleActivityPress}
        headerComponent={HeaderComponent}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
})