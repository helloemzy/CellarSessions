import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthService, AuthUser } from '@/services/auth/authService'
import { AuthState, UserProfile } from '@/types'

interface AuthStore extends AuthState {
  // State
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  isInitialized: boolean

  // Actions
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, displayName: string, firstName?: string, lastName?: string) => Promise<boolean>
  signOut: () => Promise<void>
  updateProfile: (profileData: Partial<UserProfile>) => Promise<boolean>
  resetPassword: (email: string) => Promise<boolean>
  clearError: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      isInitialized: false,

      // Actions
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { user, error } = await AuthService.signIn({ email, password })
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          if (user) {
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false, 
              error: null 
            })
            return true
          }
          
          set({ error: 'Authentication failed', isLoading: false })
          return false
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
          set({ error: errorMessage, isLoading: false })
          return false
        }
      },

      signUp: async (email: string, password: string, displayName: string, firstName?: string, lastName?: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { user, error } = await AuthService.signUp({
            email,
            password,
            displayName,
            firstName,
            lastName,
          })
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          if (user) {
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false, 
              error: null 
            })
            return true
          }
          
          set({ error: 'Registration failed', isLoading: false })
          return false
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
          set({ error: errorMessage, isLoading: false })
          return false
        }
      },

      signOut: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const { error } = await AuthService.signOut()
          
          if (error) {
            set({ error, isLoading: false })
            return
          }
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null 
          })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
          set({ error: errorMessage, isLoading: false })
        }
      },

      updateProfile: async (profileData: Partial<UserProfile>) => {
        set({ isLoading: true, error: null })
        
        try {
          const { profile, error } = await AuthService.updateProfile(profileData)
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          if (profile) {
            const currentUser = get().user
            if (currentUser) {
              set({
                user: {
                  ...currentUser,
                  profile
                },
                isLoading: false,
                error: null
              })
            }
            return true
          }
          
          set({ error: 'Profile update failed', isLoading: false })
          return false
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
          set({ error: errorMessage, isLoading: false })
          return false
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { error } = await AuthService.resetPassword(email)
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          set({ isLoading: false, error: null })
          return true
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
          set({ error: errorMessage, isLoading: false })
          return false
        }
      },

      clearError: () => {
        set({ error: null })
      },

      initialize: async () => {
        set({ isLoading: true })
        
        try {
          const { user, error } = await AuthService.getCurrentUser()
          
          if (error) {
            console.warn('Error getting current user:', error)
          }
          
          set({ 
            user, 
            isAuthenticated: !!user, 
            isLoading: false, 
            isInitialized: true,
            error: null 
          })

          // Set up auth state change listener
          AuthService.onAuthStateChange((user) => {
            set({ 
              user, 
              isAuthenticated: !!user,
              error: null 
            })
          })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Initialization failed'
          console.error('Auth initialization error:', errorMessage)
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            isInitialized: true,
            error: null // Don't show initialization errors to user
          })
        }
      },
    }),
    {
      name: 'cellar-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)