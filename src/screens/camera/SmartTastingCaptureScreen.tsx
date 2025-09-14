import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/types'
import { Ionicons } from '@expo/vector-icons'

import { VoiceNoteRecorder } from '@/components/voice/VoiceNoteRecorder'
import { VoiceNoteEditor } from '@/components/voice/VoiceNoteEditor'
import { LabelRecognitionResult } from '@/components/camera/LabelRecognitionResult'
import { WineRecognitionService } from '@/services/wineRecognition'
import { useCamera } from '@/hooks/useCamera'

type SmartTastingCaptureScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SmartTastingCapture'
>

type SmartTastingCaptureScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SmartTastingCapture'
>

type CaptureMode = 'camera' | 'voice' | 'processing' | 'results'

interface CaptureData {
  wineImageUri?: string
  voiceTranscription?: string
  voiceAudioUri?: string
  recognitionResult?: any
  voiceAnalysis?: any
}

export default function SmartTastingCaptureScreen() {
  const navigation = useNavigation<SmartTastingCaptureScreenNavigationProp>()
  const route = useRoute<SmartTastingCaptureScreenProps['route']>()
  const { onComplete } = route.params || {}
  
  const [mode, setMode] = useState<CaptureMode>('camera')
  const [captureData, setCaptureData] = useState<CaptureData>({})
  const [processing, setProcessing] = useState(false)
  
  // Camera integration
  const {
    cameraView,
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
    takePicture,
    isReady: isCameraReady,
  } = useCamera('wine')

  const handleWineImageCaptured = async (imageUri: string) => {
    setCaptureData(prev => ({ ...prev, wineImageUri: imageUri }))
    setMode('processing')
    setProcessing(true)

    try {
      // Analyze the wine label
      const { result, error } = await WineRecognitionService.recognizeWineLabel(imageUri)
      
      if (error) {
        Alert.alert('Recognition Error', error)
        setMode('camera')
        setProcessing(false)
        return
      }

      setCaptureData(prev => ({ 
        ...prev, 
        recognitionResult: result 
      }))

      // Move to voice recording mode with wine context
      setMode('voice')
      setProcessing(false)

    } catch (error) {
      console.error('Wine recognition error:', error)
      Alert.alert('Error', 'Failed to analyze wine label. Please try again.')
      setMode('camera')
      setProcessing(false)
    }
  }

  const handleVoiceTranscriptionComplete = (transcription: string, audioUri: string) => {
    setCaptureData(prev => ({
      ...prev,
      voiceTranscription: transcription,
      voiceAudioUri: audioUri,
    }))
    setMode('results')
  }

  const handleVoiceNotesComplete = (editedText: string, analysis?: any) => {
    setCaptureData(prev => ({
      ...prev,
      voiceTranscription: editedText,
      voiceAnalysis: analysis,
    }))
    
    // Complete the smart capture with all collected data
    completeCapture()
  }

  const completeCapture = () => {
    const completeData = {
      wineData: captureData.recognitionResult,
      voiceNotes: captureData.voiceTranscription,
      voiceAnalysis: captureData.voiceAnalysis,
      wineImageUri: captureData.wineImageUri,
      audioUri: captureData.voiceAudioUri,
    }

    if (onComplete) {
      onComplete(completeData)
    }

    navigation.goBack()
  }

  const handleSkipVoiceNotes = () => {
    setCaptureData(prev => ({
      ...prev,
      voiceTranscription: '',
      voiceAnalysis: null,
    }))
    completeCapture()
  }

  const handleRetakePhoto = () => {
    setCaptureData(prev => ({ 
      ...prev, 
      wineImageUri: undefined, 
      recognitionResult: undefined 
    }))
    setMode('camera')
  }

  const handleCancelVoiceRecording = () => {
    if (captureData.recognitionResult) {
      // If we have wine data, show results
      setMode('results')
    } else {
      // Go back to camera
      setMode('camera')
    }
  }

  const renderCameraMode = () => {
    if (!hasCameraPermission) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#6B7280" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionMessage}>
            We need camera access to capture wine labels and create smart tasting notes.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.cameraContainer}>
        {cameraView}
        
        <View style={styles.cameraOverlay}>
          {/* Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Smart Wine Capture</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>📸 Step 1: Capture Wine Label</Text>
            <Text style={styles.instructionsText}>
              Position the wine label clearly in the frame for AI recognition
            </Text>
          </View>

          {/* Wine label guide */}
          <View style={styles.labelGuide}>
            <View style={styles.guideBorder} />
            <Text style={styles.guideText}>Wine Label</Text>
          </View>

          {/* Capture Button */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]}
              onPress={async () => {
                const imageUri = await takePicture()
                if (imageUri) {
                  handleWineImageCaptured(imageUri)
                }
              }}
              disabled={!isCameraReady}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const renderProcessingMode = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingContent}>
        <View style={styles.processingIcon}>🤖</View>
        <Text style={styles.processingTitle}>Analyzing Wine Label</Text>
        <Text style={styles.processingMessage}>
          Using AI to extract wine information from your photo...
        </Text>
        <View style={styles.processingSteps}>
          <Text style={styles.processingStep}>✓ Photo captured</Text>
          <Text style={styles.processingStep}>🔍 Extracting text with Google Vision</Text>
          <Text style={styles.processingStep}>⚡ Parsing wine information</Text>
        </View>
      </View>
    </View>
  )

  const renderVoiceMode = () => {
    if (captureData.voiceTranscription && captureData.voiceAudioUri) {
      // Show voice editor
      return (
        <VoiceNoteEditor
          transcription={captureData.voiceTranscription}
          audioUri={captureData.voiceAudioUri}
          onSave={handleVoiceNotesComplete}
          onCancel={handleCancelVoiceRecording}
          wineContext={captureData.recognitionResult ? {
            name: captureData.recognitionResult.wineName,
            producer: captureData.recognitionResult.producer,
            vintage: captureData.recognitionResult.vintage,
            wineType: captureData.recognitionResult.wineType,
            grapeVariety: captureData.recognitionResult.grapeVariety,
          } : undefined}
        />
      )
    }

    // Show voice recorder
    return (
      <View style={styles.voiceContainer}>
        <View style={styles.voiceHeader}>
          <Text style={styles.voiceTitle}>🎤 Step 2: Record Tasting Notes</Text>
          <Text style={styles.voiceSubtitle}>
            Add your voice notes for AI analysis
          </Text>
        </View>

        <VoiceNoteRecorder
          onTranscriptionComplete={handleVoiceTranscriptionComplete}
          onCancel={handleCancelVoiceRecording}
          maxDuration={300}
          wineContext={captureData.recognitionResult ? {
            name: captureData.recognitionResult.wineName,
            producer: captureData.recognitionResult.producer,
            vintage: captureData.recognitionResult.vintage,
            wineType: captureData.recognitionResult.wineType,
            grapeVariety: captureData.recognitionResult.grapeVariety,
          } : undefined}
        />

        <View style={styles.voiceActions}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipVoiceNotes}>
            <Text style={styles.skipButtonText}>Skip Voice Notes</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderResultsMode = () => {
    if (!captureData.recognitionResult || !captureData.wineImageUri) return null

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>✨ Smart Capture Complete</Text>
          <Text style={styles.resultsSubtitle}>
            Review your AI-enhanced wine data
          </Text>
        </View>

        <LabelRecognitionResult
          imageUri={captureData.wineImageUri}
          labelInfo={captureData.recognitionResult}
          onConfirm={() => completeCapture()}
          onRetry={handleRetakePhoto}
          onManualEntry={() => {
            // Navigate to manual entry with pre-filled data
            navigation.navigate('ManualWineEntry', {
              initialData: captureData.recognitionResult,
              imageUri: captureData.wineImageUri,
              voiceNotes: captureData.voiceTranscription,
              voiceAnalysis: captureData.voiceAnalysis,
              onWineSelected: onComplete
            })
          }}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {mode === 'camera' && renderCameraMode()}
      {mode === 'processing' && renderProcessingMode()}
      {mode === 'voice' && renderVoiceMode()}
      {mode === 'results' && renderResultsMode()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 20,
  },
  labelGuide: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  guideBorder: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  guideText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  cameraControls: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#7C3AED',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  processingMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  processingSteps: {
    alignItems: 'flex-start',
  },
  processingStep: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  voiceContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  voiceHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  voiceSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  voiceActions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  resultsHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
})