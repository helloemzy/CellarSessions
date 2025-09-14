import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { OpenAIService } from '@/services/api/openai'

interface VoiceNoteEditorProps {
  transcription: string
  audioUri: string
  onSave: (editedText: string, analysis?: any) => void
  onCancel: () => void
  wineContext?: {
    name?: string
    producer?: string
    vintage?: number
    wineType?: string
    grapeVariety?: string[]
  }
}

export function VoiceNoteEditor({
  transcription,
  audioUri,
  onSave,
  onCancel,
  wineContext,
}: VoiceNoteEditorProps) {
  const [editedText, setEditedText] = useState(transcription)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync()
        }
      : undefined
  }, [sound])

  const playAudio = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync()
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync()
            setIsPlaying(false)
          } else {
            await sound.playAsync()
            setIsPlaying(true)
          }
          return
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      )

      setSound(newSound)
      setIsPlaying(true)

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false)
        }
      })
    } catch (error) {
      console.error('Error playing audio:', error)
      Alert.alert('Error', 'Failed to play audio recording.')
    }
  }

  const analyzeNotes = async () => {
    setIsAnalyzing(true)
    
    try {
      const { result, error } = await OpenAIService.analyzeWineTastingNotes(
        editedText,
        wineContext
      )

      if (error || !result) {
        Alert.alert('Analysis Failed', error || 'Failed to analyze tasting notes.')
        setIsAnalyzing(false)
        return
      }

      setAnalysis(result)
      setShowAnalysis(true)
    } catch (error) {
      console.error('Analysis error:', error)
      Alert.alert('Error', 'Failed to analyze tasting notes.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = () => {
    if (editedText.trim().length === 0) {
      Alert.alert('Empty Note', 'Please add some tasting notes before saving.')
      return
    }

    onSave(editedText.trim(), analysis)
  }

  const formatConfidence = (confidence: number) => {
    if (confidence >= 80) return { text: 'High Confidence', color: '#059669' }
    if (confidence >= 60) return { text: 'Good Confidence', color: '#F59E0B' }
    if (confidence >= 40) return { text: 'Fair Confidence', color: '#EF4444' }
    return { text: 'Low Confidence', color: '#6B7280' }
  }

  const renderAnalysisSection = (title: string, data: any) => {
    if (!data || Object.keys(data).length === 0) return null

    return (
      <View style={styles.analysisSection} key={title}>
        <Text style={styles.analysisSectionTitle}>{title}</Text>
        <View style={styles.analysisSectionContent}>
          {Object.entries(data).map(([key, value]) => (
            <View key={key} style={styles.analysisField}>
              <Text style={styles.analysisFieldLabel}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
              </Text>
              <Text style={styles.analysisFieldValue}>
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const confidenceInfo = analysis ? formatConfidence(analysis.confidence) : null

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Voice Notes</Text>
          {wineContext?.name && (
            <Text style={styles.subtitle}>{wineContext.name}</Text>
          )}
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Audio Playback */}
        <View style={styles.audioSection}>
          <TouchableOpacity style={styles.playButton} onPress={playAudio}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="#7C3AED"
            />
            <Text style={styles.playButtonText}>
              {isPlaying ? 'Pause Recording' : 'Play Recording'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transcription Editor */}
        <View style={styles.editorSection}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>Tasting Notes</Text>
            <Text style={styles.characterCount}>
              {editedText.length} characters
            </Text>
          </View>

          <TextInput
            style={styles.textEditor}
            value={editedText}
            onChangeText={setEditedText}
            placeholder="Edit your transcribed tasting notes here..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect={true}
          />

          {/* AI Analysis Section */}
          <View style={styles.analysisActions}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={analyzeNotes}
              disabled={isAnalyzing || editedText.trim().length === 0}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
              </Text>
            </TouchableOpacity>

            {analysis && (
              <TouchableOpacity
                style={styles.toggleAnalysisButton}
                onPress={() => setShowAnalysis(!showAnalysis)}
              >
                <Text style={styles.toggleAnalysisText}>
                  {showAnalysis ? 'Hide' : 'Show'} Analysis
                </Text>
                <Ionicons
                  name={showAnalysis ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#7C3AED"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Analysis Results */}
        {analysis && showAnalysis && (
          <View style={styles.analysisContainer}>
            <View style={styles.analysisHeader}>
              <Text style={styles.analysisTitle}>WSET Analysis</Text>
              {confidenceInfo && (
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceInfo.color }]}>
                  <Text style={styles.confidenceText}>{confidenceInfo.text}</Text>
                </View>
              )}
            </View>

            {renderAnalysisSection('Appearance', analysis.wineAnalysis.appearance)}
            {renderAnalysisSection('Nose', analysis.wineAnalysis.nose)}
            {renderAnalysisSection('Palate', analysis.wineAnalysis.palate)}
            {renderAnalysisSection('Conclusion', analysis.wineAnalysis.conclusion)}

            {analysis.suggestedCorrections && analysis.suggestedCorrections.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.suggestionTitle}>💡 Suggestions</Text>
                {analysis.suggestedCorrections.map((suggestion: string, index: number) => (
                  <Text key={index} style={styles.suggestionText}>
                    • {suggestion}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Editing Tips:</Text>
          <Text style={styles.tipText}>• Add wine-specific details for better AI analysis</Text>
          <Text style={styles.tipText}>• Use WSET terminology when possible</Text>
          <Text style={styles.tipText}>• Include appearance, nose, and palate observations</Text>
          <Text style={styles.tipText}>• The AI analysis uses professional wine evaluation methods</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onCancel}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, editedText.trim().length === 0 && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={editedText.trim().length === 0}
        >
          <Text style={styles.primaryButtonText}>Save Notes</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  audioSection: {
    marginBottom: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playButtonText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
    marginLeft: 8,
  },
  editorSection: {
    marginBottom: 24,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  textEditor: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: '#1F2937',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  analysisActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  toggleAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleAnalysisText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  analysisContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analysisSectionContent: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  analysisField: {
    marginBottom: 6,
  },
  analysisFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  analysisFieldValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  suggestionsSection: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 4,
    lineHeight: 18,
  },
  tipsSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0EA5E9',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#0369A1',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
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
  buttonDisabled: {
    opacity: 0.5,
  },
})