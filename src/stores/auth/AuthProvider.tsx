import React, { createContext, useContext, useEffect } from 'react'
import { useAuthStore } from './authStore'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  hasCompletedOnboarding: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: any) => Promise<void>
  completeOnboarding: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authStore = useAuthStore()

  useEffect(() => {
    // Initialize auth state on app start
    authStore.initialize()
  }, [])

  const contextValue: AuthContextType = {
    user: authStore.user,
    loading: authStore.loading,
    hasCompletedOnboarding: authStore.hasCompletedOnboarding,
    signIn: authStore.signIn,
    signUp: authStore.signUp,
    signOut: authStore.signOut,
    updateProfile: authStore.updateProfile,
    completeOnboarding: authStore.completeOnboarding,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}