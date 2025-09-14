import React, { useState } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { SquadsList } from '@/components/squads/SquadsList'
import { SquadWithMembers, SquadFilters } from '@/services/api/squadsService'
import { useAuthStore } from '@/stores/auth/authStore'

type MySquadsScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'MySquads'
>

export default function MySquadsScreen() {
  const navigation = useNavigation<MySquadsScreenNavigationProp>()
  const { user } = useAuthStore()
  
  const [filters, setFilters] = useState<SquadFilters>({})

  const handleSquadPress = (squad: SquadWithMembers) => {
    navigation.navigate('SquadDetail', { squadId: squad.id })
  }

  const handleCreateSquad = () => {
    navigation.navigate('CreateSquad')
  }

  const handleJoinSquads = () => {
    navigation.navigate('JoinSquads')
  }

  const HeaderComponent = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>My Squads</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinSquads}>
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateSquad}>
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterChip, !filters.userRole && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, userRole: undefined }))}
        >
          <Text style={[styles.filterText, !filters.userRole && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.userRole === 'ADMIN' && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, userRole: 'ADMIN' }))}
        >
          <Text style={[styles.filterText, filters.userRole === 'ADMIN' && styles.activeFilterText]}>
            👑 Admin
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.userRole === 'MODERATOR' && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, userRole: 'MODERATOR' }))}
        >
          <Text style={[styles.filterText, filters.userRole === 'MODERATOR' && styles.activeFilterText]}>
            🛡️ Mod
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.userRole === 'MEMBER' && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, userRole: 'MEMBER' }))}
        >
          <Text style={[styles.filterText, filters.userRole === 'MEMBER' && styles.activeFilterText]}>
            👥 Member
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.isPrivate === true && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ 
            ...prev, 
            isPrivate: prev.isPrivate === true ? undefined : true 
          }))}
        >
          <Text style={[styles.filterText, filters.isPrivate === true && styles.activeFilterText]}>
            🔒 Private
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🍷 Connect with your wine school classmates and fellow enthusiasts in dedicated squads
        </Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <SquadsList
        filters={filters}
        onSquadPress={handleSquadPress}
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
    paddingVertical: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  createButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilter: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
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