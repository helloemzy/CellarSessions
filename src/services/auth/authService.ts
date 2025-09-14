import { supabase } from '@/services/api/supabase'
import { Database } from '@/services/api/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface AuthUser {
  id: string
  email: string
  emailConfirmed: boolean
  profile?: Profile
}

export interface SignUpCredentials {
  email: string
  password: string
  displayName: string
  firstName?: string
  lastName?: string
}

export interface SignInCredentials {
  email: string
  password: string
}

export class AuthService {
  /**
   * Sign up a new user with email and password
   */
  static async signUp(credentials: SignUpCredentials): Promise<{
    user: AuthUser | null
    error: string | null
  }> {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.displayName,
            first_name: credentials.firstName,
            last_name: credentials.lastName,
          }
        }
      })

      if (signUpError) {
        return { user: null, error: signUpError.message }
      }

      if (!data.user) {
        return { user: null, error: 'Failed to create user account' }
      }

      // Create profile in database
      const profileData: ProfileInsert = {
        id: data.user.id,
        email: credentials.email,
        display_name: credentials.displayName,
        first_name: credentials.firstName || null,
        last_name: credentials.lastName || null,
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)

      if (profileError) {
        console.error('Failed to create profile:', profileError)
        // Note: User account was created but profile creation failed
        // This should be handled by the app's error recovery logic
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        emailConfirmed: data.user.email_confirmed_at !== null,
      }

      return { user: authUser, error: null }
    } catch (error) {
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(credentials: SignInCredentials): Promise<{
    user: AuthUser | null
    error: string | null
  }> {
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (signInError) {
        return { user: null, error: signInError.message }
      }

      if (!data.user) {
        return { user: null, error: 'Authentication failed' }
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Failed to fetch user profile:', profileError)
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        emailConfirmed: data.user.email_confirmed_at !== null,
        profile: profile || undefined,
      }

      return { user: authUser, error: null }
    } catch (error) {
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { error: error.message }
      }

      // Clear any cached data
      await AsyncStorage.multiRemove(['user_profile', 'user_preferences'])
      
      return { error: null }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Get the current user session
   */
  static async getCurrentUser(): Promise<{
    user: AuthUser | null
    error: string | null
  }> {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error) {
        return { user: null, error: error.message }
      }

      if (!authUser) {
        return { user: null, error: null }
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Failed to fetch user profile:', profileError)
      }

      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email!,
        emailConfirmed: authUser.email_confirmed_at !== null,
        profile: profile || undefined,
      }

      return { user, error: null }
    } catch (error) {
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(profileData: ProfileUpdate): Promise<{
    profile: Profile | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { profile: null, error: 'User not authenticated' }
      }

      const updateData: ProfileUpdate = {
        ...profileData,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return { profile: null, error: error.message }
      }

      return { profile: data, error: null }
    } catch (error) {
      return { 
        profile: null, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        return { error: error.message }
      }
      return { error: null }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Change password
   */
  static async changePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) {
        return { error: error.message }
      }
      return { error: null }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // First delete the user profile (this will cascade to related data due to RLS policies)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (profileError) {
        return { error: profileError.message }
      }

      // Then delete the auth user (this is permanent)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (authError) {
        return { error: authError.message }
      }

      // Clear local storage
      await AsyncStorage.clear()

      return { error: null }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          emailConfirmed: session.user.email_confirmed_at !== null,
          profile: profile || undefined,
        }

        callback(user)
      } else if (event === 'SIGNED_OUT') {
        callback(null)
      }
    })
  }
}