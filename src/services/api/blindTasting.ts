import { supabase } from '@/services/api/supabase'

export interface BlindTastingGuess {
  wine_type?: string
  grape_variety?: string[]
  region?: string
  country?: string
  vintage_range?: {
    min: number
    max: number
  }
  alcohol_range?: {
    min: number
    max: number
  }
  style?: string
  confidence?: number // 1-5 scale
  reasoning?: string
}

export interface BlindTastingResult {
  id: string
  tasting_note_id: string
  user_id: string
  guess: BlindTastingGuess
  accuracy_score: number
  breakdown: {
    wine_type: number
    grape_variety: number
    region: number
    vintage: number
    overall: number
  }
  created_at: string
  tasting_note?: {
    wine?: {
      wine_type: string
      grape_variety?: string[]
      region?: string
      country?: string
      vintage?: number
      alcohol_content?: number
      style?: string
    }
  }
}

export interface BlindTastingStats {
  total_attempts: number
  average_accuracy: number
  accuracy_by_type: Record<string, number>
  accuracy_by_region: Record<string, number>
  improvement_trend: number[]
  strengths: string[]
  areas_for_improvement: string[]
  rank_percentile: number
  education_level_average: number
}

export class BlindTastingService {
  /**
   * Calculate accuracy score for a blind tasting guess
   * Uses weighted scoring system based on WSET/CMS methodology
   */
  static calculateAccuracyScore(
    guess: BlindTastingGuess,
    actual: {
      wine_type: string
      grape_variety?: string[]
      region?: string
      country?: string
      vintage?: number
      alcohol_content?: number
      style?: string
    }
  ): { score: number; breakdown: BlindTastingResult['breakdown'] } {
    let totalScore = 0
    const maxScore = 100
    const breakdown = {
      wine_type: 0,
      grape_variety: 0,
      region: 0,
      vintage: 0,
      overall: 0
    }

    // Wine Type (25 points) - Most important for beginners
    if (guess.wine_type && actual.wine_type) {
      if (guess.wine_type.toLowerCase() === actual.wine_type.toLowerCase()) {
        breakdown.wine_type = 25
      } else {
        // Partial credit for related types (e.g., Pinot Noir vs Red Wine)
        const typeMapping: Record<string, string[]> = {
          'red': ['red', 'pinot noir', 'cabernet sauvignon', 'merlot', 'syrah', 'shiraz'],
          'white': ['white', 'chardonnay', 'sauvignon blanc', 'riesling', 'pinot grigio'],
          'sparkling': ['sparkling', 'champagne', 'prosecco', 'cava'],
          'rosé': ['rosé', 'rose', 'pink'],
          'dessert': ['dessert', 'sweet', 'port', 'sherry']
        }
        
        const guessCategory = this.getWineCategory(guess.wine_type, typeMapping)
        const actualCategory = this.getWineCategory(actual.wine_type, typeMapping)
        
        if (guessCategory === actualCategory) {
          breakdown.wine_type = 12 // Partial credit
        }
      }
    }

    // Grape Variety (30 points) - Core skill for wine education
    if (guess.grape_variety && actual.grape_variety) {
      const guessVarieties = guess.grape_variety.map(v => v.toLowerCase())
      const actualVarieties = actual.grape_variety.map(v => v.toLowerCase())
      
      const exactMatches = guessVarieties.filter(g => actualVarieties.includes(g)).length
      const totalActual = actualVarieties.length
      
      if (exactMatches > 0) {
        breakdown.grape_variety = Math.round((exactMatches / Math.max(totalActual, guessVarieties.length)) * 30)
      }
      
      // Bonus for getting primary grape right
      if (actualVarieties.length > 0 && guessVarieties.includes(actualVarieties[0])) {
        breakdown.grape_variety = Math.min(30, breakdown.grape_variety + 10)
      }
    }

    // Region/Country (25 points) - Geographic accuracy
    let regionScore = 0
    if (guess.region && actual.region) {
      if (guess.region.toLowerCase() === actual.region.toLowerCase()) {
        regionScore = 25
      } else if (guess.country && actual.country) {
        // Check if same country
        if (guess.country.toLowerCase() === actual.country.toLowerCase()) {
          regionScore = 12 // Partial credit for correct country
        }
        // Check for regional proximity
        regionScore += this.calculateRegionalProximity(guess.region, actual.region, guess.country, actual.country)
      }
    } else if (guess.country && actual.country) {
      if (guess.country.toLowerCase() === actual.country.toLowerCase()) {
        regionScore = 15 // Credit for correct country only
      }
    }
    breakdown.region = regionScore

    // Vintage (20 points) - Age assessment
    if (guess.vintage_range && actual.vintage) {
      const { min, max } = guess.vintage_range
      if (actual.vintage >= min && actual.vintage <= max) {
        // Perfect range
        breakdown.vintage = 20
      } else {
        // Partial credit based on how close the guess was
        const centerGuess = (min + max) / 2
        const yearsDiff = Math.abs(centerGuess - actual.vintage)
        
        if (yearsDiff <= 2) {
          breakdown.vintage = 15
        } else if (yearsDiff <= 5) {
          breakdown.vintage = 10
        } else if (yearsDiff <= 10) {
          breakdown.vintage = 5
        }
      }
    }

    // Calculate overall score
    totalScore = breakdown.wine_type + breakdown.grape_variety + breakdown.region + breakdown.vintage
    breakdown.overall = Math.round((totalScore / maxScore) * 100)

    return {
      score: breakdown.overall,
      breakdown
    }
  }

  private static getWineCategory(wineType: string, mapping: Record<string, string[]>): string {
    const type = wineType.toLowerCase()
    for (const [category, types] of Object.entries(mapping)) {
      if (types.some(t => type.includes(t) || t.includes(type))) {
        return category
      }
    }
    return 'other'
  }

  private static calculateRegionalProximity(
    guessRegion: string, 
    actualRegion: string, 
    guessCountry?: string, 
    actualCountry?: string
  ): number {
    // Regional proximity mapping for common wine regions
    const proximityMap: Record<string, string[]> = {
      'burgundy': ['champagne', 'chablis', 'beaujolais'],
      'bordeaux': ['languedoc', 'rhône valley'],
      'tuscany': ['chianti', 'brunello di montalcino', 'vino nobile'],
      'napa valley': ['sonoma', 'paso robles', 'santa barbara'],
      'barossa valley': ['hunter valley', 'adelaide hills'],
      'rioja': ['ribera del duero', 'toro', 'navarra']
    }

    const guess = guessRegion.toLowerCase()
    const actual = actualRegion.toLowerCase()

    for (const [region, nearby] of Object.entries(proximityMap)) {
      if ((guess.includes(region) || region.includes(guess)) && 
          nearby.some(r => actual.includes(r) || r.includes(actual))) {
        return 8 // Proximity bonus
      }
    }

    return 0
  }

  static async submitBlindTastingGuess(
    tastingNoteId: string,
    guess: BlindTastingGuess
  ): Promise<{ result: BlindTastingResult | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { result: null, error: 'User not authenticated' }
      }

      // Get the actual wine data
      const { data: tastingNote, error: noteError } = await supabase
        .from('tasting_notes')
        .select(`
          id,
          wine:wines(
            wine_type,
            grape_variety,
            region,
            country,
            vintage,
            alcohol_content,
            style
          )
        `)
        .eq('id', tastingNoteId)
        .single()

      if (noteError || !tastingNote?.wine) {
        return { result: null, error: 'Tasting note not found' }
      }

      // Calculate accuracy score
      const { score, breakdown } = this.calculateAccuracyScore(guess, {
        wine_type: tastingNote.wine.wine_type,
        grape_variety: tastingNote.wine.grape_variety,
        region: tastingNote.wine.region,
        country: tastingNote.wine.country,
        vintage: tastingNote.wine.vintage,
        alcohol_content: tastingNote.wine.alcohol_content,
        style: tastingNote.wine.style
      })

      // Save the blind tasting result
      const { data: result, error: saveError } = await supabase
        .from('blind_tasting_results')
        .insert([{
          tasting_note_id: tastingNoteId,
          user_id: user.id,
          guess,
          accuracy_score: score,
          breakdown
        }])
        .select(`
          *,
          tasting_note:tasting_notes(
            wine:wines(*)
          )
        `)
        .single()

      if (saveError) {
        return { result: null, error: saveError.message }
      }

      return { result, error: null }
    } catch (err) {
      return { 
        result: null, 
        error: err instanceof Error ? err.message : 'Failed to submit blind tasting guess' 
      }
    }
  }

  static async getBlindTastingResults(
    userId?: string,
    page = 0,
    limit = 20
  ): Promise<{ results: BlindTastingResult[]; totalCount: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { results: [], totalCount: 0, error: 'User not authenticated' }
      }

      const targetUserId = userId || user.id

      const { data: results, error, count } = await supabase
        .from('blind_tasting_results')
        .select(`
          *,
          tasting_note:tasting_notes(
            wine:wines(*)
          )
        `, { count: 'exact' })
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) {
        return { results: [], totalCount: 0, error: error.message }
      }

      return { results: results || [], totalCount: count || 0, error: null }
    } catch (err) {
      return { 
        results: [], 
        totalCount: 0, 
        error: err instanceof Error ? err.message : 'Failed to fetch blind tasting results' 
      }
    }
  }

  static async getBlindTastingStats(userId?: string): Promise<{ stats: BlindTastingStats | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { stats: null, error: 'User not authenticated' }
      }

      const targetUserId = userId || user.id

      // Get all results for the user
      const { data: results, error } = await supabase
        .from('blind_tasting_results')
        .select(`
          *,
          tasting_note:tasting_notes(
            wine:wines(wine_type, region)
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true })

      if (error) {
        return { stats: null, error: error.message }
      }

      if (!results || results.length === 0) {
        return {
          stats: {
            total_attempts: 0,
            average_accuracy: 0,
            accuracy_by_type: {},
            accuracy_by_region: {},
            improvement_trend: [],
            strengths: [],
            areas_for_improvement: [],
            rank_percentile: 0,
            education_level_average: 0
          },
          error: null
        }
      }

      // Calculate statistics
      const totalAttempts = results.length
      const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy_score, 0) / totalAttempts

      // Accuracy by wine type
      const accuracyByType: Record<string, number> = {}
      const typeGroups: Record<string, number[]> = {}
      
      results.forEach(result => {
        const wineType = result.tasting_note?.wine?.wine_type
        if (wineType) {
          if (!typeGroups[wineType]) typeGroups[wineType] = []
          typeGroups[wineType].push(result.accuracy_score)
        }
      })

      Object.entries(typeGroups).forEach(([type, scores]) => {
        accuracyByType[type] = scores.reduce((sum, score) => sum + score, 0) / scores.length
      })

      // Accuracy by region
      const accuracyByRegion: Record<string, number> = {}
      const regionGroups: Record<string, number[]> = {}
      
      results.forEach(result => {
        const region = result.tasting_note?.wine?.region
        if (region) {
          if (!regionGroups[region]) regionGroups[region] = []
          regionGroups[region].push(result.accuracy_score)
        }
      })

      Object.entries(regionGroups).forEach(([region, scores]) => {
        accuracyByRegion[region] = scores.reduce((sum, score) => sum + score, 0) / scores.length
      })

      // Improvement trend (last 10 results)
      const recentResults = results.slice(-10)
      const improvementTrend = recentResults.map(r => r.accuracy_score)

      // Identify strengths and weaknesses
      const strengths: string[] = []
      const areasForImprovement: string[] = []

      Object.entries(accuracyByType).forEach(([type, accuracy]) => {
        if (accuracy > averageAccuracy + 10) {
          strengths.push(`${type} wines`)
        } else if (accuracy < averageAccuracy - 10) {
          areasForImprovement.push(`${type} wines`)
        }
      })

      // Calculate breakdown averages to identify specific strengths/weaknesses
      const avgBreakdown = {
        wine_type: 0,
        grape_variety: 0,
        region: 0,
        vintage: 0
      }

      results.forEach(result => {
        avgBreakdown.wine_type += result.breakdown.wine_type
        avgBreakdown.grape_variety += result.breakdown.grape_variety
        avgBreakdown.region += result.breakdown.region
        avgBreakdown.vintage += result.breakdown.vintage
      })

      Object.keys(avgBreakdown).forEach(key => {
        avgBreakdown[key as keyof typeof avgBreakdown] /= totalAttempts
      })

      if (avgBreakdown.wine_type > 20) strengths.push('Wine type identification')
      else if (avgBreakdown.wine_type < 10) areasForImprovement.push('Wine type identification')

      if (avgBreakdown.grape_variety > 20) strengths.push('Grape variety recognition')
      else if (avgBreakdown.grape_variety < 10) areasForImprovement.push('Grape variety recognition')

      if (avgBreakdown.region > 15) strengths.push('Regional identification')
      else if (avgBreakdown.region < 8) areasForImprovement.push('Regional identification')

      if (avgBreakdown.vintage > 15) strengths.push('Vintage assessment')
      else if (avgBreakdown.vintage < 8) areasForImprovement.push('Vintage assessment')

      const stats: BlindTastingStats = {
        total_attempts: totalAttempts,
        average_accuracy: Math.round(averageAccuracy),
        accuracy_by_type: accuracyByType,
        accuracy_by_region: accuracyByRegion,
        improvement_trend: improvementTrend,
        strengths: strengths.slice(0, 5),
        areas_for_improvement: areasForImprovement.slice(0, 5),
        rank_percentile: 50, // TODO: Calculate based on other users
        education_level_average: 65 // TODO: Calculate based on education level
      }

      return { stats, error: null }
    } catch (err) {
      return { 
        stats: null, 
        error: err instanceof Error ? err.message : 'Failed to calculate blind tasting stats' 
      }
    }
  }

  static async getLeaderboard(
    educationLevel?: string,
    timeframe = 'all_time',
    limit = 20
  ): Promise<{ leaderboard: Array<{
    user_id: string
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
    average_accuracy: number
    total_attempts: number
    rank: number
  }>; error: string | null }> {
    try {
      // This would require a more complex query or database function
      // For now, return empty leaderboard
      return { leaderboard: [], error: null }
    } catch (err) {
      return { 
        leaderboard: [], 
        error: err instanceof Error ? err.message : 'Failed to fetch leaderboard' 
      }
    }
  }
}