import { OPENAI_API_KEY } from '@/lib/config'

export interface OpenAITranscriptionResult {
  text: string
  language?: string
  duration?: number
  confidence?: number
}

export interface OpenAIWineAnalysisResult {
  wineAnalysis: {
    appearance?: {
      color?: string
      intensity?: string
      clarity?: string
    }
    nose?: {
      intensity?: string
      aromas?: string[]
      faults?: string[]
    }
    palate?: {
      sweetness?: string
      acidity?: string
      tannins?: string
      alcohol?: string
      body?: string
      flavors?: string[]
      finish?: string
    }
    conclusion?: {
      quality?: string
      readiness?: string
      potential?: string
    }
  }
  confidence: number
  suggestedCorrections?: string[]
}

export class OpenAIService {
  private static readonly API_URL = 'https://api.openai.com/v1'
  
  /**
   * Transcribe audio file to text using OpenAI Whisper API
   */
  static async transcribeAudio(audioUri: string): Promise<{
    result: OpenAITranscriptionResult | null
    error: string | null
  }> {
    try {
      if (!OPENAI_API_KEY) {
        return { result: null, error: 'OpenAI API key not configured' }
      }

      // Convert audio URI to blob
      const audioBlob = await this.convertAudioToBlob(audioUri)
      if (!audioBlob) {
        return { result: null, error: 'Failed to process audio file' }
      }

      // Create form data for multipart upload
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.m4a')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en') // Optimize for English wine terminology
      formData.append('response_format', 'verbose_json')

      const response = await fetch(`${this.API_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { result: null, error: `OpenAI API error: ${errorText}` }
      }

      const data = await response.json()
      
      const result: OpenAITranscriptionResult = {
        text: data.text || '',
        language: data.language,
        duration: data.duration,
        confidence: this.calculateTranscriptionConfidence(data)
      }

      return { result, error: null }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Transcription failed'
      }
    }
  }

  /**
   * Analyze wine tasting notes using OpenAI GPT for structured extraction
   */
  static async analyzeWineTastingNotes(
    tastingText: string,
    wineContext?: {
      name?: string
      producer?: string
      vintage?: number
      wineType?: string
      grapeVariety?: string[]
    }
  ): Promise<{
    result: OpenAIWineAnalysisResult | null
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
- Grape Variety: ${wineContext.grapeVariety?.join(', ') || 'Unknown'}
` : ''

      const prompt = `You are a professional sommelier and wine expert. Analyze the following wine tasting notes and extract structured information following the WSET Level 3 tasting methodology.

${contextInfo}

Tasting Notes:
${tastingText}

Please extract and categorize the wine characteristics into the following structure:

APPEARANCE:
- Color (e.g., pale lemon, medium ruby, deep purple)
- Intensity (pale, medium, deep)
- Clarity (clear, hazy, brilliant)

NOSE:
- Intensity (light, medium, pronounced)
- Aromas (primary, secondary, tertiary - be specific)
- Faults (if any - cork taint, oxidation, etc.)

PALATE:
- Sweetness (bone dry, dry, off-dry, medium sweet, sweet)
- Acidity (low, medium-, medium, medium+, high)
- Tannins (low, medium-, medium, medium+, high) [for reds only]
- Alcohol (low, medium, high)
- Body (light, medium-, medium, medium+, full)
- Flavors (specific flavor descriptors)
- Finish (short, medium-, medium, medium+, long)

CONCLUSION:
- Quality (poor, acceptable, good, very good, outstanding)
- Readiness (too young, ready now, past its best)
- Potential (drink now, can age 2-5 years, can age 5+ years)

Return the analysis as a JSON object with confidence score (0-100) based on how well the tasting notes match professional wine evaluation terminology. Also include any suggested corrections or improvements to the tasting methodology if applicable.`

      const response = await fetch(`${this.API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a Master Sommelier with expertise in WSET methodology. Respond only with valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3, // Lower temperature for more consistent analysis
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
        return { result: null, error: 'No analysis returned from OpenAI' }
      }

      try {
        const parsedResult = JSON.parse(content)
        
        const result: OpenAIWineAnalysisResult = {
          wineAnalysis: {
            appearance: parsedResult.appearance || {},
            nose: parsedResult.nose || {},
            palate: parsedResult.palate || {},
            conclusion: parsedResult.conclusion || {}
          },
          confidence: parsedResult.confidence || 0,
          suggestedCorrections: parsedResult.suggestedCorrections || []
        }

        return { result, error: null }
      } catch (parseError) {
        return { result: null, error: 'Failed to parse wine analysis response' }
      }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Wine analysis failed'
      }
    }
  }

  /**
   * Generate wine recommendations based on user preferences and tasting history
   */
  static async generateWineRecommendations(
    userProfile: {
      preferredStyles?: string[]
      favoriteRegions?: string[]
      priceRange?: { min: number; max: number }
      experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
    },
    recentTastings: Array<{
      wineName: string
      rating: number
      notes?: string
      wineType: string
      grapeVariety?: string[]
    }>,
    context?: string
  ): Promise<{
    result: {
      recommendations: Array<{
        category: string
        wines: Array<{
          name: string
          producer: string
          region: string
          grapeVariety: string[]
          priceRange: string
          reasoning: string
          similarTo?: string
        }>
      }>
      confidence: number
    } | null
    error: string | null
  }> {
    try {
      if (!OPENAI_API_KEY) {
        return { result: null, error: 'OpenAI API key not configured' }
      }

      const userContext = `
User Profile:
- Preferred Styles: ${userProfile.preferredStyles?.join(', ') || 'Not specified'}
- Favorite Regions: ${userProfile.favoriteRegions?.join(', ') || 'Not specified'}
- Price Range: $${userProfile.priceRange?.min || 15}-${userProfile.priceRange?.max || 50}
- Experience Level: ${userProfile.experienceLevel || 'intermediate'}

Recent Tastings (last 10):
${recentTastings.map(t => `- ${t.wineName} (${t.rating}/5): ${t.notes || 'No notes'}`).join('\n')}

${context ? `Additional Context: ${context}` : ''}
`

      const prompt = `You are a professional wine advisor with extensive knowledge of global wine regions, producers, and styles. Based on the user's profile and recent tasting history, recommend 8-12 specific wines across different categories.

${userContext}

Provide recommendations in these categories:
1. "Similar to favorites" - wines similar to their highest-rated recent tastings
2. "Explore new regions" - wines from regions they haven't tried but would likely enjoy
3. "Value discoveries" - excellent wines within their price range that offer great value
4. "Educational tasting" - wines that would expand their knowledge given their experience level

For each wine recommendation, provide:
- Specific wine name and producer (real wines only)
- Region/appellation
- Grape variety/blend
- Approximate price range
- Reasoning for recommendation (2-3 sentences)
- Which of their recent tastings it's similar to (if applicable)

Format as JSON with confidence score (0-100) based on how well matched the recommendations are to their profile.`

      const response = await fetch(`${this.API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a Master Sommelier and wine advisor. Recommend only real, existing wines. Respond only with valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.4,
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
        return { result: null, error: 'No recommendations returned from OpenAI' }
      }

      try {
        const parsedResult = JSON.parse(content)
        return { result: parsedResult, error: null }
      } catch (parseError) {
        return { result: null, error: 'Failed to parse recommendations response' }
      }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Recommendation generation failed'
      }
    }
  }

  /**
   * Convert audio URI to blob for upload
   */
  private static async convertAudioToBlob(audioUri: string): Promise<Blob | null> {
    try {
      const response = await fetch(audioUri)
      const blob = await response.blob()
      return blob
    } catch (error) {
      console.error('Error converting audio to blob:', error)
      return null
    }
  }

  /**
   * Calculate transcription confidence based on Whisper response
   */
  private static calculateTranscriptionConfidence(whisperData: any): number {
    // Whisper doesn't return explicit confidence scores
    // Calculate based on text length, word count, and presence of wine terminology
    const text = whisperData.text || ''
    const wordCount = text.split(' ').length
    
    let confidence = 50 // Base confidence
    
    // Length-based confidence
    if (wordCount > 10) confidence += 20
    if (wordCount > 30) confidence += 10
    
    // Wine terminology detection
    const wineTerms = [
      'wine', 'tannins', 'acidity', 'fruit', 'oak', 'vintage', 'finish',
      'nose', 'palate', 'color', 'aroma', 'flavor', 'dry', 'sweet',
      'cabernet', 'chardonnay', 'pinot', 'merlot', 'sauvignon'
    ]
    
    const foundTerms = wineTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    ).length
    
    confidence += Math.min(foundTerms * 3, 20)
    
    return Math.min(confidence, 95)
  }

  /**
   * Improve transcription accuracy for wine terminology
   */
  static async improveWineTranscription(
    originalTranscription: string
  ): Promise<{
    result: string | null
    error: string | null
  }> {
    try {
      if (!OPENAI_API_KEY) {
        return { result: null, error: 'OpenAI API key not configured' }
      }

      const prompt = `You are a wine expert helping to correct transcription errors in wine tasting notes. The following text was transcribed from audio using speech recognition, but may contain errors especially with wine-specific terminology.

Please correct any obvious transcription errors while preserving the original meaning and style. Focus especially on:
- Wine grape varieties (e.g. "cabernet" → "Cabernet", "shard away" → "Chardonnay")
- Wine regions and appellations
- Technical wine terms (tannins, acidity, finish, etc.)
- Color and aroma descriptors

Original transcription:
${originalTranscription}

Return only the corrected text without additional commentary.`

      const response = await fetch(`${this.API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a wine expert and editor. Correct transcription errors while preserving the original meaning and personal voice.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.2
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { result: null, error: `OpenAI API error: ${errorText}` }
      }

      const data = await response.json()
      const correctedText = data.choices?.[0]?.message?.content?.trim()

      if (!correctedText) {
        return { result: originalTranscription, error: null } // Return original if no correction
      }

      return { result: correctedText, error: null }
    } catch (error) {
      return {
        result: originalTranscription, // Fallback to original
        error: error instanceof Error ? error.message : 'Transcription improvement failed'
      }
    }
  }
}