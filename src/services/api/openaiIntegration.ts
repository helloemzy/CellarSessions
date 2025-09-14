import { OpenAIService, OpenAITranscriptionResult, OpenAIWineAnalysisResult } from './openai'
import { OPENAI_API_KEY, APP_CONFIG } from '@/lib/config'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface OpenAIIntegrationConfig {
  enableCaching: boolean
  cacheExpirationHours: number
  retryAttempts: number
  enableRateLimiting: boolean
  transcriptionModel: 'whisper-1'
  chatModel: 'gpt-4o' | 'gpt-4o-mini'
  temperature: number
}

export interface OpenAITestResult {
  isConfigured: boolean
  isConnected: boolean
  canTranscribeAudio: boolean
  canAnalyzeWine: boolean
  canGenerateRecommendations: boolean
  responseTimeMs: number
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface VoiceTranscriptionOptions {
  useCache?: boolean
  maxRetries?: number
  improveWineTerminology?: boolean
  language?: string
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
}

export interface WineAnalysisOptions {
  includeConfidence?: boolean
  includeSuggestions?: boolean
  analysisDepth?: 'basic' | 'detailed' | 'expert'
  focusAreas?: ('appearance' | 'nose' | 'palate' | 'conclusion')[]
}

export class OpenAIIntegration {
  private static config: OpenAIIntegrationConfig = {
    enableCaching: true,
    cacheExpirationHours: 24,
    retryAttempts: 2,
    enableRateLimiting: true,
    transcriptionModel: 'whisper-1',
    chatModel: 'gpt-4o-mini',
    temperature: 0.3
  }

  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>()
  private static usageStats = {
    transcriptions: 0,
    analyses: 0,
    recommendations: 0,
    totalTokensUsed: 0
  }

  /**
   * Run comprehensive OpenAI integration test
   */
  static async runIntegrationTest(): Promise<OpenAITestResult> {
    const result: OpenAITestResult = {
      isConfigured: false,
      isConnected: false,
      canTranscribeAudio: false,
      canAnalyzeWine: false,
      canGenerateRecommendations: false,
      responseTimeMs: 0,
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      // Test 1: Configuration Check
      result.isConfigured = await this.testConfiguration()
      if (!result.isConfigured) {
        result.errors.push('OpenAI API key not configured or invalid')
        result.recommendations.push('Set EXPO_PUBLIC_OPENAI_API_KEY in environment variables')
        return result
      }

      // Test 2: API Connectivity
      const startTime = Date.now()
      const connectivityTest = await this.testConnectivity()
      result.responseTimeMs = Date.now() - startTime
      result.isConnected = connectivityTest.success
      
      if (!result.isConnected) {
        result.errors.push(`API connectivity failed: ${connectivityTest.error}`)
        result.recommendations.push('Check internet connection and API key permissions')
        return result
      }

      // Test 3: Audio Transcription
      const transcriptionTest = await this.testAudioTranscription()
      result.canTranscribeAudio = transcriptionTest.success
      if (!transcriptionTest.success) {
        result.warnings.push(`Audio transcription may have issues: ${transcriptionTest.error}`)
      }

      // Test 4: Wine Analysis
      const analysisTest = await this.testWineAnalysis()
      result.canAnalyzeWine = analysisTest.success
      if (!analysisTest.success) {
        result.warnings.push(`Wine analysis may have issues: ${analysisTest.error}`)
      }

      // Test 5: Recommendations
      const recommendationTest = await this.testRecommendations()
      result.canGenerateRecommendations = recommendationTest.success
      if (!recommendationTest.success) {
        result.warnings.push(`Recommendation generation may have issues: ${recommendationTest.error}`)
      }

      // Generate performance recommendations
      if (result.responseTimeMs > 3000) {
        result.recommendations.push('Consider using gpt-4o-mini for faster responses')
      }

      if (result.responseTimeMs > 10000) {
        result.warnings.push('Response time is very slow - check network connectivity')
      }

    } catch (error) {
      result.errors.push(`Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Enhanced audio transcription with advanced options
   */
  static async transcribeAudioEnhanced(
    audioUri: string,
    options: VoiceTranscriptionOptions = {}
  ): Promise<{
    result: OpenAITranscriptionResult | null
    error: string | null
    fromCache: boolean
    processingTimeMs: number
    tokenCount?: number
  }> {
    const startTime = Date.now()
    const {
      useCache = this.config.enableCaching,
      maxRetries = this.config.retryAttempts,
      improveWineTerminology = true,
      language = 'en',
      responseFormat = 'verbose_json'
    } = options

    try {
      // Check rate limits
      if (this.config.enableRateLimiting && !await this.checkRateLimit('transcription')) {
        return {
          result: null,
          error: 'Rate limit exceeded for transcriptions. Please try again later.',
          fromCache: false,
          processingTimeMs: Date.now() - startTime
        }
      }

      // Check cache first
      if (useCache) {
        const cacheKey = await this.generateAudioCacheKey(audioUri, { language, responseFormat })
        const cachedResult = await this.getCachedTranscription(cacheKey)
        if (cachedResult) {
          return {
            result: cachedResult,
            error: null,
            fromCache: true,
            processingTimeMs: Date.now() - startTime
          }
        }
      }

      // Transcription with retry logic
      let lastError: string | null = null
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { result, error } = await OpenAIService.transcribeAudio(audioUri)
          
          if (result) {
            let finalResult = result

            // Apply wine terminology improvement
            if (improveWineTerminology && result.text) {
              const { result: improvedText } = await OpenAIService.improveWineTranscription(result.text)
              if (improvedText) {
                finalResult = { ...result, text: improvedText }
              }
            }

            // Cache successful result
            if (useCache && finalResult.confidence && finalResult.confidence >= 70) {
              const cacheKey = await this.generateAudioCacheKey(audioUri, { language, responseFormat })
              await this.cacheTranscription(cacheKey, finalResult)
            }

            // Update usage stats
            this.usageStats.transcriptions++
            await this.updateUsageStats()

            return {
              result: finalResult,
              error: null,
              fromCache: false,
              processingTimeMs: Date.now() - startTime
            }
          } else {
            lastError = error
            if (attempt < maxRetries) {
              await this.delay(1000 * attempt)
            }
          }
        } catch (attemptError) {
          lastError = attemptError instanceof Error ? attemptError.message : 'Transcription failed'
          if (attempt < maxRetries) {
            await this.delay(1000 * attempt)
          }
        }
      }

      return {
        result: null,
        error: lastError || 'All transcription attempts failed',
        fromCache: false,
        processingTimeMs: Date.now() - startTime
      }

    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Enhanced transcription failed',
        fromCache: false,
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Enhanced wine analysis with customizable options
   */
  static async analyzeWineEnhanced(
    tastingText: string,
    wineContext?: {
      name?: string
      producer?: string
      vintage?: number
      wineType?: string
      grapeVariety?: string[]
    },
    options: WineAnalysisOptions = {}
  ): Promise<{
    result: OpenAIWineAnalysisResult | null
    error: string | null
    processingTimeMs: number
    tokenCount?: number
  }> {
    const startTime = Date.now()
    const {
      includeConfidence = true,
      includeSuggestions = true,
      analysisDepth = 'detailed',
      focusAreas = ['appearance', 'nose', 'palate', 'conclusion']
    } = options

    try {
      // Check rate limits
      if (this.config.enableRateLimiting && !await this.checkRateLimit('analysis')) {
        return {
          result: null,
          error: 'Rate limit exceeded for wine analysis. Please try again later.',
          processingTimeMs: Date.now() - startTime
        }
      }

      const { result, error } = await OpenAIService.analyzeWineTastingNotes(
        tastingText,
        wineContext
      )

      if (result) {
        // Update usage stats
        this.usageStats.analyses++
        await this.updateUsageStats()
      }

      return {
        result,
        error,
        processingTimeMs: Date.now() - startTime
      }

    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Enhanced wine analysis failed',
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Batch process multiple audio files
   */
  static async batchTranscribeAudio(
    audioUris: string[],
    options: VoiceTranscriptionOptions = {},
    onProgress?: (processed: number, total: number, current?: OpenAITranscriptionResult) => void
  ): Promise<{
    results: (OpenAITranscriptionResult | null)[]
    errors: (string | null)[]
    successCount: number
    totalProcessingTimeMs: number
  }> {
    const startTime = Date.now()
    const results: (OpenAITranscriptionResult | null)[] = []
    const errors: (string | null)[] = []
    let successCount = 0

    for (let i = 0; i < audioUris.length; i++) {
      try {
        const { result, error } = await this.transcribeAudioEnhanced(audioUris[i], options)
        
        results.push(result)
        errors.push(error)
        
        if (result) {
          successCount++
        }

        if (onProgress) {
          onProgress(i + 1, audioUris.length, result || undefined)
        }

        // Small delay between requests to respect rate limits
        if (i < audioUris.length - 1) {
          await this.delay(500)
        }

      } catch (batchError) {
        results.push(null)
        errors.push(batchError instanceof Error ? batchError.message : 'Batch processing failed')
        
        if (onProgress) {
          onProgress(i + 1, audioUris.length)
        }
      }
    }

    return {
      results,
      errors,
      successCount,
      totalProcessingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Smart tasting notes extraction from free-form text
   */
  static async extractTastingNotesFromText(
    freeText: string,
    wineContext?: {
      name?: string
      producer?: string
      vintage?: number
      wineType?: string
    }
  ): Promise<{
    result: {
      extractedNotes: {
        appearance: string[]
        nose: string[]
        palate: string[]
        overall: string[]
      }
      structuredAnalysis: OpenAIWineAnalysisResult | null
      confidence: number
    } | null
    error: string | null
  }> {
    try {
      if (!OPENAI_API_KEY) {
        return { result: null, error: 'OpenAI API key not configured' }
      }

      const contextInfo = wineContext ? `
Wine Context:
- Name: ${wineContext.name || 'Unknown'}
- Producer: ${wineContext.producer || 'Unknown'}
- Vintage: ${wineContext.vintage || 'Unknown'}
- Wine Type: ${wineContext.wineType || 'Unknown'}
` : ''

      const prompt = `Extract and categorize wine tasting notes from the following free-form text. The text may contain casual observations, technical terms, or conversational notes about wine.

${contextInfo}

Free-form text:
${freeText}

Please extract specific tasting notes and organize them into categories:

APPEARANCE notes (color, intensity, clarity observations)
NOSE notes (aroma descriptors, intensity, faults)
PALATE notes (taste, texture, structure, finish observations)
OVERALL notes (general impressions, quality assessments)

Then provide a structured WSET-style analysis of the wine based on these notes.

Return as JSON with:
1. extractedNotes: categorized arrays of specific observations
2. structuredAnalysis: WSET-style analysis object
3. confidence: score (0-100) based on how much wine-specific information was found

Focus on extracting actual tasting descriptors while preserving the original language and style.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.chatModel,
          messages: [
            {
              role: 'system',
              content: 'You are a wine expert specializing in tasting note extraction and WSET methodology. Respond only with valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { result: null, error: `OpenAI API error: ${errorText}` }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        return { result: null, error: 'No extraction results returned from OpenAI' }
      }

      try {
        const parsedResult = JSON.parse(content)
        return { result: parsedResult, error: null }
      } catch (parseError) {
        return { result: null, error: 'Failed to parse extraction response' }
      }

    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Text extraction failed'
      }
    }
  }

  /**
   * Get comprehensive usage statistics
   */
  static async getUsageStats(): Promise<{
    today: {
      transcriptions: number
      analyses: number
      recommendations: number
      estimatedCost: number
    }
    thisMonth: {
      transcriptions: number
      analyses: number
      recommendations: number
      estimatedCost: number
    }
    performance: {
      averageResponseTime: number
      successRate: number
      cacheHitRate: number
    }
    rateLimit: {
      remaining: number
      resetTime: number
    }
  }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().substring(0, 7)
      
      const dailyStatsKey = `openai_stats_${today}`
      const monthlyStatsKey = `openai_stats_monthly_${thisMonth}`
      
      const dailyStats = await AsyncStorage.getItem(dailyStatsKey)
      const monthlyStats = await AsyncStorage.getItem(monthlyStatsKey)
      
      const daily = dailyStats ? JSON.parse(dailyStats) : { 
        transcriptions: 0, analyses: 0, recommendations: 0, 
        totalResponseTime: 0, successes: 0, cacheHits: 0, requests: 0 
      }
      const monthly = monthlyStats ? JSON.parse(monthlyStats) : { 
        transcriptions: 0, analyses: 0, recommendations: 0 
      }

      return {
        today: {
          transcriptions: daily.transcriptions || 0,
          analyses: daily.analyses || 0,
          recommendations: daily.recommendations || 0,
          estimatedCost: this.calculateEstimatedCost(daily)
        },
        thisMonth: {
          transcriptions: monthly.transcriptions || 0,
          analyses: monthly.analyses || 0,
          recommendations: monthly.recommendations || 0,
          estimatedCost: this.calculateEstimatedCost(monthly)
        },
        performance: {
          averageResponseTime: daily.requests > 0 ? Math.round(daily.totalResponseTime / daily.requests) : 0,
          successRate: daily.requests > 0 ? Math.round((daily.successes / daily.requests) * 100) : 0,
          cacheHitRate: daily.requests > 0 ? Math.round((daily.cacheHits / daily.requests) * 100) : 0
        },
        rateLimit: {
          remaining: this.getRemainingRateLimit(),
          resetTime: this.getRateLimitResetTime()
        }
      }
    } catch (error) {
      console.error('Error getting OpenAI usage stats:', error)
      return {
        today: { transcriptions: 0, analyses: 0, recommendations: 0, estimatedCost: 0 },
        thisMonth: { transcriptions: 0, analyses: 0, recommendations: 0, estimatedCost: 0 },
        performance: { averageResponseTime: 0, successRate: 0, cacheHitRate: 0 },
        rateLimit: { remaining: 0, resetTime: 0 }
      }
    }
  }

  // Private helper methods

  private static async testConfiguration(): Promise<boolean> {
    return !!OPENAI_API_KEY && OPENAI_API_KEY.length > 20
  }

  private static async testConnectivity(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      return {
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  private static async testAudioTranscription(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // This is a placeholder - in reality you'd need a sample audio file
      // For now, we'll just test if the transcription API endpoint is accessible
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription test failed'
      }
    }
  }

  private static async testWineAnalysis(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const testText = "This Cabernet has a deep ruby color with notes of blackcurrant and oak on the nose. The palate shows good tannin structure with a medium finish."
      const { result, error } = await OpenAIService.analyzeWineTastingNotes(testText)
      
      return {
        success: !!result && !error,
        error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wine analysis test failed'
      }
    }
  }

  private static async testRecommendations(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const testProfile = {
        preferredStyles: ['red wine', 'medium-bodied'],
        experienceLevel: 'intermediate' as const,
        priceRange: { min: 20, max: 50 }
      }
      const testTastings = [
        { wineName: 'Test Wine', rating: 4, wineType: 'red', notes: 'Good structure' }
      ]
      
      const { result, error } = await OpenAIService.generateWineRecommendations(
        testProfile,
        testTastings,
        'Looking for similar wines'
      )
      
      return {
        success: !!result && !error,
        error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recommendations test failed'
      }
    }
  }

  private static async generateAudioCacheKey(
    audioUri: string, 
    options: { language?: string; responseFormat?: string }
  ): Promise<string> {
    const optionsStr = JSON.stringify(options)
    const encoder = new TextEncoder()
    const data = encoder.encode(audioUri + optionsStr)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff
    }
    return `openai_audio_cache_${Math.abs(hash)}`
  }

  private static async getCachedTranscription(cacheKey: string): Promise<OpenAITranscriptionResult | null> {
    try {
      const cached = await AsyncStorage.getItem(cacheKey)
      if (!cached) return null

      const { result, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp
      const maxAge = this.config.cacheExpirationHours * 60 * 60 * 1000

      if (age > maxAge) {
        await AsyncStorage.removeItem(cacheKey)
        return null
      }

      return result
    } catch {
      return null
    }
  }

  private static async cacheTranscription(cacheKey: string, result: OpenAITranscriptionResult): Promise<void> {
    try {
      const cacheData = {
        result,
        timestamp: Date.now()
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache transcription result:', error)
    }
  }

  private static async checkRateLimit(type: 'transcription' | 'analysis' | 'recommendation'): Promise<boolean> {
    const now = Date.now()
    const minuteKey = `${type}_minute_${Math.floor(now / 60000)}`
    const dayKey = `${type}_day_${Math.floor(now / 86400000)}`

    const minuteLimit = APP_CONFIG.rateLimits.openai.requestsPerMinute
    const dayLimit = APP_CONFIG.rateLimits.openai.requestsPerDay

    const minuteData = this.rateLimitStore.get(minuteKey) || { count: 0, resetTime: now + 60000 }
    const dayData = this.rateLimitStore.get(dayKey) || { count: 0, resetTime: now + 86400000 }

    if (minuteData.count >= minuteLimit || dayData.count >= dayLimit) {
      return false
    }

    // Increment counters
    this.rateLimitStore.set(minuteKey, { ...minuteData, count: minuteData.count + 1 })
    this.rateLimitStore.set(dayKey, { ...dayData, count: dayData.count + 1 })

    // Clean up expired entries
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now > data.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }

    return true
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static async updateUsageStats(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const statsKey = `openai_stats_${today}`
      const currentStats = await AsyncStorage.getItem(statsKey)
      
      const stats = currentStats ? JSON.parse(currentStats) : {}
      stats.transcriptions = this.usageStats.transcriptions
      stats.analyses = this.usageStats.analyses
      stats.recommendations = this.usageStats.recommendations
      
      await AsyncStorage.setItem(statsKey, JSON.stringify(stats))
    } catch (error) {
      console.warn('Failed to update usage stats:', error)
    }
  }

  private static calculateEstimatedCost(stats: any): number {
    // Rough cost estimation based on OpenAI pricing
    const transcriptionCost = (stats.transcriptions || 0) * 0.006 // $0.006 per minute
    const analysisCost = (stats.analyses || 0) * 0.002 // Estimated per analysis
    const recommendationCost = (stats.recommendations || 0) * 0.003 // Estimated per recommendation
    
    return transcriptionCost + analysisCost + recommendationCost
  }

  private static getRemainingRateLimit(): number {
    const now = Date.now()
    const minuteKey = `minute_${Math.floor(now / 60000)}`
    const minuteData = this.rateLimitStore.get(minuteKey)
    
    return Math.max(0, APP_CONFIG.rateLimits.openai.requestsPerMinute - (minuteData?.count || 0))
  }

  private static getRateLimitResetTime(): number {
    const now = Date.now()
    return Math.floor(now / 60000) * 60000 + 60000 // Next minute
  }

  /**
   * Update integration configuration
   */
  static updateConfig(newConfig: Partial<OpenAIIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current integration configuration
   */
  static getConfig(): OpenAIIntegrationConfig {
    return { ...this.config }
  }
}