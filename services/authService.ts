import { supabase } from './supabaseClient'
import { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  displayName?: string
  createdAt: string
  referralCode?: string
  role?: string
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
        
        // Create user object directly from session data (ultra-simple approach)
        // This eliminates database query dependencies that cause loading issues
        this.currentUser = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.display_name || '',
          createdAt: session.user.created_at || new Date().toISOString(),
          referralCode: undefined, // Will be loaded separately if needed
          role: undefined // Will be loaded separately
        }
        
        // Load user profile asynchronously to get role
        this.loadUserProfileSimple(session.user.id).then(profile => {
          if (profile && this.currentUser) {
            this.currentUser.role = profile.role;
            console.log('User role loaded:', profile.role);
          }
        })
        
        console.log('Auth state listener completed for:', this.currentUser?.email)
      } else {
        this.currentUser = null
        this.currentSession = null
        console.log('Auth state listener: User signed out')
      }
    })
  }

  /**
   * Simple user profile loader with minimal error handling
   */
  private async loadUserProfileSimple(userId: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1)

      if (error || !data || data.length === 0) {
        console.warn('User profile not found in database:', error?.message)
        return null
      }

      const userProfile = data[0]
      return {
        id: userProfile.id,
        email: userProfile.email,
        displayName: userProfile.display_name,
        createdAt: userProfile.created_at,
        referralCode: userProfile.referral_code,
        role: userProfile.role
      }
    } catch (err) {
      console.error('Failed to load user profile:', err)
      return null
    }
  }

  /**
   * Load user profile from database (complex version with auto-creation)
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1)

      if (error) {
        console.error('Error loading user profile:', error)
        // If user profile doesn't exist, try to create it
        if (error.code === 'PGRST116' || error.message.includes('Cannot coerce')) {
          console.log('User profile not found, attempting to create one...')
          await this.createUserProfile(userId)
          return
        }
        return
      }

      if (!data || data.length === 0) {
        console.log('No user profile found, creating one...')
        await this.createUserProfile(userId)
        return
      }

      const userProfile = data[0]
      this.currentUser = {
        id: userProfile.id,
        email: userProfile.email,
        displayName: userProfile.display_name,
        createdAt: userProfile.created_at,
        referralCode: userProfile.referral_code,
        role: userProfile.role
      }
    } catch (err) {
      console.error('Failed to load user profile:', err)
      // Fallback: try to create user profile
      await this.createUserProfile(userId)
    }
  }

  /**
   * Create user profile if it doesn't exist
   */
  private async createUserProfile(userId: string): Promise<void> {
    try {
      // Get auth user info
      const { data: authUser } = await supabase.auth.getUser()
      if (!authUser.user || authUser.user.id !== userId) {
        console.error('Auth user mismatch or not found')
        return
      }

      // Generate referral code
      const generateReferralCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase()
      }

      const referralCode = generateReferralCode()

      // Create user profile
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
          display_name: authUser.user.user_metadata?.display_name || '',
          referral_code: referralCode
        })

      if (userError && !userError.message.includes('duplicate key')) {
        console.error('Error creating user profile:', userError)
        return
      }

      // Create user credits record
      const { error: creditsError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId
        })

      if (creditsError && !creditsError.message.includes('duplicate key')) {
        console.error('Error creating user credits:', creditsError)
      }

      // Set the user profile directly to avoid recursive call
      this.currentUser = {
        id: userId,
        email: authUser.user.email || '',
        displayName: authUser.user.user_metadata?.display_name || '',
        createdAt: authUser.user.created_at || new Date().toISOString(),
        referralCode: referralCode
      }
    } catch (err) {
      console.error('Failed to create user profile:', err)
    }
  }

  /**
   * Sign up new user
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      console.log('Attempting signup for:', data.email)
      console.log('Supabase URL:', supabase.supabaseUrl)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName || '',
            referral_code: data.referralCode || ''
          },
          emailRedirectTo: `${window.location.origin}`
        }
      })

      if (authError) {
        console.error('SignUp auth error:', {
          message: authError.message,
          status: authError.status,
          code: authError.code || 'NO_CODE',
          details: authError
        })
        
        // Handle gateway timeout - email might have been sent successfully
        if (authError.status === 504) {
          return { 
            success: true, 
            error: 'Account created! Please check your email to confirm your account. The confirmation may take a few minutes to arrive.' 
          }
        }
        
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

      // Wait a moment for the database trigger to create the profile
      // This prevents race conditions between trigger execution and profile loading
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Load user profile with retry logic
      let retries = 3
      let profileLoaded = false
      
      while (retries > 0 && !profileLoaded) {
        try {
          await this.loadUserProfile(authData.user.id)
          profileLoaded = !!this.currentUser
        } catch (error) {
          console.log(`Profile load attempt ${4 - retries} failed, retrying...`)
        }
        
        if (!profileLoaded) {
          retries--
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      if (!profileLoaded) {
        console.warn('Failed to load user profile after multiple attempts')
      }

      return { success: true, user: this.currentUser || undefined }
    } catch (err) {
      console.error('Sign up error:', err)
      
      // Check if this is a network error
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        })
      }
      return { success: false, error: 'Sign up failed. Please try again.' }
    }
  }

  /**
   * Sign in user
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      console.log('Starting sign in process for:', data.email)
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        return { success: false, error: authError.message }
      }

      if (!authData.user || !authData.session) {
        console.error('No user or session returned from Supabase')
        return { success: false, error: 'Sign in failed' }
      }

      console.log('Supabase auth successful for:', authData.user.email)
      
      // Store session immediately
      this.currentSession = authData.session
      
      // Create immediate user object from auth data - don't wait for profile loading
      const immediateUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        displayName: authData.user.user_metadata?.display_name || '',
        createdAt: authData.user.created_at || new Date().toISOString(),
        referralCode: undefined
      }
      
      // Set current user immediately
      this.currentUser = immediateUser
      
      console.log('Sign in successful for:', immediateUser.email)
      
      // Profile loading will happen asynchronously in the auth state listener
      // This ensures fast sign-in without waiting for database queries
      
      return { success: true, user: immediateUser }
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
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'super_admin'
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'super_admin'
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
        
        // Create user object directly from session data (ultra-simple approach)
        this.currentUser = {
          id: data.session.user.id,
          email: data.session.user.email || '',
          displayName: data.session.user.user_metadata?.display_name || '',
          createdAt: data.session.user.created_at || new Date().toISOString(),
          referralCode: undefined
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

  /**
   * Refresh user profile (including role)
   */
  async refreshUserProfile(): Promise<void> {
    if (!this.currentUser) return;
    
    const profile = await this.loadUserProfileSimple(this.currentUser.id);
    if (profile) {
      this.currentUser = profile;
      console.log('User profile refreshed, role:', profile.role);
    }
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService