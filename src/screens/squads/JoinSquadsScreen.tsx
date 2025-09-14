import React, { useState } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { SquadsList } from '@/components/squads/SquadsList'
import { Squad } from '@/services/api/squads'

type JoinSquadsScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'JoinSquads'
>

export default function JoinSquadsScreen() {
  const navigation = useNavigation<JoinSquadsScreenNavigationProp>()

  const handleSquadPress = (squad: Squad) => {
    navigation.navigate('SquadDetail', { squadId: squad.id })
  }

  const handleJoinSquad = (squadId: string) => {
    // Refresh the list after joining
    // The SquadsList component will handle the join logic
  }

  const HeaderComponent = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Discover Squads</Text>
      <Text style={styles.subtitle}>
        Find and join wine communities that match your interests
      </Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔍 <Text style={styles.infoBold}>Search</Text> for squads by name or description
        </Text>
        <Text style={styles.infoText}>
          🍷 <Text style={styles.infoBold}>Join public squads</Text> instantly to connect with fellow wine lovers
        </Text>
        <Text style={styles.infoText}>
          🎓 <Text style={styles.infoBold}>Find your classmates</Text> from wine school programs
        </Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <SquadsList
        onSquadPress={handleSquadPress}
        onJoinSquad={handleJoinSquad}
        showSearch={true}
        showJoinButton={true}
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
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '600',
  },
})