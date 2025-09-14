import { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '@/navigation/types'
import { recognizeWineLabel, WineRecognitionResult } from '@/services/wineRecognition'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

interface UseCameraReturn {
  isProcessing: boolean
  recognitionResult: WineRecognitionResult | null
  captureWineLabel: () => void
  captureCellarImage: () => void
  captureTastingImage: () => void
  processWineImage: (imageUri: string) => Promise<void>
  clearResults: () => void
}

export function useCamera(): UseCameraReturn {
  const navigation = useNavigation<NavigationProp>()
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognitionResult, setRecognitionResult] = useState<WineRecognitionResult | null>(null)

  const captureWineLabel = () => {
    navigation.navigate('CameraCapture', {
      type: 'wine',
      onCapture: processWineImage
    })
  }

  const captureCellarImage = () => {
    navigation.navigate('CameraCapture', {
      type: 'cellar',
      onCapture: (imageUri: string) => {
        // Handle cellar image capture
        console.log('Cellar image captured:', imageUri)
      }
    })
  }

  const captureTastingImage = () => {
    navigation.navigate('CameraCapture', {
      type: 'tasting',
      onCapture: (imageUri: string) => {
        // Handle tasting image capture
        console.log('Tasting image captured:', imageUri)
      }
    })
  }

  const processWineImage = async (imageUri: string) => {
    setIsProcessing(true)
    setRecognitionResult(null)

    try {
      const result = await recognizeWineLabel(imageUri)
      setRecognitionResult(result)
    } catch (error) {
      console.error('Error processing wine image:', error)
      setRecognitionResult({
        success: false,
        error: 'Failed to process image'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearResults = () => {
    setRecognitionResult(null)
    setIsProcessing(false)
  }

  return {
    isProcessing,
    recognitionResult,
    captureWineLabel,
    captureCellarImage,
    captureTastingImage,
    processWineImage,
    clearResults
  }
}