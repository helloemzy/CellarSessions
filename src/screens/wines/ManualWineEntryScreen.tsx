import React from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/types'
import { ManualWineEntryForm, WineFormData } from '@/components/forms/ManualWineEntryForm'
import { wineService } from '@/services/api/wine'
import { Alert } from 'react-native'

type ManualWineEntryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManualWineEntry'
>

export default function ManualWineEntryScreen() {
  const navigation = useNavigation<ManualWineEntryScreenNavigationProp>()

  const handleWineAdded = async (wineData: WineFormData) => {
    try {
      // Add wine to database
      const newWine = await wineService.createWine({
        ...wineData,
        // Add any additional fields needed for database
        is_verified: false, // Manual entries are unverified
        source: 'MANUAL_ENTRY',
      })

      Alert.alert(
        'Wine Added Successfully!',
        `${wineData.name} has been added to your wine collection.`,
        [
          {
            text: 'Add Another',
            style: 'default',
            onPress: () => {
              // Stay on the same screen to add another wine
            },
          },
          {
            text: 'Start Tasting',
            style: 'default',
            onPress: () => {
              navigation.navigate('WSETForm', { 
                wineId: newWine.id,
                editMode: false 
              })
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error adding wine:', error)
      throw error // Re-throw to let the form handle the error display
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  return (
    <ManualWineEntryForm
      onWineAdded={handleWineAdded}
      onCancel={handleCancel}
    />
  )
}