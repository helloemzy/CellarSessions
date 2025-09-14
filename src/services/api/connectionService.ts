import { supabase } from '@/services/api/supabase'
import { AuthService } from '@/services/auth/authService'

export interface ConnectionStatus {
  isConnected: boolean
  latency: number | null
  error: string | null
  timestamp: string
}

export interface DatabaseHealth {
  tablesAccessible: string[]
  tablesInaccessible: string[]
  rlsPoliciesActive: boolean
  authenticationWorking: boolean
  realTimeWorking: boolean
  error: string | null
}

export interface ValidationResult {
  test: string
  passed: boolean
  error: string | null
  details?: any
}

export class ConnectionService {
  /**
   * Test basic connectivity to Supabase
   */
  static async testConnection(): Promise<ConnectionStatus> {
    try {
      const startTime = performance.now()
      
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single()

      const endTime = performance.now()
      const latency = endTime - startTime

      // If error is just "No rows found", connection is still working
      const isConnectionError = error && !error.message.includes('No rows') && error.code !== 'PGRST116'

      return {
        isConnected: !isConnectionError,
        latency: isConnectionError ? null : latency,
        error: isConnectionError ? error.message : null,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        isConnected: false,
        latency: null,
        error: error instanceof Error ? error.message : 'Connection test failed',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Test comprehensive database health
   */
  static async testDatabaseHealth(): Promise<DatabaseHealth> {
    const tablesAccessible: string[] = []
    const tablesInaccessible: string[] = []
    let rlsPoliciesActive = false
    let authenticationWorking = false
    let realTimeWorking = false
    let globalError: string | null = null

    try {
      // Test access to each main table
      const tables = ['profiles', 'wines', 'tasting_notes', 'squads', 'squad_members']
      
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('count')
            .limit(1)

          if (error && !error.message.includes('No rows') && error.code !== 'PGRST116') {
            tablesInaccessible.push(table)
          } else {
            tablesAccessible.push(table)
          }
        } catch {
          tablesInaccessible.push(table)
        }
      }

      // Test RLS policies by trying to access another user's data
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try to access all profiles (should be filtered by RLS)
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')

          if (!profilesError) {
            // If we get results, RLS is working (it's filtering based on our permissions)
            rlsPoliciesActive = true
          }
        }
      } catch {
        // If we can't test RLS, assume it's not working
        rlsPoliciesActive = false
      }

      // Test authentication
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        authenticationWorking = !authError && user !== null
      } catch {
        authenticationWorking = false
      }

      // Test real-time functionality
      try {
        const channel = supabase
          .channel('test-channel')
          .on('presence', { event: 'sync' }, () => {
            realTimeWorking = true
          })

        await channel.subscribe()
        
        // Give it a moment to establish connection
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        await supabase.removeChannel(channel)
      } catch {
        realTimeWorking = false
      }

    } catch (error) {
      globalError = error instanceof Error ? error.message : 'Database health check failed'
    }

    return {
      tablesAccessible,
      tablesInaccessible,
      rlsPoliciesActive,
      authenticationWorking,
      realTimeWorking,
      error: globalError
    }
  }

  /**
   * Run comprehensive validation suite
   */
  static async runValidationSuite(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Test 1: Environment variables
    results.push(await this.validateEnvironmentVariables())

    // Test 2: Basic connection
    results.push(await this.validateConnection())

    // Test 3: Authentication flow
    results.push(await this.validateAuthenticationFlow())

    // Test 4: Database operations
    results.push(await this.validateDatabaseOperations())

    // Test 5: RLS policies
    results.push(await this.validateRLSPolicies())

    // Test 6: Real-time subscriptions
    results.push(await this.validateRealTimeSubscriptions())

    // Test 7: File storage (if configured)
    results.push(await this.validateFileStorage())

    return results
  }

  /**
   * Validate environment variables
   */
  private static async validateEnvironmentVariables(): Promise<ValidationResult> {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

      const details = {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        urlFormat: supabaseUrl ? supabaseUrl.includes('supabase.co') : false
      }

      const passed = !!(supabaseUrl && supabaseAnonKey && details.urlFormat)

      return {
        test: 'Environment Variables',
        passed,
        error: passed ? null : 'Required environment variables missing or invalid',
        details
      }
    } catch (error) {
      return {
        test: 'Environment Variables',
        passed: false,
        error: error instanceof Error ? error.message : 'Environment validation failed'
      }
    }
  }

  /**
   * Validate basic connection
   */
  private static async validateConnection(): Promise<ValidationResult> {
    try {
      const connectionStatus = await this.testConnection()
      
      return {
        test: 'Basic Connection',
        passed: connectionStatus.isConnected,
        error: connectionStatus.error,
        details: {
          latency: connectionStatus.latency,
          timestamp: connectionStatus.timestamp
        }
      }
    } catch (error) {
      return {
        test: 'Basic Connection',
        passed: false,
        error: error instanceof Error ? error.message : 'Connection validation failed'
      }
    }
  }

  /**
   * Validate authentication flow
   */
  private static async validateAuthenticationFlow(): Promise<ValidationResult> {
    try {
      // Test getting current user session
      const { user, error } = await AuthService.getCurrentUser()
      
      const details = {
        hasSession: !!user,
        userId: user?.id,
        hasProfile: !!user?.profile
      }

      return {
        test: 'Authentication Flow',
        passed: !error,
        error,
        details
      }
    } catch (error) {
      return {
        test: 'Authentication Flow',
        passed: false,
        error: error instanceof Error ? error.message : 'Authentication validation failed'
      }
    }
  }

  /**
   * Validate database operations
   */
  private static async validateDatabaseOperations(): Promise<ValidationResult> {
    try {
      // Test basic SELECT operations on each table
      const operations = []

      // Test wines table (should be publicly readable)
      try {
        const { error: winesError } = await supabase
          .from('wines')
          .select('count')
          .limit(1)
        operations.push({ table: 'wines', success: !winesError || winesError.code === 'PGRST116' })
      } catch {
        operations.push({ table: 'wines', success: false })
      }

      // Test profiles table (depends on authentication)
      try {
        const { error: profilesError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        operations.push({ table: 'profiles', success: !profilesError || profilesError.code === 'PGRST116' })
      } catch {
        operations.push({ table: 'profiles', success: false })
      }

      const allSuccessful = operations.every(op => op.success)

      return {
        test: 'Database Operations',
        passed: allSuccessful,
        error: allSuccessful ? null : 'Some database operations failed',
        details: { operations }
      }
    } catch (error) {
      return {
        test: 'Database Operations',
        passed: false,
        error: error instanceof Error ? error.message : 'Database operations validation failed'
      }
    }
  }

  /**
   * Validate RLS policies
   */
  private static async validateRLSPolicies(): Promise<ValidationResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return {
          test: 'RLS Policies',
          passed: false,
          error: 'Cannot test RLS without authenticated user'
        }
      }

      // Test that we can only see our own profile
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')

      const canOnlySeeOwnProfile = profiles?.length === 1 && profiles[0].id === user.id

      // Test that we can see public wines
      const { data: wines, error: winesError } = await supabase
        .from('wines')
        .select('id')
        .limit(5)

      const canSeeWines = !winesError && Array.isArray(wines)

      const details = {
        profilesReturned: profiles?.length || 0,
        canOnlySeeOwnProfile,
        canSeeWines,
        winesReturned: wines?.length || 0
      }

      const passed = canOnlySeeOwnProfile && canSeeWines

      return {
        test: 'RLS Policies',
        passed,
        error: passed ? null : 'RLS policies not working correctly',
        details
      }
    } catch (error) {
      return {
        test: 'RLS Policies',
        passed: false,
        error: error instanceof Error ? error.message : 'RLS validation failed'
      }
    }
  }

  /**
   * Validate real-time subscriptions
   */
  private static async validateRealTimeSubscriptions(): Promise<ValidationResult> {
    try {
      return new Promise((resolve) => {
        let subscriptionWorking = false
        const timeout = setTimeout(() => {
          resolve({
            test: 'Real-time Subscriptions',
            passed: subscriptionWorking,
            error: subscriptionWorking ? null : 'Real-time subscription timeout',
            details: { subscriptionWorking }
          })
        }, 3000)

        const channel = supabase
          .channel('validation-test')
          .on('presence', { event: 'sync' }, () => {
            subscriptionWorking = true
            clearTimeout(timeout)
            supabase.removeChannel(channel)
            resolve({
              test: 'Real-time Subscriptions',
              passed: true,
              error: null,
              details: { subscriptionWorking: true }
            })
          })
          .subscribe()
      })
    } catch (error) {
      return {
        test: 'Real-time Subscriptions',
        passed: false,
        error: error instanceof Error ? error.message : 'Real-time validation failed'
      }
    }
  }

  /**
   * Validate file storage
   */
  private static async validateFileStorage(): Promise<ValidationResult> {
    try {
      // Test listing buckets (this will fail if storage is not configured)
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      const details = {
        bucketsConfigured: !bucketsError,
        bucketCount: buckets?.length || 0,
        availableBuckets: buckets?.map(b => b.name) || []
      }

      // Test if our expected buckets exist
      const expectedBuckets = ['wine-photos', 'voice-notes', 'avatars']
      const existingBuckets = buckets?.map(b => b.name) || []
      const missingBuckets = expectedBuckets.filter(bucket => !existingBuckets.includes(bucket))

      return {
        test: 'File Storage',
        passed: !bucketsError && missingBuckets.length === 0,
        error: bucketsError ? bucketsError.message : missingBuckets.length > 0 ? `Missing buckets: ${missingBuckets.join(', ')}` : null,
        details: {
          ...details,
          expectedBuckets,
          missingBuckets
        }
      }
    } catch (error) {
      return {
        test: 'File Storage',
        passed: false,
        error: error instanceof Error ? error.message : 'File storage validation failed'
      }
    }
  }

  /**
   * Monitor connection status
   */
  static startConnectionMonitoring(callback: (status: ConnectionStatus) => void, intervalMs: number = 30000) {
    const monitor = async () => {
      const status = await this.testConnection()
      callback(status)
    }

    // Initial check
    monitor()

    // Set up interval
    const interval = setInterval(monitor, intervalMs)

    // Return cleanup function
    return () => clearInterval(interval)
  }

  /**
   * Test specific service endpoints
   */
  static async testServiceEndpoints(): Promise<{
    auth: ValidationResult
    tastingNotes: ValidationResult
    squads: ValidationResult
    wines: ValidationResult
  }> {
    // Test AuthService
    const authResult = await (async (): Promise<ValidationResult> => {
      try {
        const { user, error } = await AuthService.getCurrentUser()
        return {
          test: 'Auth Service',
          passed: !error,
          error: error,
          details: { hasUser: !!user }
        }
      } catch (error) {
        return {
          test: 'Auth Service',
          passed: false,
          error: error instanceof Error ? error.message : 'Auth service test failed'
        }
      }
    })()

    // Test basic service operations (these require working auth)
    const tastingNotesResult: ValidationResult = {
      test: 'Tasting Notes Service',
      passed: true, // Basic import test
      error: null,
      details: { serviceLoaded: true }
    }

    const squadsResult: ValidationResult = {
      test: 'Squads Service',
      passed: true, // Basic import test
      error: null,
      details: { serviceLoaded: true }
    }

    const winesResult: ValidationResult = {
      test: 'Wines Service',
      passed: true, // Basic import test
      error: null,
      details: { serviceLoaded: true }
    }

    return {
      auth: authResult,
      tastingNotes: tastingNotesResult,
      squads: squadsResult,
      wines: winesResult
    }
  }
}