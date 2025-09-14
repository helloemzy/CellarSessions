import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native'
import { Audio } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'
import { OpenAIService } from '@/services/api/openai'

interface VoiceNoteRecorderProps {
  onTranscriptionComplete: (transcription: string, audioUri: string) => void
  onCancel: () => void
  maxDuration?: number // in seconds
  wineContext?: {
    name?: string
    producer?: string
    vintage?: number
    wineType?: string
    grapeVariety?: string[]
  }
}

export function VoiceNoteRecorder({
  onTranscriptionComplete,
  onCancel,
  maxDuration = 300, // 5 minutes default
  wineContext,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [permissionResponse, requestPermission] = Audio.usePermissions()
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const waveAnim = useRef(new Animated.Value(0)).current
  
  // Recording timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()

      // Start wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start()
    } else {
      pulseAnim.setValue(1)
      waveAnim.setValue(0)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const permission = await requestPermission()
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow microphone access to record voice notes.')
          return
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      })

      setRecording(recording)
      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)

    } catch (error) {
      console.error('Failed to start recording:', error)
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.')
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    try {
      setIsRecording(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      })

      const uri = recording.getURI()
      setRecording(null)

      if (uri) {
        await transcribeAudio(uri)
      } else {
        Alert.alert('Error', 'Failed to save recording. Please try again.')
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      Alert.alert('Error', 'Failed to stop recording. Please try again.')
    }
  }

  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true)

    try {
      // Transcribe using OpenAI Whisper
      const { result, error } = await OpenAIService.transcribeAudio(audioUri)

      if (error || !result) {
        Alert.alert('Transcription Failed', error || 'Failed to transcribe audio. Please try again.')
        setIsTranscribing(false)
        return
      }

      // Improve transcription for wine terminology
      const { result: improvedText, error: improvementError } = 
        await OpenAIService.improveWineTranscription(result.text)

      const finalTranscription = improvedText || result.text

      setIsTranscribing(false)
      onTranscriptionComplete(finalTranscription, audioUri)

    } catch (error) {
      console.error('Transcription error:', error)
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.')
      setIsTranscribing(false)
    }
  }

  const cancelRecording = async () => {
    if (recording && isRecording) {
      try {
        await recording.stopAndUnloadAsync()
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        })
      } catch (error) {
        console.error('Error canceling recording:', error)
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setIsRecording(false)
    setRecording(null)
    setRecordingDuration(0)
    onCancel()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getRemainingTime = () => {
    const remaining = maxDuration - recordingDuration
    return Math.max(0, remaining)
  }

  const getRecordingPrompt = () => {
    if (wineContext?.name) {
      return `Recording notes for ${wineContext.name}...`
    }
    return 'Recording your wine tasting notes...'
  }

  if (isTranscribing) {
    return (
      <View style={styles.container}>
        <View style={styles.transcribingContainer}>
          <View style={styles.transcribingIcon}>🎤</View>
          <Text style={styles.transcribingTitle}>Transcribing Your Notes</Text>
          <Text style={styles.transcribingSubtitle}>
            Converting speech to text using AI...
          </Text>
          <View style={styles.transcribingProgress}>
            <Animated.View style={[styles.progressBar, { opacity: waveAnim }]} />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Notes</Text>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Recording Interface */}
      <View style={styles.recordingContainer}>
        {isRecording && (
          <Text style={styles.recordingPrompt}>{getRecordingPrompt()}</Text>
        )}

        {/* Visual feedback */}
        <View style={styles.visualContainer}>
          {isRecording && (
            <>
              {/* Sound waves */}
              <View style={styles.soundWaves}>
                {[...Array(5)].map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.soundWave,
                      {
                        transform: [{
                          scaleY: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1 + (index * 0.1)],
                          })
                        }],
                        opacity: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        })
                      }
                    ]}
                  />
                ))}
              </View>
              
              {/* Recording duration */}
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
                <Text style={styles.remainingText}>
                  {getRemainingTime() > 0 && `${formatDuration(getRemainingTime())} left`}
                </Text>
              </View>
            </>
          )}

          {!isRecording && (
            <View style={styles.readyContainer}>
              <Text style={styles.readyTitle}>Ready to Record</Text>
              <Text style={styles.readySubtitle}>
                Tap the microphone to start recording your tasting notes
              </Text>
            </View>
          )}
        </View>

        {/* Record Button */}
        <Animated.View style={[styles.recordButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording ? styles.recordButtonActive : styles.recordButtonInactive
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Instructions */}
        <View style={styles.instructions}>
          {!isRecording && (
            <>
              <Text style={styles.instructionTitle}>Recording Tips:</Text>
              <Text style={styles.instructionText}>• Speak clearly and at normal pace</Text>
              <Text style={styles.instructionText}>• Include appearance, nose, and palate</Text>
              <Text style={styles.instructionText}>• Use wine terminology when possible</Text>
              <Text style={styles.instructionText}>• Maximum {Math.floor(maxDuration/60)} minutes per recording</Text>
            </>
          )}
          
          {isRecording && (
            <Text style={styles.recordingInstruction}>
              Tap the stop button when you're done, or it will stop automatically at {Math.floor(maxDuration/60)} minutes.
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  cancelButton: {
    padding: 8,
  },
  recordingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingPrompt: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7C3AED',
    textAlign: 'center',
    marginBottom: 32,
  },
  visualContainer: {
    alignItems: 'center',
    marginBottom: 48,
    minHeight: 120,
    justifyContent: 'center',
  },
  soundWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 60,
    marginBottom: 16,
  },
  soundWave: {
    width: 4,
    height: 60,
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
  durationContainer: {
    alignItems: 'center',
  },
  durationText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  remainingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  readyContainer: {
    alignItems: 'center',
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  recordButtonContainer: {
    marginBottom: 32,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
  },
  recordButtonInactive: {
    backgroundColor: '#7C3AED',
  },
  instructions: {
    alignItems: 'center',
    maxWidth: 300,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  recordingInstruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  transcribingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcribingIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  transcribingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  transcribingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  transcribingProgress: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    backgroundColor: '#7C3AED',
  },
})