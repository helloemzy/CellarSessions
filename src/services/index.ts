// =============================================================================
// CellarSessions Services Index
// =============================================================================
// Central export point for all application services
// This file provides organized exports for easy imports throughout the app

// =============================================================================
// DATABASE AND CLIENT
// =============================================================================
export { supabase, type Database, type SupabaseClient } from './api/supabase'

// =============================================================================
// AUTHENTICATION SERVICES
// =============================================================================
export { 
  AuthService,
  type AuthUser,
  type SignUpCredentials,
  type SignInCredentials
} from './auth/authService'

// =============================================================================
// API SERVICES
// =============================================================================
export {
  TastingNotesService,
  type TastingNoteWithWine,
  type TastingNoteFilters,
  type TastingNoteStats
} from './api/tastingNotesService'

export {
  SquadsService,
  type SquadWithMembers,
  type SquadInvitation,
  type SquadFilters
} from './api/squadsService'

export {
  WinesService,
  type WineWithStats,
  type WineFilters,
  type WineSearchResult
} from './api/winesService'

// =============================================================================
// REAL-TIME SERVICES
// =============================================================================
export {
  RealTimeService,
  type RealtimeSubscription,
  type TastingNoteEvent,
  type SquadEvent,
  type SquadMemberEvent,
  type PresenceState
} from './api/realTimeService'

// =============================================================================
// CONNECTION AND VALIDATION
// =============================================================================
export {
  ConnectionService,
  type ConnectionStatus,
  type DatabaseHealth,
  type ValidationResult
} from './api/connectionService'

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================
// Database types for easy access
export type {
  // Table types
  Profile,
  Wine,
  TastingNote,
  BlindTastingGuess,
  Squad,
  SquadMember,
  
  // Insert types
  ProfileInsert,
  WineInsert,
  TastingNoteInsert,
  BlindTastingGuessInsert,
  SquadInsert,
  SquadMemberInsert,
  
  // Update types
  ProfileUpdate,
  WineUpdate,
  TastingNoteUpdate,
  SquadUpdate,
  SquadMemberUpdate
} from './types'

// =============================================================================
// SERVICE UTILITIES
// =============================================================================
/**
 * Initialize all services and validate configuration
 * Call this on app startup to ensure everything is properly configured
 */
export async function initializeServices(): Promise<{
  success: boolean
  errors: string[]
}> {
  const errors: string[] = []

  try {
    // Import services dynamically to avoid circular dependencies
    const { ConnectionService } = await import('./api/connectionService')
    
    // Test basic connection
    const connectionStatus = await ConnectionService.testConnection()
    if (!connectionStatus.isConnected) {
      errors.push(`Connection failed: ${connectionStatus.error}`)
    }

  } catch (error) {
    errors.push(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    success: errors.length === 0,
    errors
  }
}

/**
 * Run a comprehensive health check of all services
 */
export async function runHealthCheck(): Promise<{
  overallHealth: 'healthy' | 'degraded' | 'unhealthy'
  results: import('./api/connectionService').ValidationResult[]
  timestamp: string
}> {
  try {
    const { ConnectionService } = await import('./api/connectionService')
    const results = await ConnectionService.runValidationSuite()
    const failedTests = results.filter((r: import('./api/connectionService').ValidationResult) => !r.passed)
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (failedTests.length === 0) {
      overallHealth = 'healthy'
    } else if (failedTests.length <= 2) {
      overallHealth = 'degraded'
    } else {
      overallHealth = 'unhealthy'
    }

    return {
      overallHealth,
      results,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      overallHealth: 'unhealthy',
      results: [{
        test: 'Health Check',
        passed: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      }],
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Create a subscription manager for managing multiple real-time subscriptions
 */
export const createSubscriptionManager = () => {
  const { RealTimeService } = require('./api/realTimeService')
  return RealTimeService.createSubscriptionManager()
}

/**
 * Default export with all services
 */
const services = {
  // Services are imported dynamically to avoid circular dependencies
  initialize: initializeServices,
  healthCheck: runHealthCheck,
  createSubscriptionManager
}

export default services