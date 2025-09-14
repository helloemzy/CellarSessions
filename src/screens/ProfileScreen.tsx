import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/stores/auth/authStore'
import { UserProfileCard } from '@/components/profile/UserProfileCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { supabase } from '@/services/api/supabase'

type ProfileScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Profile'>

interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  wine_education_background: string | null
  graduation_class: string | null
  graduation_year: number | null
  created_at: string
  total_tasting_notes?: number
  total_squads?: number
  average_rating?: number
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>()
  const { user, signOut } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          avatar_url,
          bio,
          location,
          wine_education_background,
          graduation_class,
          graduation_year,
          created_at
        `)
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        Alert.alert('Error', 'Failed to load profile information')
        return
      }

      // Fetch additional stats
      const [tastingNotesResult, squadsResult] = await Promise.all([
        supabase
          .from('tasting_notes')
          .select('rating')
          .eq('user_id', user.id),
        supabase
          .from('squad_members')
          .select('squad_id')
          .eq('user_id', user.id)
      ])

      const totalTastingNotes = tastingNotesResult.data?.length || 0
      const totalSquads = squadsResult.data?.length || 0
      const averageRating = tastingNotesResult.data && tastingNotesResult.data.length > 0
        ? tastingNotesResult.data.reduce((sum, note) => sum + (note.rating || 0), 0) / tastingNotesResult.data.length
        : undefined

      setProfile({
        ...data,
        total_tasting_notes: totalTastingNotes,
        total_squads: totalSquads,
        average_rating: averageRating,
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      Alert.alert('Error', 'Failed to load profile information')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const onRefresh = () => {
    setIsRefreshing(true)
    fetchProfile()
  }

  const handleEditProfile = () => {
    navigation.navigate('EditProfile')
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut()
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          },
        },
      ]
    )
  }

  useFocusEffect(
    useCallback(() => {
      fetchProfile()
    }, [user])
  )

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <UserProfileCard
          profile={profile}
          isCurrentUser={true}
          onEdit={handleEditProfile}
          showStats={true}
        />

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyTastingNotes')}
          >
            <Text style={styles.actionButtonText}>My Tasting Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MySquads')}
          >
            <Text style={styles.actionButtonText}>My Squads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('TastingHistory')}
          >
            <Text style={styles.actionButtonText}>Tasting History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  quickActions: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
})