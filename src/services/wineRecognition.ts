import { supabase } from '@/lib/supabase'
import { GoogleVisionService, WineLabelInfo } from '@/services/api/googleVision'

export interface WineRecognitionResult extends WineLabelInfo {
  suggestedCorrections?: string[]
  similarWines?: any[]
}

export class WineRecognitionService {
  /**
   * Analyze wine label image and extract wine information using Google Vision API
   */
  static async recognizeWineLabel(imageUri: string): Promise<{
    result: WineRecognitionResult | null
    error: string | null
  }> {
    try {
      // Use Google Vision API for label recognition
      const { labelInfo, error: visionError } = await GoogleVisionService.analyzeWineLabel(imageUri)
      
      if (visionError || !labelInfo) {
        return { result: null, error: visionError || 'Failed to analyze wine label' }
      }

      // Find similar wines in our database
      const { wines: similarWines } = await this.findSimilarWines(labelInfo)
      
      // Generate suggestions based on recognition confidence
      const suggestedCorrections = this.generateSuggestions(labelInfo)

      const result: WineRecognitionResult = {
        ...labelInfo,
        suggestedCorrections,
        similarWines,
      }

      return { result, error: null }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Recognition failed'
      }
    }
  }

  /**
   * Generate suggestions for improving recognition accuracy
   */
  private static generateSuggestions(labelInfo: WineLabelInfo): string[] {
    const suggestions: string[] = []

    if (labelInfo.confidence < 50) {
      suggestions.push('Try retaking the photo with better lighting')
      suggestions.push('Ensure the wine label is flat and clearly visible')
    }

    if (!labelInfo.wineName) {
      suggestions.push('Wine name could not be detected - please enter manually')
    }

    if (!labelInfo.producer) {
      suggestions.push('Producer/winery name may need manual verification')
    }

    if (!labelInfo.vintage) {
      suggestions.push('Vintage year not detected - check the bottle neck or back label')
    }

    if (!labelInfo.grapeVariety || labelInfo.grapeVariety.length === 0) {
      suggestions.push('Grape varieties not detected - may be listed on back label')
    }

    if (labelInfo.confidence >= 70 && labelInfo.wineName && labelInfo.producer) {
      suggestions.push('Recognition looks good! Review and confirm the details')
    }

    return suggestions
  }

  /**
   * Save recognized wine to database for future reference
   */
  static async saveRecognizedWine(
    recognitionResult: WineRecognitionResult,
    imageUri: string
  ): Promise<{ wine: any | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { wine: null, error: 'User not authenticated' }
      }

      // Upload image to Supabase storage
      const imageUpload = await this.uploadWineImage(imageUri, user.id)
      if (imageUpload.error) {
        return { wine: null, error: imageUpload.error }
      }

      // Check if wine already exists in database
      const { data: existingWine } = await supabase
        .from('wines')
        .select('*')
        .eq('name', recognitionResult.wineName)
        .eq('producer', recognitionResult.producer)
        .eq('vintage', recognitionResult.vintage)
        .maybeSingle()

      if (existingWine) {
        return { wine: existingWine, error: null }
      }

      // Create new wine entry
      const { data: newWine, error } = await supabase
        .from('wines')
        .insert({
          name: recognitionResult.wineName,
          producer: recognitionResult.producer,
          vintage: recognitionResult.vintage,
          region: recognitionResult.appellation,
          wine_type: recognitionResult.wineType,
          grape_variety: recognitionResult.grapeVariety,
          alcohol_content: recognitionResult.alcoholContent,
          image_url: imageUpload.publicUrl,
          confidence_score: recognitionResult.confidence,
          raw_text: recognitionResult.rawText,
          created_by: user.id,
          recognition_source: 'google_vision'
        })
        .select()
        .single()

      if (error) {
        return { wine: null, error: error.message }
      }

      return { wine: newWine, error: null }
    } catch (error) {
      return {
        wine: null,
        error: error instanceof Error ? error.message : 'Failed to save wine'
      }
    }
  }

  /**
   * Upload wine image to Supabase storage
   */
  private static async uploadWineImage(
    imageUri: string,
    userId: string
  ): Promise<{ publicUrl: string | null; error: string | null }> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri)
      const blob = await response.blob()
      
      // Generate unique filename
      const fileExt = imageUri.split('.').pop() || 'jpg'
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('wine-photos')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600'
        })

      if (error) {
        return { publicUrl: null, error: error.message }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wine-photos')
        .getPublicUrl(data.path)

      return { publicUrl, error: null }
    } catch (error) {
      return {
        publicUrl: null,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Search existing wines that might match the recognition result
   */
  static async findSimilarWines(
    recognitionResult: WineLabelInfo
  ): Promise<{ wines: any[]; error: string | null }> {
    try {
      let query = supabase.from('wines').select('*')

      // Search by name if available
      if (recognitionResult.wineName) {
        query = query.ilike('name', `%${recognitionResult.wineName}%`)
      }

      // Filter by producer if available
      if (recognitionResult.producer) {
        query = query.ilike('producer', `%${recognitionResult.producer}%`)
      }

      // Filter by vintage if available (within 2 years)
      if (recognitionResult.vintage) {
        query = query.gte('vintage', recognitionResult.vintage - 2)
        query = query.lte('vintage', recognitionResult.vintage + 2)
      }

      // Filter by wine type if available
      if (recognitionResult.wineType) {
        query = query.eq('wine_type', recognitionResult.wineType.toLowerCase())
      }

      const { data: wines, error } = await query.limit(10)

      if (error) {
        return { wines: [], error: error.message }
      }

      return { wines: wines || [], error: null }
    } catch (error) {
      return {
        wines: [],
        error: error instanceof Error ? error.message : 'Search failed'
      }
    }
  }

  /**
   * Improve recognition by learning from user corrections
   */
  static async submitUserCorrection(
    originalResult: WineRecognitionResult,
    correctedData: Partial<WineLabelInfo>,
    imageUri: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Store user correction for improving future recognition
      const { error } = await supabase
        .from('wine_recognition_corrections')
        .insert({
          user_id: user.id,
          original_text: originalResult.rawText,
          original_confidence: originalResult.confidence,
          corrected_wine_name: correctedData.wineName,
          corrected_producer: correctedData.producer,
          corrected_vintage: correctedData.vintage,
          corrected_wine_type: correctedData.wineType,
          corrected_grape_variety: correctedData.grapeVariety,
          corrected_appellation: correctedData.appellation,
          corrected_alcohol_content: correctedData.alcoholContent,
          image_uri: imageUri,
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit correction'
      }
    }
  }

  /**
   * Get recognition accuracy statistics for the user
   */
  static async getRecognitionStats(userId: string): Promise<{
    stats: {
      totalRecognitions: number
      averageConfidence: number
      correctionsSubmitted: number
      topFailureReasons: string[]
    } | null
    error: string | null
  }> {
    try {
      // Get wine recognition statistics
      const { data: wines, error: winesError } = await supabase
        .from('wines')
        .select('confidence_score')
        .eq('created_by', userId)
        .eq('recognition_source', 'google_vision')

      if (winesError) {
        return { stats: null, error: winesError.message }
      }

      // Get corrections count
      const { count: correctionsCount, error: correctionsError } = await supabase
        .from('wine_recognition_corrections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (correctionsError) {
        return { stats: null, error: correctionsError.message }
      }

      const totalRecognitions = wines?.length || 0
      const averageConfidence = totalRecognitions > 0
        ? wines.reduce((sum, wine) => sum + (wine.confidence_score || 0), 0) / totalRecognitions
        : 0

      const stats = {
        totalRecognitions,
        averageConfidence: Math.round(averageConfidence),
        correctionsSubmitted: correctionsCount || 0,
        topFailureReasons: [
          'Poor lighting conditions',
          'Label text too small or blurry',
          'Reflective label surface',
          'Partial label visibility'
        ]
      }

      return { stats, error: null }
    } catch (error) {
      return {
        stats: null,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      }
    }
  }
}

// Legacy functions for backward compatibility
export async function recognizeWineLabel(imageUri: string) {
  const { result, error } = await WineRecognitionService.recognizeWineLabel(imageUri)
  
  if (error || !result) {
    return {
      success: false,
      error: error || 'Recognition failed'
    }
  }

  return {
    success: true,
    wineData: {
      name: result.wineName || 'Unknown Wine',
      producer: result.producer || 'Unknown Producer',
      vintage: result.vintage,
      region: result.appellation,
      varietal: result.grapeVariety?.join(', '),
      confidence: result.confidence / 100
    }
  }
}

export async function searchWineDatabase(query: {
  name?: string
  producer?: string
  vintage?: number
  region?: string
}): Promise<any[]> {
  const labelInfo: WineLabelInfo = {
    wineName: query.name,
    producer: query.producer,
    vintage: query.vintage,
    appellation: query.region,
    confidence: 100,
    rawText: ''
  }

  const { wines } = await WineRecognitionService.findSimilarWines(labelInfo)
  return wines
}

export async function saveWineToDatabase(wineData: {
  name: string
  producer: string
  vintage?: number
  region?: string
  varietal?: string
  imageUrl?: string
  userId: string
}) {
  try {
    const { data, error } = await supabase
      .from('wines')
      .insert([
        {
          name: wineData.name,
          producer: wineData.producer,
          vintage: wineData.vintage,
          region: wineData.region,
          grape_variety: wineData.varietal ? [wineData.varietal] : [],
          image_url: wineData.imageUrl,
          created_by: wineData.userId,
          wine_type: 'red', // TODO: Determine from recognition
          style: null,
          alcohol_content: null,
          serving_temp_min: null,
          serving_temp_max: null,
          description: null,
          food_pairings: []
        }
      ])
      .select()

    if (error) {
      console.error('Database save error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error('Save wine error:', error)
    return { success: false, error: 'Failed to save wine' }
  }
}