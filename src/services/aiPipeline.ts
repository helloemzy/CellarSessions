import { GoogleVisionIntegration } from './api/googleVisionIntegration'
import { OpenAIIntegration } from './api/openaiIntegration'
import { WineRecognitionResult } from './wineRecognition'
import { OpenAITranscriptionResult, OpenAIWineAnalysisResult } from './api/openai'
import { supabase } from './api/supabase'
import { WSETTastingFormData } from '@/types/wsetForm'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AIProcessingStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  progress: number
  result?: any
  error?: string
  duration?: number
}

export interface CameraToAIResult {
  sessionId: string
  steps: AIProcessingStep[]
  wineRecognition?: WineRecognitionResult
  voiceTranscription?: OpenAITranscriptionResult
  wineAnalysis?: OpenAIWineAnalysisResult
  suggestedWsetForm?: Partial<WSETTastingFormData>
  confidence: number
  processingTimeMs: number
}

export interface AIProcessingOptions {
  enableWineRecognition: boolean
  enableVoiceTranscription: boolean
  enableWineAnalysis: boolean
  enableFormSuggestion: boolean
  cacheResults: boolean
  generateRecommendations: boolean
  maxProcessingTimeMs?: number
}

export interface AIProcessingInput {
  imageUri?: string
  audioUri?: string
  textNotes?: string
  wineContext?: {
    name?: string
    producer?: string
    vintage?: number
    wineType?: string
    grapeVariety?: string[]
  }
}

export class AIProcessingPipeline {
  private static readonly DEFAULT_OPTIONS: AIProcessingOptions = {
    enableWineRecognition: true,
    enableVoiceTranscription: true,
    enableWineAnalysis: true,
    enableFormSuggestion: true,
    cacheResults: true,
    generateRecommendations: false,
    maxProcessingTimeMs: 60000 // 1 minute
  }

  /**
   * Process camera capture and voice notes through AI pipeline
   */
  static async processCameraToAI(
    input: AIProcessingInput,
    options: Partial<AIProcessingOptions> = {},
    onProgress?: (steps: AIProcessingStep[]) => void
  ): Promise<CameraToAIResult> {
    const startTime = Date.now()
    const sessionId = this.generateSessionId()
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options }
    
    const result: CameraToAIResult = {
      sessionId,
      steps: [],
      confidence: 0,
      processingTimeMs: 0
    }

    try {
      // Initialize processing steps
      const steps = this.initializeSteps(finalOptions)
      result.steps = steps

      if (onProgress) {
        onProgress([...steps])
      }

      // Step 1: Wine Label Recognition
      if (finalOptions.enableWineRecognition && input.imageUri) {
        await this.processWineRecognition(input.imageUri, steps, result, input.wineContext)
        if (onProgress) onProgress([...steps])
      }

      // Step 2: Voice Transcription
      if (finalOptions.enableVoiceTranscription && input.audioUri) {
        await this.processVoiceTranscription(input.audioUri, steps, result)
        if (onProgress) onProgress([...steps])
      }

      // Step 3: Wine Analysis (using transcription and/or text notes)
      if (finalOptions.enableWineAnalysis) {
        await this.processWineAnalysis(input, steps, result)
        if (onProgress) onProgress([...steps])
      }

      // Step 4: Generate WSET Form Suggestions
      if (finalOptions.enableFormSuggestion) {
        await this.processFormSuggestion(result, steps)
        if (onProgress) onProgress([...steps])
      }

      // Step 5: Cache Results
      if (finalOptions.cacheResults) {
        await this.cacheProcessingResult(sessionId, result)
      }

      // Calculate overall confidence and completion
      result.confidence = this.calculateOverallConfidence(result)
      result.processingTimeMs = Date.now() - startTime

      // Log successful completion
      await this.logProcessingSession(sessionId, result, true)

    } catch (error) {
      console.error('AI Pipeline processing failed:', error)
      result.processingTimeMs = Date.now() - startTime
      await this.logProcessingSession(sessionId, result, false, error)
      
      // Mark remaining steps as failed
      result.steps.forEach(step => {
        if (step.status === 'pending' || step.status === 'processing') {
          step.status = 'failed'
          step.error = error instanceof Error ? error.message : 'Processing failed'
        }
      })
    }

    return result
  }

  /**
   * Process image-only workflow (camera capture to wine recognition)
   */
  static async processImageOnly(
    imageUri: string,
    options: {
      enableAnalysis?: boolean
      cacheResults?: boolean
    } = {},
    onProgress?: (progress: number) => void
  ): Promise<{
    recognition: WineRecognitionResult | null
    analysis?: OpenAIWineAnalysisResult | null
    error: string | null
  }> {
    try {
      if (onProgress) onProgress(10)

      // Wine recognition
      const { result: recognition, error: recognitionError } = 
        await GoogleVisionIntegration.recognizeWineLabelEnhanced(imageUri)

      if (recognitionError) {
        return { recognition: null, error: recognitionError }
      }

      if (onProgress) onProgress(70)

      let analysis = null
      if (options.enableAnalysis && recognition?.rawText) {
        const wineContext = {
          name: recognition.wineName,
          producer: recognition.producer,
          vintage: recognition.vintage,
          wineType: recognition.wineType,
          grapeVariety: recognition.grapeVariety
        }

        const { result: analysisResult } = await OpenAIIntegration.analyzeWineEnhanced(
          recognition.rawText,
          wineContext
        )
        analysis = analysisResult
      }

      if (onProgress) onProgress(100)

      return {
        recognition,
        analysis,
        error: null
      }

    } catch (error) {
      return {
        recognition: null,
        error: error instanceof Error ? error.message : 'Image processing failed'
      }
    }
  }

  /**
   * Process audio-only workflow (voice to transcription and analysis)
   */
  static async processAudioOnly(
    audioUri: string,
    wineContext?: {
      name?: string
      producer?: string
      vintage?: number
      wineType?: string
      grapeVariety?: string[]
    },
    onProgress?: (progress: number) => void
  ): Promise<{
    transcription: OpenAITranscriptionResult | null
    analysis: OpenAIWineAnalysisResult | null
    error: string | null
  }> {
    try {
      if (onProgress) onProgress(10)

      // Voice transcription
      const { result: transcription, error: transcriptionError } = 
        await OpenAIIntegration.transcribeAudioEnhanced(audioUri, {
          improveWineTerminology: true
        })

      if (transcriptionError) {
        return { transcription: null, analysis: null, error: transcriptionError }
      }

      if (onProgress) onProgress(60)

      let analysis = null
      if (transcription?.text) {
        const { result: analysisResult } = await OpenAIIntegration.analyzeWineEnhanced(
          transcription.text,
          wineContext
        )
        analysis = analysisResult
      }

      if (onProgress) onProgress(100)

      return {
        transcription,
        analysis,
        error: null
      }

    } catch (error) {
      return {
        transcription: null,
        analysis: null,
        error: error instanceof Error ? error.message : 'Audio processing failed'
      }
    }
  }

  /**
   * Create a complete tasting note from AI pipeline results
   */
  static async createTastingNoteFromAI(
    pipelineResult: CameraToAIResult,
    userId: string
  ): Promise<{
    tastingNote: any | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== userId) {
        return { tastingNote: null, error: 'User not authenticated' }
      }

      // Prepare tasting note data
      const tastingNoteData = {
        user_id: userId,
        wine_id: null, // Will be set if wine is found/created
        visibility: 'PRIVATE' as const,
        is_blind_tasting: false,
        created_at: new Date().toISOString(),
        
        // Wine information from recognition
        wine_name: pipelineResult.wineRecognition?.wineName,
        producer: pipelineResult.wineRecognition?.producer,
        vintage: pipelineResult.wineRecognition?.vintage,
        wine_type: pipelineResult.wineRecognition?.wineType,
        grape_variety: pipelineResult.wineRecognition?.grapeVariety,
        region: pipelineResult.wineRecognition?.appellation,
        alcohol_content: pipelineResult.wineRecognition?.alcoholContent,
        
        // Structured tasting notes from analysis
        appearance_intensity: pipelineResult.wineAnalysis?.wineAnalysis?.appearance?.intensity,
        appearance_color: pipelineResult.wineAnalysis?.wineAnalysis?.appearance?.color,
        
        nose_intensity: pipelineResult.wineAnalysis?.wineAnalysis?.nose?.intensity,
        nose_aroma_characteristics: pipelineResult.wineAnalysis?.wineAnalysis?.nose?.aromas,
        
        palate_sweetness: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.sweetness,
        palate_acidity: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.acidity,
        palate_tannin: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.tannins,
        palate_alcohol: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.alcohol,
        palate_body: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.body,
        palate_flavor_intensity: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.flavors ? 'medium' : null,
        palate_flavor_characteristics: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.flavors,
        palate_finish: pipelineResult.wineAnalysis?.wineAnalysis?.palate?.finish,
        
        // Overall assessment
        quality_assessment: pipelineResult.wineAnalysis?.wineAnalysis?.conclusion?.quality,
        readiness: pipelineResult.wineAnalysis?.wineAnalysis?.conclusion?.readiness,
        
        // Raw transcribed notes
        personal_notes: pipelineResult.voiceTranscription?.text,
        
        // AI metadata
        ai_recognition_confidence: pipelineResult.wineRecognition?.confidence,
        ai_transcription_confidence: pipelineResult.voiceTranscription?.confidence,
        ai_analysis_confidence: pipelineResult.wineAnalysis?.confidence,
        ai_processing_session_id: pipelineResult.sessionId
      }

      // Save to database
      const { data: tastingNote, error } = await supabase
        .from('tasting_notes')
        .insert(tastingNoteData)
        .select()
        .single()

      if (error) {
        return { tastingNote: null, error: error.message }
      }

      return { tastingNote, error: null }

    } catch (error) {
      return {
        tastingNote: null,
        error: error instanceof Error ? error.message : 'Failed to create tasting note'
      }
    }
  }

  /**
   * Get AI processing statistics and insights
   */
  static async getProcessingStats(userId: string): Promise<{
    stats: {
      totalSessions: number
      successRate: number
      averageProcessingTime: number
      featureUsage: {
        wineRecognition: number
        voiceTranscription: number
        wineAnalysis: number
        formSuggestion: number
      }
      accuracyMetrics: {
        averageWineRecognitionConfidence: number
        averageTranscriptionConfidence: number
        averageAnalysisConfidence: number
      }
    } | null
    error: string | null
  }> {
    try {
      const statsKey = `ai_pipeline_stats_${userId}`
      const cachedStats = await AsyncStorage.getItem(statsKey)
      
      if (cachedStats) {
        const stats = JSON.parse(cachedStats)
        return { stats, error: null }
      }

      // If no cached stats, return default
      return {
        stats: {
          totalSessions: 0,
          successRate: 0,
          averageProcessingTime: 0,
          featureUsage: {
            wineRecognition: 0,
            voiceTranscription: 0,
            wineAnalysis: 0,
            formSuggestion: 0
          },
          accuracyMetrics: {
            averageWineRecognitionConfidence: 0,
            averageTranscriptionConfidence: 0,
            averageAnalysisConfidence: 0
          }
        },
        error: null
      }

    } catch (error) {
      return {
        stats: null,
        error: error instanceof Error ? error.message : 'Failed to get processing stats'
      }
    }
  }

  // Private helper methods

  private static generateSessionId(): string {
    return `ai_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static initializeSteps(options: AIProcessingOptions): AIProcessingStep[] {
    const steps: AIProcessingStep[] = []

    if (options.enableWineRecognition) {
      steps.push({
        id: 'wine_recognition',
        name: 'Analyzing wine label',
        status: 'pending',
        progress: 0
      })
    }

    if (options.enableVoiceTranscription) {
      steps.push({
        id: 'voice_transcription',
        name: 'Transcribing voice notes',
        status: 'pending',
        progress: 0
      })
    }

    if (options.enableWineAnalysis) {
      steps.push({
        id: 'wine_analysis',
        name: 'Analyzing tasting notes',
        status: 'pending',
        progress: 0
      })
    }

    if (options.enableFormSuggestion) {
      steps.push({
        id: 'form_suggestion',
        name: 'Generating form suggestions',
        status: 'pending',
        progress: 0
      })
    }

    return steps
  }

  private static async processWineRecognition(
    imageUri: string,
    steps: AIProcessingStep[],
    result: CameraToAIResult,
    wineContext?: any
  ): Promise<void> {
    const step = steps.find(s => s.id === 'wine_recognition')
    if (!step) return

    try {
      step.status = 'processing'
      step.progress = 10

      const startTime = Date.now()
      const { result: recognition, error } = await GoogleVisionIntegration.recognizeWineLabelEnhanced(
        imageUri,
        { useCache: true }
      )

      step.duration = Date.now() - startTime

      if (error || !recognition) {
        step.status = 'failed'
        step.error = error || 'Wine recognition failed'
        step.progress = 0
      } else {
        step.status = 'completed'
        step.progress = 100
        step.result = recognition
        result.wineRecognition = recognition
      }

    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : 'Wine recognition failed'
      step.progress = 0
    }
  }

  private static async processVoiceTranscription(
    audioUri: string,
    steps: AIProcessingStep[],
    result: CameraToAIResult
  ): Promise<void> {
    const step = steps.find(s => s.id === 'voice_transcription')
    if (!step) return

    try {
      step.status = 'processing'
      step.progress = 10

      const startTime = Date.now()
      const { result: transcription, error } = await OpenAIIntegration.transcribeAudioEnhanced(
        audioUri,
        { improveWineTerminology: true, useCache: true }
      )

      step.duration = Date.now() - startTime

      if (error || !transcription) {
        step.status = 'failed'
        step.error = error || 'Voice transcription failed'
        step.progress = 0
      } else {
        step.status = 'completed'
        step.progress = 100
        step.result = transcription
        result.voiceTranscription = transcription
      }

    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : 'Voice transcription failed'
      step.progress = 0
    }
  }

  private static async processWineAnalysis(
    input: AIProcessingInput,
    steps: AIProcessingStep[],
    result: CameraToAIResult
  ): Promise<void> {
    const step = steps.find(s => s.id === 'wine_analysis')
    if (!step) return

    try {
      step.status = 'processing'
      step.progress = 10

      // Combine available text sources
      let analysisText = ''
      if (result.voiceTranscription?.text) {
        analysisText += result.voiceTranscription.text
      }
      if (input.textNotes) {
        analysisText += (analysisText ? '\n\n' : '') + input.textNotes
      }
      if (result.wineRecognition?.rawText) {
        analysisText += (analysisText ? '\n\nLabel text: ' : '') + result.wineRecognition.rawText
      }

      if (!analysisText.trim()) {
        step.status = 'skipped'
        step.progress = 100
        return
      }

      // Prepare wine context
      const wineContext = {
        name: result.wineRecognition?.wineName || input.wineContext?.name,
        producer: result.wineRecognition?.producer || input.wineContext?.producer,
        vintage: result.wineRecognition?.vintage || input.wineContext?.vintage,
        wineType: result.wineRecognition?.wineType || input.wineContext?.wineType,
        grapeVariety: result.wineRecognition?.grapeVariety || input.wineContext?.grapeVariety
      }

      const startTime = Date.now()
      const { result: analysis, error } = await OpenAIIntegration.analyzeWineEnhanced(
        analysisText,
        wineContext
      )

      step.duration = Date.now() - startTime

      if (error || !analysis) {
        step.status = 'failed'
        step.error = error || 'Wine analysis failed'
        step.progress = 0
      } else {
        step.status = 'completed'
        step.progress = 100
        step.result = analysis
        result.wineAnalysis = analysis
      }

    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : 'Wine analysis failed'
      step.progress = 0
    }
  }

  private static async processFormSuggestion(
    result: CameraToAIResult,
    steps: AIProcessingStep[]
  ): Promise<void> {
    const step = steps.find(s => s.id === 'form_suggestion')
    if (!step) return

    try {
      step.status = 'processing'
      step.progress = 50

      const suggestions: Partial<WSETTastingFormData> = {}

      // Fill from wine recognition
      if (result.wineRecognition) {
        suggestions.wineName = result.wineRecognition.wineName
        suggestions.producer = result.wineRecognition.producer
        suggestions.vintage = result.wineRecognition.vintage
        suggestions.region = result.wineRecognition.appellation
        suggestions.grapeVarieties = result.wineRecognition.grapeVariety || []
      }

      // Fill from wine analysis
      if (result.wineAnalysis) {
        const analysis = result.wineAnalysis.wineAnalysis
        
        if (analysis.appearance) {
          suggestions.appearanceColor = analysis.appearance.color
          suggestions.appearanceIntensity = analysis.appearance.intensity as any
        }

        if (analysis.nose) {
          suggestions.noseIntensity = analysis.nose.intensity as any
          suggestions.noseAromas = analysis.nose.aromas || []
        }

        if (analysis.palate) {
          suggestions.palateSweetness = analysis.palate.sweetness as any
          suggestions.palateAcidity = analysis.palate.acidity as any
          suggestions.palateTannins = analysis.palate.tannins as any
          suggestions.palateAlcohol = analysis.palate.alcohol as any
          suggestions.palateBody = analysis.palate.body as any
          suggestions.palateFlavors = analysis.palate.flavors || []
          suggestions.palateFinish = analysis.palate.finish as any
        }

        if (analysis.conclusion) {
          suggestions.qualityLevel = analysis.conclusion.quality as any
        }
      }

      // Add voice transcription as personal notes
      if (result.voiceTranscription) {
        suggestions.personalNotes = result.voiceTranscription.text
      }

      step.status = 'completed'
      step.progress = 100
      step.result = suggestions
      result.suggestedWsetForm = suggestions

    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : 'Form suggestion failed'
      step.progress = 0
    }
  }

  private static calculateOverallConfidence(result: CameraToAIResult): number {
    let totalConfidence = 0
    let confidenceCount = 0

    if (result.wineRecognition?.confidence) {
      totalConfidence += result.wineRecognition.confidence
      confidenceCount++
    }

    if (result.voiceTranscription?.confidence) {
      totalConfidence += result.voiceTranscription.confidence
      confidenceCount++
    }

    if (result.wineAnalysis?.confidence) {
      totalConfidence += result.wineAnalysis.confidence
      confidenceCount++
    }

    return confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0
  }

  private static async cacheProcessingResult(
    sessionId: string,
    result: CameraToAIResult
  ): Promise<void> {
    try {
      const cacheKey = `ai_pipeline_result_${sessionId}`
      const cacheData = {
        result,
        timestamp: Date.now()
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache processing result:', error)
    }
  }

  private static async logProcessingSession(
    sessionId: string,
    result: CameraToAIResult,
    success: boolean,
    error?: any
  ): Promise<void> {
    try {
      const logData = {
        sessionId,
        success,
        processingTimeMs: result.processingTimeMs,
        confidence: result.confidence,
        stepsCompleted: result.steps.filter(s => s.status === 'completed').length,
        totalSteps: result.steps.length,
        error: error ? (error instanceof Error ? error.message : String(error)) : null,
        timestamp: new Date().toISOString()
      }

      // Store in AsyncStorage for analytics
      const logsKey = 'ai_pipeline_logs'
      const existingLogs = await AsyncStorage.getItem(logsKey)
      const logs = existingLogs ? JSON.parse(existingLogs) : []
      logs.push(logData)

      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }

      await AsyncStorage.setItem(logsKey, JSON.stringify(logs))

    } catch (error) {
      console.warn('Failed to log processing session:', error)
    }
  }
}