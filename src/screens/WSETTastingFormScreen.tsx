import React, { useState } from 'react'
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '@/navigation/types'
import { WSETTastingForm } from '@/components/tasting'
import { WSETTastingFormData } from '@/types/wsetForm'
import { TastingNotesService } from '@/services/api/tastingNotesService'
import { COLORS } from '@/constants'

interface WSETTastingFormScreenProps {
  onClose?: () => void
  initialData?: Partial<WSETTastingFormData>
}

export function WSETTastingFormScreen({ 
  onClose, 
  initialData 
}: WSETTastingFormScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Get route params for edit mode
  const editMode = route.params?.editMode || false
  const tastingNoteId = route.params?.tastingNoteId

  const handleSubmit = async (data: WSETTastingFormData) => {
    setIsSubmitting(true)
    
    try {
      if (editMode && tastingNoteId) {
        // Update existing tasting note
        const { error } = await TastingNotesService.updateTastingNote(tastingNoteId, {
          wine_id: data.wineId,
          tasting_date: data.tastingDate,
          location: data.location,
          visibility: data.visibility,
          is_blind_tasting: data.isBlindTasting,
          
          // WSET Appearance
          appearance_intensity: data.appearance?.intensity,
          appearance_color: data.appearance?.color,
          appearance_rim_variation: data.appearance?.rimVariation,
          appearance_clarity: data.appearance?.clarity,
          appearance_notes: data.appearance?.notes,
          
          // WSET Nose
          nose_intensity: data.nose?.intensity,
          nose_aroma_characteristics: data.nose?.aromaCharacteristics,
          nose_development: data.nose?.development,
          nose_notes: data.nose?.notes,
          
          // WSET Palate
          palate_sweetness: data.palate?.sweetness,
          palate_acidity: data.palate?.acidity,
          palate_tannin: data.palate?.tannin,
          palate_alcohol: data.palate?.alcohol,
          palate_body: data.palate?.body,
          palate_flavor_intensity: data.palate?.flavorIntensity,
          palate_flavor_characteristics: data.palate?.flavorCharacteristics,
          palate_finish: data.palate?.finish,
          palate_notes: data.palate?.notes,
          
          // WSET Conclusion
          quality_level: data.conclusion?.qualityLevel,
          readiness_for_drinking: data.conclusion?.readinessForDrinking,
          ageing_potential: data.conclusion?.ageingPotential,
          overall_notes: data.conclusion?.overallNotes,
          rating: data.conclusion?.rating,
        })

        if (error) {
          Alert.alert('Error', 'Failed to update tasting note: ' + error)
          return
        }

        Alert.alert('Success!', 'Tasting note updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ])
      } else {
        // Create new tasting note
        const { tastingNote, error } = await TastingNotesService.createTastingNote({
          wine_id: data.wineId,
          tasting_date: data.tastingDate,
          location: data.location,
          visibility: data.visibility,
          is_blind_tasting: data.isBlindTasting,
          
          // WSET Appearance
          appearance_intensity: data.appearance?.intensity,
          appearance_color: data.appearance?.color,
          appearance_rim_variation: data.appearance?.rimVariation,
          appearance_clarity: data.appearance?.clarity,
          appearance_notes: data.appearance?.notes,
          
          // WSET Nose
          nose_intensity: data.nose?.intensity,
          nose_aroma_characteristics: data.nose?.aromaCharacteristics,
          nose_development: data.nose?.development,
          nose_notes: data.nose?.notes,
          
          // WSET Palate
          palate_sweetness: data.palate?.sweetness,
          palate_acidity: data.palate?.acidity,
          palate_tannin: data.palate?.tannin,
          palate_alcohol: data.palate?.alcohol,
          palate_body: data.palate?.body,
          palate_flavor_intensity: data.palate?.flavorIntensity,
          palate_flavor_characteristics: data.palate?.flavorCharacteristics,
          palate_finish: data.palate?.finish,
          palate_notes: data.palate?.notes,
          
          // WSET Conclusion
          quality_level: data.conclusion?.qualityLevel,
          readiness_for_drinking: data.conclusion?.readinessForDrinking,
          ageing_potential: data.conclusion?.ageingPotential,
          overall_notes: data.conclusion?.overallNotes,
          rating: data.conclusion?.rating,
        })

        if (error) {
          Alert.alert('Error', 'Failed to save tasting note: ' + error)
          return
        }

        Alert.alert('Success!', 'Tasting note saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ])
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async (data: WSETTastingFormData) => {
    setIsSaving(true)
    
    try {
      // Save as draft (same logic as submit but potentially different visibility or status)
      const draftData = {
        ...data,
        visibility: 'PRIVATE' as const, // Drafts are always private
      }
      
      await handleSubmit(draftData)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <WSETTastingForm
        onSubmit={handleSubmit}
        onSave={handleSave}
        onClose={onClose}
        initialData={initialData}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
})