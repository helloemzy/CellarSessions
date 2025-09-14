import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Image,
  TextInput
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GoogleVisionIntegration, GoogleVisionTestResult } from '@/services/api/googleVisionIntegration'
import { WineRecognitionResult } from '@/services/wineRecognition'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'

interface TestProgress {
  step: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  duration?: number
}

export function GoogleVisionTestComponent() {
  const navigation = useNavigation()
  const [testResult, setTestResult] = useState<GoogleVisionTestResult | null>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testProgress, setTestProgress] = useState<TestProgress[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [recognitionResult, setRecognitionResult] = useState<WineRecognitionResult | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [usageStats, setUsageStats] = useState<any>(null)
  const [testImageUri, setTestImageUri] = useState<string>('')

  useEffect(() => {
    loadUsageStats()
  }, [])

  const loadUsageStats = async () => {
    try {
      const stats = await GoogleVisionIntegration.getUsageStats()
      setUsageStats(stats)
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    }
  }

  const runIntegrationTest = async () => {
    setIsRunningTest(true)
    setTestProgress([])
    
    const steps = [
      { step: 'Configuration Check', status: 'pending' as const },
      { step: 'API Connectivity', status: 'pending' as const },
      { step: 'Image Processing', status: 'pending' as const },
      { step: 'Performance Test', status: 'pending' as const },
      { step: 'Cache System', status: 'pending' as const }
    ]
    
    setTestProgress(steps)

    try {
      // Simulate progress updates
      for (let i = 0; i < steps.length; i++) {
        const updatedSteps = [...steps]
        updatedSteps[i] = { ...updatedSteps[i], status: 'running' }
        setTestProgress(updatedSteps)
        
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const result = await GoogleVisionIntegration.runIntegrationTest()
      setTestResult(result)

      // Update final progress
      const finalSteps = steps.map((step, index) => ({
        ...step,
        status: result.errors.length === 0 ? 'completed' : 
                index < 2 ? 'completed' : 'failed' as const
      }))
      setTestProgress(finalSteps)

    } catch (error) {
      Alert.alert('Test Failed', 'Integration test encountered an error')
      const failedSteps = steps.map(step => ({ ...step, status: 'failed' as const }))
      setTestProgress(failedSteps)
    } finally {
      setIsRunningTest(false)
      await loadUsageStats()
    }
  }

  const selectImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to photo library')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri)
        setRecognitionResult(null)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image')
    }
  }

  const captureImageFromCamera = () => {
    navigation.navigate('CameraCapture' as never, {
      type: 'wine',
      onCapture: (imageUri: string) => {
        setSelectedImage(imageUri)
        setRecognitionResult(null)
      }
    } as never)
  }

  const recognizeSelectedImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or capture an image first')
      return
    }

    setIsRecognizing(true)
    try {
      const result = await GoogleVisionIntegration.recognizeWineLabelEnhanced(selectedImage, {
        useCache: true,
        maxRetries: 2
      })

      if (result.result) {
        setRecognitionResult(result.result)
      } else {
        Alert.alert('Recognition Failed', result.error || 'Unable to recognize wine label')
      }
    } catch (error) {
      Alert.alert('Error', 'Recognition process failed')
    } finally {
      setIsRecognizing(false)
      await loadUsageStats()
    }
  }

  const testWithSampleImage = async () => {
    if (!testImageUri.trim()) {
      Alert.alert('No URL', 'Please enter a test image URL')
      return
    }

    setIsRecognizing(true)
    try {
      const result = await GoogleVisionIntegration.recognizeWineLabelEnhanced(testImageUri, {
        useCache: false,
        maxRetries: 1
      })

      if (result.result) {
        setRecognitionResult(result.result)
        setSelectedImage(testImageUri)
      } else {
        Alert.alert('Recognition Failed', result.error || 'Unable to process test image')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process test image')
    } finally {
      setIsRecognizing(false)
    }
  }

  const getStatusIcon = (status: TestProgress['status']) => {
    switch (status) {
      case 'completed': return <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} />
      case 'failed': return <Ionicons name="close-circle" size={20} color={COLORS.ERROR} />
      case 'running': return <ActivityIndicator size="small" color={COLORS.PRIMARY} />
      default: return <Ionicons name="ellipse-outline" size={20} color={COLORS.GRAY_400} />
    }
  }

  const getResultColor = (isGood: boolean) => isGood ? COLORS.SUCCESS : COLORS.ERROR

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Google Vision API Test</Text>
        <Text style={styles.subtitle}>Validate wine recognition integration</Text>
      </View>

      {/* Integration Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Integration Test</Text>
        
        <TouchableOpacity
          style={[styles.button, isRunningTest && styles.buttonDisabled]}
          onPress={runIntegrationTest}
          disabled={isRunningTest}
        >
          <Text style={styles.buttonText}>
            {isRunningTest ? 'Running Tests...' : 'Run Integration Test'}
          </Text>
        </TouchableOpacity>

        {/* Test Progress */}
        {testProgress.length > 0 && (
          <View style={styles.progressContainer}>
            {testProgress.map((progress, index) => (
              <View key={index} style={styles.progressItem}>
                {getStatusIcon(progress.status)}
                <Text style={styles.progressText}>{progress.step}</Text>
                {progress.duration && (
                  <Text style={styles.progressDuration}>{progress.duration}ms</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Test Results */}
        {testResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Configuration:</Text>
              <Text style={[styles.resultValue, { color: getResultColor(testResult.isConfigured) }]}>
                {testResult.isConfigured ? 'Valid' : 'Invalid'}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>API Connection:</Text>
              <Text style={[styles.resultValue, { color: getResultColor(testResult.isConnected) }]}>
                {testResult.isConnected ? 'Connected' : 'Failed'}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Image Processing:</Text>
              <Text style={[styles.resultValue, { color: getResultColor(testResult.canProcessImages) }]}>
                {testResult.canProcessImages ? 'Working' : 'Failed'}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Response Time:</Text>
              <Text style={styles.resultValue}>{testResult.responseTimeMs}ms</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Recognition Accuracy:</Text>
              <Text style={styles.resultValue}>{testResult.recognitionAccuracy}%</Text>
            </View>

            {/* Errors and Warnings */}
            {testResult.errors.length > 0 && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Errors:</Text>
                {testResult.errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
                ))}
              </View>
            )}

            {testResult.warnings.length > 0 && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningTitle}>Warnings:</Text>
                {testResult.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningText}>• {warning}</Text>
                ))}
              </View>
            )}

            {testResult.recommendations.length > 0 && (
              <View style={styles.recommendationContainer}>
                <Text style={styles.recommendationTitle}>Recommendations:</Text>
                {testResult.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Wine Recognition Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wine Label Recognition Test</Text>
        
        {/* Image Selection */}
        <View style={styles.imageSection}>
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.imageButton} onPress={selectImageFromGallery}>
              <Ionicons name="images" size={20} color={COLORS.WHITE} />
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imageButton} onPress={captureImageFromCamera}>
              <Ionicons name="camera" size={20} color={COLORS.WHITE} />
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Test URL Input */}
          <View style={styles.urlSection}>
            <Text style={styles.urlLabel}>Or test with URL:</Text>
            <TextInput
              style={styles.urlInput}
              placeholder="https://example.com/wine-label.jpg"
              placeholderTextColor={COLORS.GRAY_400}
              value={testImageUri}
              onChangeText={setTestImageUri}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={[styles.urlButton, !testImageUri.trim() && styles.buttonDisabled]}
              onPress={testWithSampleImage}
              disabled={!testImageUri.trim() || isRecognizing}
            >
              <Text style={styles.urlButtonText}>Test URL</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity
                style={[styles.recognizeButton, isRecognizing && styles.buttonDisabled]}
                onPress={recognizeSelectedImage}
                disabled={isRecognizing}
              >
                <Text style={styles.recognizeButtonText}>
                  {isRecognizing ? 'Recognizing...' : 'Analyze Wine Label'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recognition Results */}
        {recognitionResult && (
          <View style={styles.recognitionResults}>
            <Text style={styles.recognitionTitle}>Recognition Results</Text>
            <View style={styles.confidenceBar}>
              <Text style={styles.confidenceLabel}>Confidence: {recognitionResult.confidence}%</Text>
              <View style={styles.confidenceBarTrack}>
                <View 
                  style={[
                    styles.confidenceBarFill, 
                    { width: `${Math.min(recognitionResult.confidence, 100)}%` }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.wineInfo}>
              {recognitionResult.wineName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Wine Name:</Text>
                  <Text style={styles.infoValue}>{recognitionResult.wineName}</Text>
                </View>
              )}
              
              {recognitionResult.producer && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Producer:</Text>
                  <Text style={styles.infoValue}>{recognitionResult.producer}</Text>
                </View>
              )}
              
              {recognitionResult.vintage && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vintage:</Text>
                  <Text style={styles.infoValue}>{recognitionResult.vintage}</Text>
                </View>
              )}
              
              {recognitionResult.wineType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type:</Text>
                  <Text style={styles.infoValue}>{recognitionResult.wineType}</Text>
                </View>
              )}
              
              {recognitionResult.grapeVariety && recognitionResult.grapeVariety.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Grapes:</Text>
                  <Text style={styles.infoValue}>{recognitionResult.grapeVariety.join(', ')}</Text>
                </View>
              )}
              
              {recognitionResult.appellation && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Region:</Text>
                  <Text style={styles.infoValue}>{recognitionResult.appellation}</Text>
                </View>
              )}
            </View>

            {/* Suggestions */}
            {recognitionResult.suggestedCorrections && recognitionResult.suggestedCorrections.length > 0 && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                {recognitionResult.suggestedCorrections.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Usage Statistics */}
      {usageStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{usageStats.requestsToday}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{usageStats.requestsThisMonth}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{usageStats.averageResponseTime}ms</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{usageStats.successRate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  content: {
    padding: SPACING.BASE,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE['2XL'],
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.XL,
    padding: SPACING.BASE,
    backgroundColor: COLORS.GRAY_50,
    borderRadius: BORDER_RADIUS.BASE,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
    marginBottom: SPACING.BASE,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.BASE,
    paddingHorizontal: SPACING.XL,
    borderRadius: BORDER_RADIUS.BASE,
    alignItems: 'center',
    marginBottom: SPACING.BASE,
  },
  buttonDisabled: {
    backgroundColor: COLORS.GRAY_400,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  progressContainer: {
    marginTop: SPACING.BASE,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  progressText: {
    marginLeft: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    flex: 1,
  },
  progressDuration: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_600,
  },
  resultsContainer: {
    marginTop: SPACING.BASE,
    padding: SPACING.BASE,
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  resultsTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
    marginBottom: SPACING.BASE,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.SM,
  },
  resultLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_700,
  },
  resultValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.BLACK,
  },
  errorContainer: {
    marginTop: SPACING.BASE,
    padding: SPACING.SM,
    backgroundColor: COLORS.ERROR_LIGHT,
    borderRadius: BORDER_RADIUS.SM,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.ERROR,
    marginBottom: SPACING.SM,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginBottom: SPACING.XS,
  },
  warningContainer: {
    marginTop: SPACING.BASE,
    padding: SPACING.SM,
    backgroundColor: COLORS.WARNING_LIGHT,
    borderRadius: BORDER_RADIUS.SM,
  },
  warningTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.WARNING,
    marginBottom: SPACING.SM,
  },
  warningText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.WARNING,
    marginBottom: SPACING.XS,
  },
  recommendationContainer: {
    marginTop: SPACING.BASE,
    padding: SPACING.SM,
    backgroundColor: COLORS.INFO_LIGHT,
    borderRadius: BORDER_RADIUS.SM,
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.INFO,
    marginBottom: SPACING.SM,
  },
  recommendationText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.INFO,
    marginBottom: SPACING.XS,
  },
  imageSection: {
    marginBottom: SPACING.BASE,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.BASE,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  imageButtonText: {
    color: COLORS.WHITE,
    marginLeft: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  urlSection: {
    marginBottom: SPACING.BASE,
  },
  urlLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_300,
    borderRadius: BORDER_RADIUS.BASE,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
  },
  urlButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
    alignItems: 'center',
  },
  urlButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.BASE,
    marginBottom: SPACING.BASE,
  },
  recognizeButton: {
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: SPACING.BASE,
    paddingHorizontal: SPACING.XL,
    borderRadius: BORDER_RADIUS.BASE,
  },
  recognizeButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  recognitionResults: {
    marginTop: SPACING.BASE,
    padding: SPACING.BASE,
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  recognitionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.BLACK,
    marginBottom: SPACING.BASE,
  },
  confidenceBar: {
    marginBottom: SPACING.BASE,
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    marginBottom: SPACING.SM,
  },
  confidenceBarTrack: {
    height: 8,
    backgroundColor: COLORS.GRAY_200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: COLORS.SUCCESS,
  },
  wineInfo: {
    marginBottom: SPACING.BASE,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.SM,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_700,
    width: 100,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.BLACK,
    flex: 1,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  suggestions: {
    marginTop: SPACING.BASE,
    padding: SPACING.SM,
    backgroundColor: COLORS.INFO_LIGHT,
    borderRadius: BORDER_RADIUS.SM,
  },
  suggestionsTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.INFO,
    marginBottom: SPACING.SM,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.INFO,
    marginBottom: SPACING.XS,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.BASE,
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.BASE,
    marginBottom: SPACING.SM,
  },
  statValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_600,
    marginTop: SPACING.XS,
  },
})