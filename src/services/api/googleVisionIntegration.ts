import { GoogleVisionService, WineLabelInfo } from './googleVision'
import { WineRecognitionService, WineRecognitionResult } from '../wineRecognition'
import { GOOGLE_VISION_API_KEY, APP_CONFIG } from '@/lib/config'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface GoogleVisionIntegrationConfig {
  enableCaching: boolean
  cacheExpirationHours: number
  retryAttempts: number
  confidenceThreshold: number
  enableRateLimiting: boolean
}

export interface GoogleVisionTestResult {
  isConfigured: boolean
  isConnected: boolean
  canProcessImages: boolean
  recognitionAccuracy: number
  responseTimeMs: number
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export class GoogleVisionIntegration {
  private static config: GoogleVisionIntegrationConfig = {
    enableCaching: true,
    cacheExpirationHours: 24,
    retryAttempts: 3,
    confidenceThreshold: 30,
    enableRateLimiting: true
  }

  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>()

  /**
   * Test Google Vision API integration comprehensively
   */
  static async runIntegrationTest(): Promise<GoogleVisionTestResult> {
    const result: GoogleVisionTestResult = {
      isConfigured: false,
      isConnected: false,
      canProcessImages: false,
      recognitionAccuracy: 0,
      responseTimeMs: 0,
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      // Test 1: Configuration Check
      result.isConfigured = await this.testConfiguration()
      if (!result.isConfigured) {
        result.errors.push('Google Vision API key not configured or invalid')
        result.recommendations.push('Set EXPO_PUBLIC_GOOGLE_VISION_API_KEY in environment variables')
        return result
      }

      // Test 2: API Connectivity
      const connectivityTest = await this.testConnectivity()
      result.isConnected = connectivityTest.success
      result.responseTimeMs = connectivityTest.responseTime
      
      if (!result.isConnected) {
        result.errors.push(`API connectivity failed: ${connectivityTest.error}`)
        result.recommendations.push('Check internet connection and API key permissions')
        return result
      }

      // Test 3: Image Processing
      const processingTest = await this.testImageProcessing()
      result.canProcessImages = processingTest.success
      result.recognitionAccuracy = processingTest.accuracy

      if (!result.canProcessImages) {
        result.errors.push(`Image processing failed: ${processingTest.error}`)
      }

      // Test 4: Performance and Rate Limiting
      const performanceTest = await this.testPerformanceAndRateLimiting()
      if (performanceTest.warnings.length > 0) {
        result.warnings.push(...performanceTest.warnings)
      }
      if (performanceTest.recommendations.length > 0) {
        result.recommendations.push(...performanceTest.recommendations)
      }

      // Test 5: Cache System
      const cacheTest = await this.testCacheSystem()
      if (!cacheTest.success) {
        result.warnings.push(`Cache system issue: ${cacheTest.error}`)
      }

      // Generate final recommendations
      if (result.recognitionAccuracy < 70) {
        result.recommendations.push('Consider implementing image preprocessing for better recognition')
      }
      if (result.responseTimeMs > 5000) {
        result.recommendations.push('Response time is high - consider image compression')
      }

    } catch (error) {
      result.errors.push(`Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Enhanced wine label recognition with caching and retry logic
   */
  static async recognizeWineLabelEnhanced(
    imageUri: string,
    options: {
      useCache?: boolean
      maxRetries?: number
      compressionQuality?: number
    } = {}
  ): Promise<{
    result: WineRecognitionResult | null
    error: string | null
    fromCache: boolean
    processingTimeMs: number
  }> {
    const startTime = Date.now()
    const {
      useCache = this.config.enableCaching,
      maxRetries = this.config.retryAttempts,
      compressionQuality = 0.8
    } = options

    try {
      // Check rate limits
      if (this.config.enableRateLimiting && !await this.checkRateLimit()) {
        return {
          result: null,
          error: 'Rate limit exceeded. Please try again later.',
          fromCache: false,
          processingTimeMs: Date.now() - startTime
        }
      }

      // Check cache first
      if (useCache) {
        const cacheKey = await this.generateImageCacheKey(imageUri)
        const cachedResult = await this.getCachedResult(cacheKey)
        if (cachedResult) {
          return {
            result: cachedResult,
            error: null,
            fromCache: true,
            processingTimeMs: Date.now() - startTime
          }
        }
      }

      // Process with retry logic
      let lastError: string | null = null
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { result, error } = await WineRecognitionService.recognizeWineLabel(imageUri)
          
          if (result) {
            // Cache successful result
            if (useCache && result.confidence >= this.config.confidenceThreshold) {
              const cacheKey = await this.generateImageCacheKey(imageUri)
              await this.cacheResult(cacheKey, result)
            }

            return {
              result,
              error: null,
              fromCache: false,
              processingTimeMs: Date.now() - startTime
            }
          } else {
            lastError = error
            if (attempt < maxRetries) {
              await this.delay(1000 * attempt) // Exponential backoff
            }
          }
        } catch (attemptError) {
          lastError = attemptError instanceof Error ? attemptError.message : 'Recognition failed'
          if (attempt < maxRetries) {
            await this.delay(1000 * attempt)
          }
        }
      }

      return {
        result: null,
        error: lastError || 'All retry attempts failed',
        fromCache: false,
        processingTimeMs: Date.now() - startTime
      }

    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Enhanced recognition failed',
        fromCache: false,
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Batch process multiple wine labels with progress tracking
   */
  static async batchProcessWineLabels(
    imageUris: string[],
    onProgress?: (processed: number, total: number, current?: WineRecognitionResult) => void
  ): Promise<{
    results: (WineRecognitionResult | null)[]
    errors: (string | null)[]
    successCount: number
    totalProcessingTimeMs: number
  }> {
    const startTime = Date.now()
    const results: (WineRecognitionResult | null)[] = []
    const errors: (string | null)[] = []
    let successCount = 0

    for (let i = 0; i < imageUris.length; i++) {
      try {
        const { result, error } = await this.recognizeWineLabelEnhanced(imageUris[i])
        
        results.push(result)
        errors.push(error)
        
        if (result) {
          successCount++
        }

        if (onProgress) {
          onProgress(i + 1, imageUris.length, result || undefined)
        }

        // Small delay between requests to respect rate limits
        if (i < imageUris.length - 1) {
          await this.delay(100)
        }

      } catch (batchError) {
        results.push(null)
        errors.push(batchError instanceof Error ? batchError.message : 'Batch processing failed')
        
        if (onProgress) {
          onProgress(i + 1, imageUris.length)
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
   * Get usage statistics for Google Vision API
   */
  static async getUsageStats(): Promise<{
    requestsToday: number
    requestsThisMonth: number
    averageResponseTime: number
    successRate: number
    cacheHitRate: number
  }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().substring(0, 7)
      
      const statsKey = `google_vision_stats_${today}`
      const monthlyStatsKey = `google_vision_stats_monthly_${thisMonth}`
      
      const dailyStats = await AsyncStorage.getItem(statsKey)
      const monthlyStats = await AsyncStorage.getItem(monthlyStatsKey)
      
      const daily = dailyStats ? JSON.parse(dailyStats) : { requests: 0, totalResponseTime: 0, successes: 0, cacheHits: 0 }
      const monthly = monthlyStats ? JSON.parse(monthlyStats) : { requests: 0 }

      return {
        requestsToday: daily.requests || 0,
        requestsThisMonth: monthly.requests || 0,
        averageResponseTime: daily.requests > 0 ? Math.round(daily.totalResponseTime / daily.requests) : 0,
        successRate: daily.requests > 0 ? Math.round((daily.successes / daily.requests) * 100) : 0,
        cacheHitRate: daily.requests > 0 ? Math.round((daily.cacheHits / daily.requests) * 100) : 0
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return {
        requestsToday: 0,
        requestsThisMonth: 0,
        averageResponseTime: 0,
        successRate: 0,
        cacheHitRate: 0
      }
    }
  }

  // Private helper methods

  private static async testConfiguration(): Promise<boolean> {
    return !!GOOGLE_VISION_API_KEY && GOOGLE_VISION_API_KEY.length > 10
  }

  private static async testConnectivity(): Promise<{
    success: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Test with a minimal request
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      })

      return {
        success: response.ok,
        responseTime: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  private static async testImageProcessing(): Promise<{
    success: boolean
    accuracy: number
    error?: string
  }> {
    try {
      // Use a sample wine label image (base64 encoded simple test image)
      const testImageUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      
      const { result, error } = await WineRecognitionService.recognizeWineLabel(testImageUri)
      
      return {
        success: !!result && !error,
        accuracy: result ? result.confidence : 0,
        error
      }
    } catch (error) {
      return {
        success: false,
        accuracy: 0,
        error: error instanceof Error ? error.message : 'Processing test failed'
      }
    }
  }

  private static async testPerformanceAndRateLimiting(): Promise<{
    warnings: string[]
    recommendations: string[]
  }> {
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check rate limits configuration
    const dailyLimit = APP_CONFIG.rateLimits.googleVision.requestsPerDay
    const minuteLimit = APP_CONFIG.rateLimits.googleVision.requestsPerMinute

    if (dailyLimit > 1000) {
      warnings.push('Daily rate limit is high - monitor usage carefully')
    }

    if (minuteLimit > 60) {
      recommendations.push('Consider implementing request queuing for high-volume usage')
    }

    return { warnings, recommendations }
  }

  private static async testCacheSystem(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const testKey = 'google_vision_cache_test'
      const testData = { test: true, timestamp: Date.now() }
      
      await AsyncStorage.setItem(testKey, JSON.stringify(testData))
      const retrieved = await AsyncStorage.getItem(testKey)
      await AsyncStorage.removeItem(testKey)
      
      return {
        success: !!retrieved && JSON.parse(retrieved).test === true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cache test failed'
      }
    }
  }

  private static async generateImageCacheKey(imageUri: string): Promise<string> {
    // Generate a hash-like key based on image URI
    const encoder = new TextEncoder()
    const data = encoder.encode(imageUri)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff
    }
    return `google_vision_cache_${Math.abs(hash)}`
  }

  private static async getCachedResult(cacheKey: string): Promise<WineRecognitionResult | null> {
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

  private static async cacheResult(cacheKey: string, result: WineRecognitionResult): Promise<void> {
    try {
      const cacheData = {
        result,
        timestamp: Date.now()
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache recognition result:', error)
    }
  }

  private static async checkRateLimit(): Promise<boolean> {
    const now = Date.now()
    const minuteKey = `minute_${Math.floor(now / 60000)}`
    const dayKey = `day_${Math.floor(now / 86400000)}`

    const minuteData = this.rateLimitStore.get(minuteKey) || { count: 0, resetTime: now + 60000 }
    const dayData = this.rateLimitStore.get(dayKey) || { count: 0, resetTime: now + 86400000 }

    if (minuteData.count >= APP_CONFIG.rateLimits.googleVision.requestsPerMinute) {
      return false
    }

    if (dayData.count >= APP_CONFIG.rateLimits.googleVision.requestsPerDay) {
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

  /**
   * Update integration configuration
   */
  static updateConfig(newConfig: Partial<GoogleVisionIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current integration configuration
   */
  static getConfig(): GoogleVisionIntegrationConfig {
    return { ...this.config }
  }
}