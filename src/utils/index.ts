import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to merge class names conditionally
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = new Date(date)
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    case 'long':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    default:
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  }
  
  return formatDate(date, 'short')
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Format wine type for display
 */
export function formatWineType(wineType: string): string {
  return wineType
    .split('_')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Format price range for display
 */
export function formatPriceRange(priceRange: string): string {
  switch (priceRange) {
    case 'UNDER_15':
      return 'Under $15'
    case '15_30':
      return '$15 - $30'
    case '30_50':
      return '$30 - $50'
    case '50_100':
      return '$50 - $100'
    case 'OVER_100':
      return 'Over $100'
    default:
      return 'Unknown'
  }
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate random string for invite codes
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

/**
 * Format rating for display (e.g., 4.5 stars)
 */
export function formatRating(rating: number): string {
  return `${rating.toFixed(1)} star${rating === 1 ? '' : 's'}`
}

/**
 * Convert rating to star display
 */
export function getStarDisplay(rating: number): { full: number; half: boolean; empty: number } {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  
  return { full, half, empty }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Check if string is empty or only whitespace
 */
export function isEmptyString(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Sleep/delay utility for async functions
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create error object with message
 */
export function createError(message: string, code?: string): Error {
  const error = new Error(message)
  if (code) {
    ;(error as any).code = code
  }
  return error
}

/**
 * Safe JSON parsing
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

/**
 * Generate wine color from wine type
 */
export function getWineColor(wineType: string): string {
  switch (wineType.toUpperCase()) {
    case 'RED':
      return '#722F37'
    case 'WHITE':
      return '#F4E4BC'
    case 'ROSE':
      return '#E8A4A0'
    case 'SPARKLING':
      return '#F0F8E8'
    case 'DESSERT':
      return '#8B4513'
    case 'FORTIFIED':
      return '#654321'
    default:
      return '#6B7280'
  }
}

/**
 * Calculate wine serving temperature display
 */
export function formatServingTemperature(min?: number, max?: number): string {
  if (!min && !max) return 'Room temperature'
  if (!max) return `${min}°C`
  if (!min) return `${max}°C`
  if (min === max) return `${min}°C`
  return `${min}-${max}°C`
}

/**
 * Calculate blind tasting accuracy score
 */
export function calculateBlindTastingAccuracy(
  actualWine: {
    wine_type: string
    country: string
    region?: string
    grape_varieties: string[]
    vintage?: number
  },
  guess: {
    guessed_wine_type: string
    guessed_country: string
    guessed_region?: string
    guessed_grape_varieties: string[]
    guessed_vintage?: number
  }
): {
  overall: number
  variety: number
  region: number
  country: number
  vintage: number
} {
  // Weights for different components
  const weights = {
    variety: 0.4,
    region: 0.25,
    country: 0.2,
    vintage: 0.15,
  }
  
  // Calculate variety accuracy (fuzzy matching)
  const varietyScore = calculateVarietyAccuracy(actualWine.grape_varieties, guess.guessed_grape_varieties)
  
  // Calculate region accuracy
  const regionScore = calculateRegionAccuracy(actualWine.region, guess.guessed_region)
  
  // Calculate country accuracy
  const countryScore = actualWine.country.toLowerCase() === guess.guessed_country.toLowerCase() ? 100 : 0
  
  // Calculate vintage accuracy (±2 years tolerance)
  const vintageScore = calculateVintageAccuracy(actualWine.vintage, guess.guessed_vintage)
  
  // Calculate overall weighted score
  const overall = Math.round(
    varietyScore * weights.variety +
    regionScore * weights.region +
    countryScore * weights.country +
    vintageScore * weights.vintage
  )
  
  return {
    overall,
    variety: varietyScore,
    region: regionScore,
    country: countryScore,
    vintage: vintageScore,
  }
}

function calculateVarietyAccuracy(actual: string[], guessed: string[]): number {
  if (actual.length === 0 && guessed.length === 0) return 100
  if (actual.length === 0 || guessed.length === 0) return 0
  
  let matches = 0
  for (const actualVariety of actual) {
    if (guessed.some(g => g.toLowerCase().includes(actualVariety.toLowerCase()) || 
                           actualVariety.toLowerCase().includes(g.toLowerCase()))) {
      matches++
    }
  }
  
  return Math.round((matches / Math.max(actual.length, guessed.length)) * 100)
}

function calculateRegionAccuracy(actual?: string, guessed?: string): number {
  if (!actual && !guessed) return 100
  if (!actual || !guessed) return 0
  
  const actualLower = actual.toLowerCase()
  const guessedLower = guessed.toLowerCase()
  
  if (actualLower === guessedLower) return 100
  if (actualLower.includes(guessedLower) || guessedLower.includes(actualLower)) return 70
  
  return 0
}

function calculateVintageAccuracy(actual?: number, guessed?: number): number {
  if (!actual && !guessed) return 100
  if (!actual || !guessed) return 0
  
  const diff = Math.abs(actual - guessed)
  if (diff === 0) return 100
  if (diff <= 2) return 75
  if (diff <= 5) return 50
  
  return 0
}