import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'

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

interface UserProfileCardProps {
  profile: UserProfile
  isCurrentUser?: boolean
  onEdit?: () => void
  onMessage?: () => void
  onFollow?: () => void
  isFollowing?: boolean
  showStats?: boolean
}

export function UserProfileCard({
  profile,
  isCurrentUser = false,
  onEdit,
  onMessage,
  onFollow,
  isFollowing = false,
  showStats = true,
}: UserProfileCardProps) {
  const getEducationLabel = (education: string | null) => {
    switch (education) {
      case 'WSET':
        return 'WSET Certified'
      case 'CMS':
        return 'Court of Master Sommeliers'
      case 'ISG':
        return 'International Sommelier Guild'
      case 'OTHER':
        return 'Wine Educated'
      case 'NONE':
        return 'Wine Enthusiast'
      default:
        return 'Wine Lover'
    }
  }

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return `Joined ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    })}`
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {getInitials(profile.display_name)}
              </Text>
            </View>
          )}
          
          {profile.wine_education_background && (
            <View style={styles.educationBadge}>
              <Text style={styles.educationText}>
                {profile.wine_education_background}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>
            {profile.display_name || 'Anonymous Wine Lover'}
          </Text>
          
          <Text style={styles.educationLabel}>
            {getEducationLabel(profile.wine_education_background)}
          </Text>
          
          {profile.graduation_class && profile.graduation_year && (
            <Text style={styles.graduationInfo}>
              {profile.graduation_class} • Class of {profile.graduation_year}
            </Text>
          )}
          
          {profile.location && (
            <Text style={styles.location}>📍 {profile.location}</Text>
          )}
          
          <Text style={styles.joinDate}>
            {formatJoinDate(profile.created_at)}
          </Text>
        </View>
      </View>

      {profile.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      )}

      {showStats && (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {profile.total_tasting_notes || 0}
            </Text>
            <Text style={styles.statLabel}>Tasting Notes</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {profile.total_squads || 0}
            </Text>
            <Text style={styles.statLabel}>Squads</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {profile.average_rating ? profile.average_rating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      )}

      <View style={styles.actionButtons}>
        {isCurrentUser ? (
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={[
                styles.followButton, 
                isFollowing && styles.followingButton
              ]} 
              onPress={onFollow}
            >
              <Text style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultAvatar: {
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 24,
  },
  educationBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  educationText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  educationLabel: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
    marginBottom: 2,
  },
  graduationInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  bioSection: {
    marginBottom: 16,
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followingButtonText: {
    color: '#6B7280',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
})