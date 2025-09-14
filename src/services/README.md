# CellarSessions Services Layer

This directory contains the complete service layer for the CellarSessions application, providing a comprehensive interface to interact with the Supabase backend.

## Overview

The services layer includes:
- **Authentication Service** - User authentication and profile management
- **Tasting Notes Service** - CRUD operations for tasting notes and blind tasting features
- **Squads Service** - Social features including squads, memberships, and invitations
- **Wines Service** - Wine database management with search and recommendations
- **Real-time Service** - WebSocket subscriptions for live updates
- **Connection Service** - Health checks, validation, and monitoring

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env` and configure your Supabase credentials:

```bash
cp .env.example .env
```

Update the required fields:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
```

### 2. Initialize Services

```typescript
import { initializeServices } from '@/services'

// Initialize on app startup
const { success, errors } = await initializeServices()
if (!success) {
  console.error('Service initialization failed:', errors)
}
```

### 3. Basic Usage

```typescript
import { AuthService, TastingNotesService, SquadsService } from '@/services'

// Authentication
const { user, error } = await AuthService.signIn({
  email: 'user@example.com',
  password: 'password123'
})

// Create a tasting note
const { tastingNote } = await TastingNotesService.createTastingNote({
  wine_id: 'wine-uuid',
  tasting_date: '2024-01-15',
  rating: 4,
  visibility: 'PUBLIC'
})

// Get user's squads
const { squads } = await SquadsService.getUserSquads()
```

## Service Documentation

### Authentication Service

The `AuthService` handles all user authentication operations:

```typescript
import { AuthService, type AuthUser } from '@/services'

// Sign up new user
const { user, error } = await AuthService.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  displayName: 'Wine Enthusiast'
})

// Sign in existing user
const { user, error } = await AuthService.signIn({
  email: 'user@example.com',
  password: 'securePassword123'
})

// Get current user
const { user, error } = await AuthService.getCurrentUser()

// Update profile
const { profile, error } = await AuthService.updateProfile({
  display_name: 'New Display Name',
  bio: 'Wine enthusiast since 2020'
})

// Listen for auth changes
const unsubscribe = AuthService.onAuthStateChange((user: AuthUser | null) => {
  if (user) {
    console.log('User signed in:', user.email)
  } else {
    console.log('User signed out')
  }
})
```

### Tasting Notes Service

Comprehensive tasting note management with WSET framework support:

```typescript
import { TastingNotesService, type TastingNoteFilters } from '@/services'

// Create a detailed tasting note
const { tastingNote } = await TastingNotesService.createTastingNote({
  wine_id: 'wine-uuid',
  tasting_date: '2024-01-15',
  visibility: 'SQUAD',
  
  // WSET Appearance
  appearance_intensity: 4,
  appearance_color: 'Ruby',
  appearance_rim_variation: true,
  
  // WSET Nose
  nose_intensity: 3,
  nose_aroma_characteristics: ['Cherry', 'Vanilla', 'Oak'],
  
  // WSET Palate
  palate_sweetness: 1,
  palate_acidity: 3,
  palate_tannin: 4,
  
  // Overall
  quality_level: 4,
  rating: 4,
  overall_observations: 'Excellent balance and complexity'
})

// Get filtered tasting notes
const filters: TastingNoteFilters = {
  wineType: 'RED',
  minRating: 4,
  fromDate: '2024-01-01'
}

const { tastingNotes, totalCount } = await TastingNotesService.getTastingNotes(
  filters,
  0, // page
  20 // limit
)

// Get user statistics
const { stats } = await TastingNotesService.getUserTastingStats()
console.log(`Total notes: ${stats?.totalNotes}, Average rating: ${stats?.averageRating}`)
```

### Squads Service

Social features for wine community building:

```typescript
import { SquadsService, type SquadFilters } from '@/services'

// Create a new squad
const { squad } = await SquadsService.createSquad({
  name: 'Bordeaux Lovers',
  description: 'A squad for Bordeaux wine enthusiasts',
  privacy_level: 'PUBLIC',
  focus_areas: ['Bordeaux', 'French Wine', 'Tastings'],
  location: 'San Francisco, CA'
})

// Join a squad
const { membership } = await SquadsService.joinSquad('squad-uuid')

// Get squad with members
const { squad } = await SquadsService.getSquad('squad-uuid')
console.log(`Squad has ${squad?.member_count} members`)

// Get activity feed
const { activities } = await SquadsService.getSquadActivityFeed('squad-uuid')
```

### Wines Service

Wine database with search and recommendations:

```typescript
import { WinesService, type WineFilters } from '@/services'

// Search wines with filters
const filters: WineFilters = {
  wine_type: 'RED',
  country: 'France',
  vintage_min: 2015,
  search: 'Cabernet'
}

const { result } = await WinesService.searchWines(filters, 0, 20, true)
console.log(`Found ${result.totalCount} wines`)
console.log('Available regions:', result.facets.regions)

// Get wine recommendations
const { wines } = await WinesService.getRecommendedWines(10)

// Search by barcode
const { wine } = await WinesService.searchByBarcode('1234567890123')

// Get trending wines
const { wines } = await WinesService.getTrendingWines(10)
```

### Real-time Service

Live updates and presence tracking:

```typescript
import { RealTimeService, type TastingNoteEvent } from '@/services'

// Subscribe to user's tasting notes
const subscription = RealTimeService.subscribeToUserTastingNotes(
  'user-uuid',
  (event: TastingNoteEvent) => {
    console.log(`Tasting note ${event.eventType}:`, event.new)
  }
)

// Track presence in squad
const presenceSubscription = RealTimeService.trackSquadPresence(
  'squad-uuid',
  {
    userId: 'user-uuid',
    displayName: 'Wine Lover',
    lastSeen: new Date().toISOString()
  },
  (presences) => {
    console.log(`${presences.length} members online`)
  }
)

// Subscribe to squad messages
const messageSubscription = RealTimeService.subscribeToSquadMessages(
  'squad-uuid',
  (message) => {
    console.log(`${message.senderName}: ${message.payload}`)
  }
)

// Send typing indicator
await RealTimeService.sendTypingIndicator('squad-uuid', 'user-uuid', 'John', true)

// Clean up subscriptions
subscription.unsubscribe()
presenceSubscription.unsubscribe()
messageSubscription.unsubscribe()
```

### Connection Service

Health checks and validation:

```typescript
import { ConnectionService, runHealthCheck } from '@/services'

// Test basic connection
const status = await ConnectionService.testConnection()
console.log(`Connected: ${status.isConnected}, Latency: ${status.latency}ms`)

// Run comprehensive health check
const { overallHealth, results } = await runHealthCheck()
console.log(`Overall health: ${overallHealth}`)

results.forEach(result => {
  console.log(`${result.test}: ${result.passed ? '✅' : '❌'} ${result.error || ''}`)
})

// Run validation suite
const validationResults = await ConnectionService.runValidationSuite()
validationResults.forEach(result => {
  if (!result.passed) {
    console.error(`${result.test} failed: ${result.error}`)
  }
})

// Monitor connection
const stopMonitoring = ConnectionService.startConnectionMonitoring(
  (status) => {
    if (!status.isConnected) {
      console.warn('Connection lost!')
    }
  },
  30000 // Check every 30 seconds
)

// Stop monitoring when done
stopMonitoring()
```

## Subscription Management

Use the subscription manager for handling multiple real-time subscriptions:

```typescript
import { createSubscriptionManager, RealTimeService } from '@/services'

const subscriptionManager = createSubscriptionManager()

// Add subscriptions with keys
subscriptionManager.add(
  'user-tasting-notes',
  RealTimeService.subscribeToUserTastingNotes('user-uuid', handleTastingNoteUpdate)
)

subscriptionManager.add(
  'squad-presence',
  RealTimeService.trackSquadPresence('squad-uuid', userState, handlePresenceUpdate)
)

// Remove specific subscription
subscriptionManager.remove('user-tasting-notes')

// Clean up all subscriptions (call on app shutdown)
subscriptionManager.removeAll()
```

## Error Handling

All service methods return consistent error handling patterns:

```typescript
const { data, error } = await SomeService.someMethod()

if (error) {
  // Handle error
  console.error('Operation failed:', error)
  return
}

// Use data safely
console.log('Success:', data)
```

## TypeScript Support

The services provide comprehensive TypeScript support:

```typescript
import { 
  type Profile,
  type TastingNote,
  type Squad,
  type WineWithStats,
  type TastingNoteWithWine
} from '@/services'

// All types are fully typed
const handleTastingNote = (note: TastingNoteWithWine) => {
  console.log(`${note.user_profile.display_name} rated ${note.wine.name}: ${note.rating}/5`)
}
```

## Best Practices

1. **Initialize services on app startup** to validate configuration
2. **Use subscription managers** to avoid memory leaks
3. **Handle errors gracefully** - all methods return error objects
4. **Clean up subscriptions** when components unmount
5. **Use TypeScript types** for better development experience
6. **Monitor connection status** for offline handling
7. **Validate environment** before using services

## Testing

The services include built-in validation and testing utilities:

```typescript
import { ConnectionService } from '@/services'

// Test service endpoints
const results = await ConnectionService.testServiceEndpoints()
console.log('Auth service:', results.auth.passed)
console.log('Database operations:', results.tastingNotes.passed)

// Test database health
const health = await ConnectionService.testDatabaseHealth()
console.log('Tables accessible:', health.tablesAccessible)
console.log('RLS policies active:', health.rlsPoliciesActive)
```

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure your `.env` file has the correct Supabase URL and keys
2. **RLS Policies**: If getting permission errors, check that RLS policies are deployed
3. **Real-time**: If subscriptions aren't working, verify your Supabase project has real-time enabled
4. **Network**: Use connection monitoring to detect network issues

### Debug Mode

Enable debug logging in development:

```typescript
// In your .env file
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true
```

This comprehensive service layer provides everything needed to interact with the CellarSessions backend while maintaining type safety, error handling, and real-time capabilities.