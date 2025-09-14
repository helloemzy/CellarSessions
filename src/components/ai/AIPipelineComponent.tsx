import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  Image,
  Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { AIProcessingPipeline, CameraToAIResult, AIProcessingStep, AIProcessingInput } from '@/services/aiPipeline'
import { VoiceNoteRecorder } from '@/components/voice/VoiceNoteRecorder'
import { useAuthStore } from '@/store/authStore'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface AIPipelineComponentProps {
  onComplete: (result: CameraToAIResult) => void
  onCancel: () => void
  initialImageUri?: string
  wineContext?: {
    name?: string
    producer?: string
    vintage?: number
    wineType?: string
    grapeVariety?: string[]
  }
}

export function AIPipelineComponent({
  onComplete,
  onCancel,
  initialImageUri,
  wineContext
}: AIPipelineComponentProps) {
  const navigation = useNavigation()
  const { user } = useAuthStore()
  
  // State
  const [currentStep, setCurrentStep] = useState<'capture' | 'voice' | 'processing' | 'results'>('capture')
  const [imageUri, setImageUri] = useState<string | null>(initialImageUri || null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [processingSteps, setProcessingSteps] = useState<AIProcessingStep[]>([])
  const [processingResult, setProcessingResult] = useState<CameraToAIResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Start processing pipeline
  const startProcessing = async () => {
    if (!imageUri && !audioUri) {
      Alert.alert('No Input', 'Please capture an image or record voice notes before processing.')
      return
    }

    setIsProcessing(true)
    setCurrentStep('processing')

    // Animate progress
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start()

    try {
      const input: AIProcessingInput = {
        imageUri: imageUri || undefined,
        audioUri: audioUri || undefined,
        wineContext
      }

      const result = await AIProcessingPipeline.processCameraToAI(
        input,
        {
          enableWineRecognition: !!imageUri,
          enableVoiceTranscription: !!audioUri,
          enableWineAnalysis: true,
          enableFormSuggestion: true,
          cacheResults: true
        },
        (steps) => {
          setProcessingSteps([...steps])
          
          // Update progress animation
          const completedSteps = steps.filter(s => s.status === 'completed').length
          const progress = completedSteps / steps.length
          Animated.timing(progressAnim, {
            toValue: progress,
            duration: 500,
            useNativeDriver: false
          }).start()
        }
      )

      setProcessingResult(result)
      setCurrentStep('results')
      pulseAnim.stopAnimation()

    } catch (error) {
      console.error('AI Pipeline failed:', error)
      Alert.alert(
        'Processing Failed',
        'Something went wrong during AI processing. Please try again.',
        [
          { text: 'OK', onPress: () => setCurrentStep('capture') }
        ]
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Capture image
  const captureImage = () => {
    navigation.navigate('CameraCapture' as never, {
      type: 'wine',
      onCapture: (uri: string) => {
        setImageUri(uri)
      }
    } as never)
  }

  // Start voice recording
  const startVoiceRecording = () => {
    setShowVoiceRecorder(true)
  }

  // Handle voice transcription complete
  const handleVoiceComplete = (transcription: string, uri: string) => {
    setAudioUri(uri)
    setShowVoiceRecorder(false)
  }

  // Save tasting note
  const saveTastingNote = async () => {
    if (!processingResult || !user) return

    try {
      const { tastingNote, error } = await AIProcessingPipeline.createTastingNoteFromAI(
        processingResult,
        user.id
      )

      if (error) {
        Alert.alert('Save Failed', error)
        return
      }

      Alert.alert(
        'Saved Successfully',
        'Your AI-enhanced tasting note has been saved!',
        [
          { text: 'OK', onPress: () => onComplete(processingResult) }
        ]
      )

    } catch (error) {
      Alert.alert('Save Failed', 'Failed to save your tasting note.')
    }
  }

  // Get step icon
  const getStepIcon = (step: AIProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
      case 'failed':
        return <Ionicons name="close-circle" size={24} color={COLORS.ERROR} />
      case 'processing':
        return <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons name="hourglass" size={24} color={COLORS.PRIMARY} />
        </Animated.View>
      default:
        return <Ionicons name="ellipse-outline" size={24} color={COLORS.GRAY_400} />
    }
  }

  // Render capture step
  const renderCaptureStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Capture Wine Information</Text>
      <Text style={styles.stepSubtitle}>
        Take a photo of the wine label and/or record your tasting notes
      </Text>

      {/* Image Capture */}
      <View style={styles.captureSection}>
        <Text style={styles.sectionLabel}>Wine Label Photo</Text>
        {imageUri ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.retakeButton} onPress={captureImage}>
              <Ionicons name="camera" size={20} color={COLORS.WHITE} />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
            <Ionicons name="camera" size={40} color={COLORS.PRIMARY} />
            <Text style={styles.captureButtonText}>Capture Wine Label</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Voice Recording */}
      <View style={styles.captureSection}>
        <Text style={styles.sectionLabel}>Voice Notes (Optional)</Text>
        {audioUri ? (
          <View style={styles.audioPreview}>
            <Ionicons name="mic" size={24} color={COLORS.SUCCESS} />
            <Text style={styles.audioPreviewText}>Voice notes recorded</Text>
            <TouchableOpacity style={styles.rerecordButton} onPress={startVoiceRecording}>
              <Text style={styles.rerecordButtonText}>Re-record</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.voiceButton} onPress={startVoiceRecording}>
            <Ionicons name="mic" size={32} color={COLORS.WHITE} />
            <Text style={styles.voiceButtonText}>Record Tasting Notes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.processButton, (!imageUri && !audioUri) && styles.processButtonDisabled]}
          onPress={startProcessing}
          disabled={!imageUri && !audioUri}
        >
          <Ionicons name="flash" size={20} color={COLORS.WHITE} />
          <Text style={styles.processButtonText}>Process with AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // Render processing step
  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>AI Processing</Text>
      <Text style={styles.stepSubtitle}>
        Analyzing your wine data with artificial intelligence
      </Text>

      {/* Overall Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]}
          />
        </View>
      </View>

      {/* Processing Steps */}
      <View style={styles.stepsContainer}>
        {processingSteps.map((step, index) => (
          <View key={step.id} style={styles.processingStep}>
            {getStepIcon(step)}
            <View style={styles.stepInfo}>
              <Text style={styles.stepName}>{step.name}</Text>
              {step.error && (
                <Text style={styles.stepError}>{step.error}</Text>
              )}
              {step.duration && step.status === 'completed' && (
                <Text style={styles.stepDuration}>{step.duration}ms</Text>
              )}
            </View>
            <Text style={styles.stepProgress}>{step.progress}%</Text>
          </View>
        ))}
      </View>
    </View>
  )

  // Render results step
  const renderResultsStep = () => {
    if (!processingResult) return null

    return (
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.stepTitle}>AI Analysis Complete</Text>
        
        {/* Confidence Score */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>
            Overall Confidence: {processingResult.confidence}%
          </Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                { width: `${Math.min(processingResult.confidence, 100)}%` }
              ]}
            />
          </View>
        </View>

        {/* Wine Recognition Results */}
        {processingResult.wineRecognition && (
          <View style={styles.resultSection}>
            <Text style={styles.resultSectionTitle}>Wine Recognition</Text>
            {processingResult.wineRecognition.wineName && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Wine:</Text>
                <Text style={styles.resultValue}>{processingResult.wineRecognition.wineName}</Text>
              </View>
            )}
            {processingResult.wineRecognition.producer && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Producer:</Text>
                <Text style={styles.resultValue}>{processingResult.wineRecognition.producer}</Text>
              </View>
            )}
            {processingResult.wineRecognition.vintage && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Vintage:</Text>
                <Text style={styles.resultValue}>{processingResult.wineRecognition.vintage}</Text>
              </View>
            )}
          </View>
        )}

        {/* Voice Transcription Results */}
        {processingResult.voiceTranscription && (
          <View style={styles.resultSection}>
            <Text style={styles.resultSectionTitle}>Your Tasting Notes</Text>
            <Text style={styles.transcriptionText}>
              {processingResult.voiceTranscription.text}
            </Text>
          </View>
        )}

        {/* Wine Analysis Results */}
        {processingResult.wineAnalysis && (
          <View style={styles.resultSection}>
            <Text style={styles.resultSectionTitle}>AI Wine Analysis</Text>
            
            {processingResult.wineAnalysis.wineAnalysis.appearance && (
              <View style={styles.analysisCategory}>
                <Text style={styles.categoryTitle}>Appearance</Text>
                <Text style={styles.categoryText}>
                  {processingResult.wineAnalysis.wineAnalysis.appearance.color} • {' '}
                  {processingResult.wineAnalysis.wineAnalysis.appearance.intensity}
                </Text>
              </View>
            )}

            {processingResult.wineAnalysis.wineAnalysis.nose && (
              <View style={styles.analysisCategory}>
                <Text style={styles.categoryTitle}>Nose</Text>
                <Text style={styles.categoryText}>
                  Intensity: {processingResult.wineAnalysis.wineAnalysis.nose.intensity}
                </Text>
                {processingResult.wineAnalysis.wineAnalysis.nose.aromas && (
                  <Text style={styles.categoryText}>
                    Aromas: {processingResult.wineAnalysis.wineAnalysis.nose.aromas.join(', ')}
                  </Text>
                )}
              </View>
            )}

            {processingResult.wineAnalysis.wineAnalysis.palate && (
              <View style={styles.analysisCategory}>
                <Text style={styles.categoryTitle}>Palate</Text>
                <Text style={styles.categoryText}>
                  {processingResult.wineAnalysis.wineAnalysis.palate.sweetness} • {' '}
                  {processingResult.wineAnalysis.wineAnalysis.palate.acidity} acidity • {' '}
                  {processingResult.wineAnalysis.wineAnalysis.palate.body} body
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.resultsActions}>
          <TouchableOpacity style={styles.newAnalysisButton} onPress={() => {
            setCurrentStep('capture')
            setImageUri(null)
            setAudioUri(null)
            setProcessingResult(null)
            setProcessingSteps([])
          }}>
            <Text style={styles.newAnalysisButtonText}>New Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveTastingButton} onPress={saveTastingNote}>
            <Ionicons name="save" size={20} color={COLORS.WHITE} />
            <Text style={styles.saveTastingButtonText}>Save Tasting Note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.GRAY_700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Wine Analysis</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {currentStep === 'capture' && renderCaptureStep()}
      {currentStep === 'processing' && renderProcessingStep()}
      {currentStep === 'results' && renderResultsStep()}

      {/* Voice Recorder Modal */}
      <Modal visible={showVoiceRecorder} animationType="slide" presentationStyle="pageSheet">
        <VoiceNoteRecorder
          onTranscriptionComplete={handleVoiceComplete}
          onCancel={() => setShowVoiceRecorder(false)}
          wineContext={wineContext}
        />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
  },
  placeholder: {
    width: 40,
  },
  stepContainer: {
    flex: 1,
    padding: SPACING.BASE,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  stepSubtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    textAlign: 'center',
    marginBottom: SPACING.XL,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.RELAXED,
  },
  captureSection: {
    marginBottom: SPACING.XL,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
  },
  captureButton: {
    alignItems: 'center',
    padding: SPACING.XL,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.BASE,
    borderStyle: 'dashed',
  },
  captureButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.PRIMARY,
    marginTop: SPACING.SM,
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.BASE,
    marginBottom: SPACING.SM,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.BASE,
  },
  retakeButtonText: {
    color: COLORS.WHITE,
    marginLeft: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  voiceButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    marginLeft: SPACING.SM,
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.BASE,
    backgroundColor: COLORS.SUCCESS_LIGHT,
    borderRadius: BORDER_RADIUS.BASE,
  },
  audioPreviewText: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.SUCCESS,
    marginLeft: SPACING.SM,
  },
  rerecordButton: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  rerecordButtonText: {
    color: COLORS.SUCCESS,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  cancelButton: {
    flex: 0.4,
    paddingVertical: SPACING.BASE,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.GRAY_300,
    borderRadius: BORDER_RADIUS.BASE,
  },
  cancelButtonText: {
    color: COLORS.GRAY_700,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  processButton: {
    flex: 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  processButtonDisabled: {
    backgroundColor: COLORS.GRAY_400,
  },
  processButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    marginLeft: SPACING.SM,
  },
  progressContainer: {
    marginBottom: SPACING.XL,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.GRAY_200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
  },
  stepsContainer: {
    flex: 1,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_100,
  },
  stepInfo: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  stepName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
  },
  stepError: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
  stepDuration: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.GRAY_500,
    marginTop: SPACING.XS,
  },
  stepProgress: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_600,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  resultsContainer: {
    flex: 1,
    padding: SPACING.BASE,
  },
  confidenceContainer: {
    marginBottom: SPACING.XL,
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: COLORS.GRAY_200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: COLORS.SUCCESS,
  },
  resultSection: {
    marginBottom: SPACING.XL,
    padding: SPACING.BASE,
    backgroundColor: COLORS.GRAY_50,
    borderRadius: BORDER_RADIUS.BASE,
  },
  resultSectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: SPACING.SM,
  },
  resultLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_700,
    width: 80,
  },
  resultValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    flex: 1,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  transcriptionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.RELAXED,
    fontStyle: 'italic',
  },
  analysisCategory: {
    marginBottom: SPACING.BASE,
  },
  categoryTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  categoryText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.RELAXED,
  },
  resultsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.XL,
  },
  newAnalysisButton: {
    flex: 0.4,
    paddingVertical: SPACING.BASE,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.BASE,
  },
  newAnalysisButtonText: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  saveTastingButton: {
    flex: 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  saveTastingButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    marginLeft: SPACING.SM,
  },
})