import { supabase } from './supabaseClient'
import { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  displayName?: string
  createdAt: string
  referralCode?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export interface SignUpData {
  email: string
  password: string
  displayName?: string
  referralCode?: string
}

export interface SignInData {
  email: string
  password: string
}

class AuthService {
  private currentUser: AuthUser | null = null
  private currentSession: Session | null = null

  constructor() {
    // Set up auth state listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (session?.user) {
        this.currentSession = session
        try {
          await this.loadUserProfile(session.user.id)
        } catch (error) {
          console.error('Failed to load user profile on auth state change:', error)
          // Create a minimal user object if profile loading fails
          this.currentUser = {
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name || '',
            createdAt: session.user.created_at || new Date().toISOString(),
            referralCode: undefined
          }
        }
      } else {
        this.currentUser = null
        this.currentSession = null
      }
    })
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user profile:', error)
        return
      }

      this.currentUser = {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        createdAt: data.created_at,
        referralCode: data.referral_code
      }
    } catch (err) {
      console.error('Failed to load user profile:', err)
    }
  }

  /**
   * Sign up new user
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName || '',
            referral_code: data.referralCode || ''
          }
        }
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'User creation failed' }
      }

      // If user needs email confirmation, return success but no user data
      if (!authData.session) {
        return { 
          success: true, 
          error: 'Please check your email to confirm your account' 
        }
      }

      // Load user profile
      await this.loadUserProfile(authData.user.id)

      return { success: true, user: this.currentUser || undefined }
    } catch (err) {
      console.error('Sign up error:', err)
      return { success: false, error: 'Sign up failed. Please try again.' }
    }
  }

  /**
   * Sign in user
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user || !authData.session) {
        return { success: false, error: 'Sign in failed' }
      }

      this.currentSession = authData.session

      // Update last login (don't wait for this)
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id)
        .then(() => console.log('Last login updated'))
        .catch(() => console.warn('Failed to update last login - this is not critical'))

      // Load user profile with timeout
      try {
        await Promise.race([
          this.loadUserProfile(authData.user.id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile loading timeout')), 5000)
          )
        ])
      } catch (profileError) {
        console.warn('Failed to load user profile, using fallback:', profileError)
        // Create fallback user object
        this.currentUser = {
          id: authData.user.id,
          email: authData.user.email || '',
          displayName: authData.user.user_metadata?.display_name || '',
          createdAt: authData.user.created_at || new Date().toISOString(),
          referralCode: undefined
        }
      }

      return { success: true, user: this.currentUser || undefined }
    } catch (err) {
      console.error('Sign in error:', err)
      return { success: false, error: 'Sign in failed. Please try again.' }
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // OAuth will redirect, so we return success immediately
      return { success: true }
    } catch (err) {
      console.error('Google sign in error:', err)
      return { success: false, error: 'Google sign in failed. Please try again.' }
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      this.currentUser = null
      this.currentSession = null
      
      return { success: true }
    } catch (err) {
      console.error('Sign out error:', err)
      return { success: false, error: 'Sign out failed' }
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      console.error('Password reset error:', err)
      return { success: false, error: 'Password reset failed' }
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      console.error('Password update error:', err)
      return { success: false, error: 'Password update failed' }
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: { displayName?: string }): Promise<AuthResult> {
    try {
      if (!this.currentUser) {
        return { success: false, error: 'Not authenticated' }
      }

      const { error } = await supabase
        .from('users')
        .update({
          display_name: updates.displayName
        })
        .eq('id', this.currentUser.id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Reload user profile
      await this.loadUserProfile(this.currentUser.id)

      return { success: true, user: this.currentUser }
    } catch (err) {
      console.error('Profile update error:', err)
      return { success: false, error: 'Profile update failed' }
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.currentSession
  }

  /**
   * Get session from storage (for initial load)
   */
  async getStoredSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting stored session:', error)
        return null
      }

      if (data.session?.user) {
        this.currentSession = data.session
        
        // Load user profile in background
        try {
          await this.loadUserProfile(data.session.user.id)
        } catch (profileError) {
          console.error('Failed to load user profile during session restore:', profileError)
          // Create a minimal user object if profile loading fails
          this.currentUser = {
            id: data.session.user.id,
            email: data.session.user.email || '',
            displayName: data.session.user.user_metadata?.display_name || '',
            createdAt: data.session.user.created_at || new Date().toISOString(),
            referralCode: undefined
          }
        }
      }

      return data.session
    } catch (err) {
      console.error('Failed to get stored session:', err)
      return null
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session?.user) {
        await this.loadUserProfile(data.session.user.id)
        return { success: true, user: this.currentUser || undefined }
      }

      return { success: false, error: 'No session found' }
    } catch (err) {
      console.error('OAuth callback error:', err)
      return { success: false, error: 'Authentication failed' }
    }
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService