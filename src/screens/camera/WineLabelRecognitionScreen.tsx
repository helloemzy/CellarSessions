import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/types'
import { WineRecognitionService, WineRecognitionResult } from '@/services/wineRecognition'
import { LabelRecognitionResult } from '@/components/camera/LabelRecognitionResult'

type WineLabelRecognitionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WineLabelRecognition'
>

type WineLabelRecognitionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WineLabelRecognition'
>

export default function WineLabelRecognitionScreen() {
  const navigation = useNavigation<WineLabelRecognitionScreenNavigationProp>()
  const route = useRoute<WineLabelRecognitionScreenProps['route']>()
  const { imageUri, onWineSelected } = route.params
  
  const [recognitionResult, setRecognitionResult] = useState<WineRecognitionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    recognizeLabel()
  }, [])

  const recognizeLabel = async () => {
    setLoading(true)
    setError(null)

    try {
      const { result, error: recognitionError } = await WineRecognitionService.recognizeWineLabel(imageUri)

      if (recognitionError || !result) {
        setError(recognitionError || 'Failed to recognize wine label')
        setLoading(false)
        return
      }

      setRecognitionResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (labelInfo: WineRecognitionResult) => {
    setProcessing(true)

    try {
      // Save the recognized wine to database
      const { wine, error: saveError } = await WineRecognitionService.saveRecognizedWine(
        labelInfo,
        imageUri
      )

      if (saveError) {
        Alert.alert('Save Error', `Failed to save wine: ${saveError}`)
        setProcessing(false)
        return
      }

      // Notify parent component and navigate back
      if (wine && onWineSelected) {
        onWineSelected(wine)
      }

      Alert.alert(
        'Wine Saved!',
        'The wine has been added to your cellar.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (err) {
      Alert.alert('Error', 'Failed to save wine. Please try again.')
      console.error('Failed to save wine:', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleRetry = () => {
    // Navigate back to camera
    navigation.goBack()
  }

  const handleManualEntry = () => {
    // Navigate to manual wine entry form
    navigation.navigate('ManualWineEntry', {
      initialData: recognitionResult ? {
        name: recognitionResult.wineName,
        producer: recognitionResult.producer,
        vintage: recognitionResult.vintage,
        region: recognitionResult.appellation,
        wineType: recognitionResult.wineType,
        grapeVariety: recognitionResult.grapeVariety,
        alcoholContent: recognitionResult.alcoholContent,
      } : undefined,
      imageUri,
      onWineSelected
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <View style={styles.loadingTextContainer}>
            <View style={styles.loadingTitle}>Analyzing wine label...</View>
            <View style={styles.loadingSubtitle}>
              Using AI to extract wine information
            </View>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>⚠️</View>
          <View style={styles.errorTitle}>Recognition Failed</View>
          <View style={styles.errorMessage}>{error}</View>
          
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
              <Text style={styles.secondaryButtonText}>📷 Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.primaryButton} onPress={handleManualEntry}>
              <Text style={styles.primaryButtonText}>✏️ Enter Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (!recognitionResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>❓</View>
          <View style={styles.errorTitle}>No Wine Information Found</View>
          <View style={styles.errorMessage}>
            We couldn't extract wine information from this image.
          </View>
          
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
              <Text style={styles.secondaryButtonText}>📷 Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.primaryButton} onPress={handleManualEntry}>
              <Text style={styles.primaryButtonText}>✏️ Enter Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LabelRecognitionResult
        imageUri={imageUri}
        labelInfo={recognitionResult}
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        onManualEntry={handleManualEntry}
        loading={processing}
      />
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
    padding: 32,
  },
  loadingTextContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
})