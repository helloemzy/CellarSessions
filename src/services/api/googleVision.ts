import { GOOGLE_VISION_API_KEY } from '@/lib/config'

export interface GoogleVisionText {
  description: string
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>
  }
}

export interface GoogleVisionResponse {
  textAnnotations: GoogleVisionText[]
  fullTextAnnotation: {
    text: string
    pages: Array<{
      width: number
      height: number
      blocks: Array<{
        boundingBox: { vertices: Array<{ x: number; y: number }> }
        paragraphs: Array<{
          boundingBox: { vertices: Array<{ x: number; y: number }> }
          words: Array<{
            boundingBox: { vertices: Array<{ x: number; y: number }> }
            symbols: Array<{
              text: string
              boundingBox: { vertices: Array<{ x: number; y: number }> }
            }>
          }>
        }>
      }>
    }>
  }
}

export interface WineLabelInfo {
  wineName?: string
  producer?: string
  vintage?: number
  appellation?: string
  alcoholContent?: string
  wineType?: string
  grapeVariety?: string[]
  confidence: number
  rawText: string
}

export class GoogleVisionService {
  private static readonly API_URL = 'https://vision.googleapis.com/v1/images:annotate'
  
  /**
   * Extract text from wine label image using Google Vision API
   */
  static async extractTextFromImage(imageUri: string): Promise<{
    data: GoogleVisionResponse | null
    error: string | null
  }> {
    try {
      if (!GOOGLE_VISION_API_KEY) {
        return { data: null, error: 'Google Vision API key not configured' }
      }

      // Convert image URI to base64
      const base64Image = await this.convertImageToBase64(imageUri)
      if (!base64Image) {
        return { data: null, error: 'Failed to process image' }
      }

      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 50
              },
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: {
              textDetectionParams: {
                enableTextDetectionConfidenceScore: true
              }
            }
          }
        ]
      }

      const response = await fetch(`${this.API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: `Google Vision API error: ${errorText}` }
      }

      const data = await response.json()
      
      if (data.responses?.[0]?.error) {
        return { 
          data: null, 
          error: `Google Vision API error: ${data.responses[0].error.message}` 
        }
      }

      return { data: data.responses?.[0] || null, error: null }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Parse extracted text to identify wine information
   */
  static parseWineLabel(visionResponse: GoogleVisionResponse): WineLabelInfo {
    const fullText = visionResponse.fullTextAnnotation?.text || ''
    const textAnnotations = visionResponse.textAnnotations || []
    
    const result: WineLabelInfo = {
      confidence: 0,
      rawText: fullText,
      grapeVariety: []
    }

    try {
      // Extract wine name (usually largest text or first significant text)
      const wineName = this.extractWineName(textAnnotations, fullText)
      if (wineName) {
        result.wineName = wineName
        result.confidence += 20
      }

      // Extract producer/winery
      const producer = this.extractProducer(textAnnotations, fullText)
      if (producer) {
        result.producer = producer
        result.confidence += 15
      }

      // Extract vintage year (4-digit year, usually 1900-2030)
      const vintage = this.extractVintage(fullText)
      if (vintage) {
        result.vintage = vintage
        result.confidence += 15
      }

      // Extract alcohol content (usually XX% or XX.X%)
      const alcoholContent = this.extractAlcoholContent(fullText)
      if (alcoholContent) {
        result.alcoholContent = alcoholContent
        result.confidence += 10
      }

      // Extract appellation/region
      const appellation = this.extractAppellation(fullText)
      if (appellation) {
        result.appellation = appellation
        result.confidence += 15
      }

      // Extract wine type
      const wineType = this.extractWineType(fullText)
      if (wineType) {
        result.wineType = wineType
        result.confidence += 10
      }

      // Extract grape varieties
      const grapeVarieties = this.extractGrapeVarieties(fullText)
      if (grapeVarieties.length > 0) {
        result.grapeVariety = grapeVarieties
        result.confidence += 15
      }

      return result
    } catch (error) {
      console.error('Error parsing wine label:', error)
      return result
    }
  }

  /**
   * Convert image URI to base64 string
   */
  private static async convertImageToBase64(imageUri: string): Promise<string | null> {
    try {
      const response = await fetch(imageUri)
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Remove data:image/jpeg;base64, prefix
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          } else {
            reject('Failed to convert image to base64')
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error converting image to base64:', error)
      return null
    }
  }

  /**
   * Extract wine name from text annotations
   */
  private static extractWineName(textAnnotations: GoogleVisionText[], fullText: string): string | undefined {
    // Look for wine names in common patterns
    const wineNamePatterns = [
      /([A-Z][a-zA-Z\s&'-]+(?:Estate|Vineyard|Winery|Cellars?|Reserve|Selection))/gi,
      /^([A-Z][a-zA-Z\s&'-]{3,30})\s*$/m,
      /([A-Z][a-zA-Z\s&'-]+(?:Red|White|Rosé|Champagne|Sparkling))/gi
    ]

    for (const pattern of wineNamePatterns) {
      const matches = fullText.match(pattern)
      if (matches && matches[0]) {
        return matches[0].trim()
      }
    }

    // Fallback: use first significant text annotation
    if (textAnnotations.length > 1) {
      const firstText = textAnnotations[1]?.description?.trim()
      if (firstText && firstText.length > 3 && firstText.length < 50) {
        return firstText
      }
    }

    return undefined
  }

  /**
   * Extract producer/winery name
   */
  private static extractProducer(textAnnotations: GoogleVisionText[], fullText: string): string | undefined {
    const producerPatterns = [
      /(?:Estate|Vineyard|Winery|Cellars?|Domaine|Château)\s*([A-Za-z\s&'-]+)/gi,
      /([A-Z][a-zA-Z\s&'-]+)(?:\s+(?:Estate|Vineyard|Winery|Cellars?))/gi,
      /Produced\s*by\s*([A-Za-z\s&'-]+)/gi
    ]

    for (const pattern of producerPatterns) {
      const match = pattern.exec(fullText)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return undefined
  }

  /**
   * Extract vintage year
   */
  private static extractVintage(text: string): number | undefined {
    const vintagePattern = /\b(19[8-9]\d|20[0-3]\d)\b/g
    const matches = text.match(vintagePattern)
    
    if (matches && matches.length > 0) {
      // Return the most recent/reasonable vintage
      const years = matches.map(year => parseInt(year)).sort((a, b) => b - a)
      return years[0]
    }

    return undefined
  }

  /**
   * Extract alcohol content
   */
  private static extractAlcoholContent(text: string): string | undefined {
    const alcoholPatterns = [
      /(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:alc|alcohol|vol)/gi,
      /alcohol\s*(?:by\s*volume)?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%/gi,
      /(\d{1,2}(?:\.\d{1,2})?)\s*%/g
    ]

    for (const pattern of alcoholPatterns) {
      const match = pattern.exec(text)
      if (match && match[1]) {
        const percentage = parseFloat(match[1])
        if (percentage >= 5 && percentage <= 20) {
          return `${percentage}%`
        }
      }
    }

    return undefined
  }

  /**
   * Extract appellation/region information
   */
  private static extractAppellation(text: string): string | undefined {
    const appellationPatterns = [
      /\b(Napa Valley|Sonoma|Bordeaux|Burgundy|Champagne|Chianti|Rioja|Barolo|Mosel|Rhine Valley|Mendoza|Central Valley|Hunter Valley)\b/gi,
      /\b([A-Z][a-zA-Z\s]+)\s+(?:AOC|AOP|DOC|DOCG|AVA|GI)\b/gi,
      /(?:Appellation|Region|Valley|County)\s+([A-Z][a-zA-Z\s]+)/gi
    ]

    for (const pattern of appellationPatterns) {
      const match = pattern.exec(text)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return undefined
  }

  /**
   * Extract wine type (Red, White, Rosé, etc.)
   */
  private static extractWineType(text: string): string | undefined {
    const wineTypePatterns = [
      /\b(Red|White|Rosé|Rose|Sparkling|Champagne|Port|Sherry|Dessert)\s*Wine\b/gi,
      /\b(Red|White|Rosé|Rose|Sparkling|Champagne)\b/gi
    ]

    for (const pattern of wineTypePatterns) {
      const match = pattern.exec(text)
      if (match && match[1]) {
        return match[1].toLowerCase()
      }
    }

    return undefined
  }

  /**
   * Extract grape varieties
   */
  private static extractGrapeVarieties(text: string): string[] {
    const commonGrapes = [
      'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Chardonnay', 'Sauvignon Blanc',
      'Pinot Grigio', 'Pinot Gris', 'Riesling', 'Syrah', 'Shiraz', 'Grenache',
      'Sangiovese', 'Nebbiolo', 'Tempranillo', 'Zinfandel', 'Malbec', 'Petit Verdot',
      'Cabernet Franc', 'Gewürztraminer', 'Viognier', 'Chenin Blanc', 'Sémillon',
      'Barbera', 'Dolcetto', 'Garnacha', 'Mourvèdre', 'Carignan', 'Petite Sirah'
    ]

    const foundGrapes: string[] = []

    for (const grape of commonGrapes) {
      const pattern = new RegExp(`\\b${grape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      if (pattern.test(text)) {
        foundGrapes.push(grape)
      }
    }

    return foundGrapes
  }

  /**
   * Get comprehensive wine label analysis
   */
  static async analyzeWineLabel(imageUri: string): Promise<{
    labelInfo: WineLabelInfo | null
    error: string | null
  }> {
    const { data: visionResponse, error } = await this.extractTextFromImage(imageUri)
    
    if (error || !visionResponse) {
      return { labelInfo: null, error }
    }

    try {
      const labelInfo = this.parseWineLabel(visionResponse)
      return { labelInfo, error: null }
    } catch (parseError) {
      return {
        labelInfo: null,
        error: parseError instanceof Error ? parseError.message : 'Failed to parse label'
      }
    }
  }
}