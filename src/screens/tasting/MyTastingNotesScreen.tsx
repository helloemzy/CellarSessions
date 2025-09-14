import React, { useState } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { TastingNotesList } from '@/components/tasting/TastingNotesList'
import { TastingNoteWithWine, TastingNoteFilters } from '@/services/api/tastingNotesService'
import { useAuthStore } from '@/stores/auth/authStore'

type MyTastingNotesScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'MyTastingNotes'
>

export default function MyTastingNotesScreen() {
  const navigation = useNavigation<MyTastingNotesScreenNavigationProp>()
  const { user } = useAuthStore()
  
  const [filters, setFilters] = useState<TastingNoteFilters>({
    userId: user?.id,
  })

  const handleNotePress = (note: TastingNoteWithWine) => {
    // Navigate to detail view (we'll implement this later)
    console.log('View tasting note:', note.id)
  }

  const handleNoteEdit = (note: TastingNoteWithWine) => {
    // @ts-ignore - Need to fix navigation types
    navigation.navigate('WSETForm', { 
      tastingNoteId: note.id,
      editMode: true,
      initialData: {
        wineId: note.wine_id,
        tastingDate: note.tasting_date,
        location: note.location,
        visibility: note.visibility,
        isBlindTasting: note.is_blind_tasting,
      }
    })
  }

  const handleNoteDelete = (noteId: string) => {
    // Note is already deleted from the list by the TastingNotesList component
    console.log('Tasting note deleted:', noteId)
  }

  const handleCreateNote = () => {
    // @ts-ignore - Need to fix navigation types
    navigation.navigate('WSETForm', { 
      editMode: false
    })
  }

  const HeaderComponent = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>My Tasting Notes</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
          <Text style={styles.createButtonText}>+ New Note</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterChip, !filters.visibility && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, visibility: undefined }))}
        >
          <Text style={[styles.filterText, !filters.visibility && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.visibility === 'PRIVATE' && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, visibility: 'PRIVATE' }))}
        >
          <Text style={[styles.filterText, filters.visibility === 'PRIVATE' && styles.activeFilterText]}>
            Private
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.visibility === 'SQUAD' && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, visibility: 'SQUAD' }))}
        >
          <Text style={[styles.filterText, filters.visibility === 'SQUAD' && styles.activeFilterText]}>
            Squad
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.visibility === 'PUBLIC' && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ ...prev, visibility: 'PUBLIC' }))}
        >
          <Text style={[styles.filterText, filters.visibility === 'PUBLIC' && styles.activeFilterText]}>
            Public
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, filters.isBlindTasting === true && styles.activeFilter]}
          onPress={() => setFilters(prev => ({ 
            ...prev, 
            isBlindTasting: prev.isBlindTasting === true ? undefined : true 
          }))}
        >
          <Text style={[styles.filterText, filters.isBlindTasting === true && styles.activeFilterText]}>
            🙈 Blind
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <TastingNotesList
        filters={filters}
        onNotePress={handleNotePress}
        onNoteEdit={handleNoteEdit}
        onNoteDelete={handleNoteDelete}
        allowDelete={true}
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
})