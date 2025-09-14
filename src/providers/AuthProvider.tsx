import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize } = useAuthStore()

  // Initialize auth when the provider mounts
  useEffect(() => {
    initialize()
  }, [])

  return <>{children}</>
}