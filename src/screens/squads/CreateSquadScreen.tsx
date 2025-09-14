import React from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { CreateSquadForm } from '@/components/forms/CreateSquadForm'

type CreateSquadScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'CreateSquad'
>

export default function CreateSquadScreen() {
  const navigation = useNavigation<CreateSquadScreenNavigationProp>()

  const handleSuccess = (squadId: string) => {
    // Navigate to the newly created squad detail
    navigation.replace('SquadDetail', { squadId })
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.container}>
      <CreateSquadForm 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
})