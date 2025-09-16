import { supabase } from './supabaseClient'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { rateLimiter } from '../utils/rateLimiter'
import { authErrorHandler, type ErrorContext } from '../utils/authErrors'

export interface AuthUser {
  id: string
  email: string
  displayName?: string
  createdAt: string
  referralCode?: string
  role?: string
  sessionId?: string
  lastActivity?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
  errorType?: string
  retryable?: boolean
  retryAfter?: number
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

interface SessionInfo {
  id: string
  userId: string
  expiresAt: Date
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

class AuthService {
  private currentUser: AuthUser | null = null
  private currentSession: Session | null = null
  private sessionInfo: SessionInfo | null = null
  private sessionRefreshTimer: NodeJS.Timeout | null = null

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
    const requestId = this.generateRequestId()
    const context: ErrorContext = {
      action: 'signin',
      email: data.email,
      ipAddress: await this.getClientIP(),
      userAgent: navigator?.userAgent,
      metadata: { request_id: requestId }
    }

    try {
      console.log('Starting sign in process for:', data.email, 'RequestID:', requestId)
      
      // Check rate limiting
      const rateLimitAllowed = await this.checkAuthRateLimit(data.email, 'login_attempt')
      if (!rateLimitAllowed) {
        return await this.handleAuthError(
          { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
          context,
          requestId
        )
      }

      // Check if account is blocked
      const isBlocked = await this.checkAccountBlocked(data.email)
      if (isBlocked) {
        return await this.handleAuthError(
          { message: 'Account temporarily locked', code: 'ACCOUNT_LOCKED' },
          context,
          requestId
        )
      }
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        
        // Record failed login attempt
        await this.recordFailedLogin(data.email)
        
        return await this.handleAuthError(authError, context, requestId)
      }

      if (!authData.user || !authData.session) {
        console.error('No user or session returned from Supabase')
        await this.recordFailedLogin(data.email)
        
        return await this.handleAuthError(
          { message: 'Authentication failed', code: 'AUTH_FAILED' },
          context,
          requestId
        )
      }

      console.log('Supabase auth successful for:', authData.user.email)
      
      // Clear failed login attempts
      await this.clearFailedLoginAttempts(data.email)
      
      // Store session immediately
      this.currentSession = authData.session
      
      // Create secure session tracking
      await this.createSecureSession(authData.user.id, authData.session)
      
      // Create immediate user object from auth data - don't wait for profile loading
      const immediateUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        displayName: authData.user.user_metadata?.display_name || '',
        createdAt: authData.user.created_at || new Date().toISOString(),
        referralCode: undefined,
        sessionId: this.sessionInfo?.id
      }
      
      // Set current user immediately
      this.currentUser = immediateUser
      
      // Log successful login
      await this.logSecurityEvent({
        event_type: 'login_successful',
        user_id: authData.user.id,
        email: authData.user.email,
        ip_address: await this.getClientIP(),
        user_agent: navigator?.userAgent,
        success: true,
        metadata: {
          session_id: this.sessionInfo?.id,
          request_id: requestId
        }
      })
      
      console.log('Sign in successful for:', immediateUser.email)
      
      // Profile loading will happen asynchronously in the auth state listener
      // This ensures fast sign-in without waiting for database queries
      
      return { success: true, user: immediateUser }
    } catch (err) {
      console.error('Sign in error:', err)
      
      // Record failed attempt on unexpected error
      await this.recordFailedLogin(data.email)
      
      return await this.handleAuthError(err, context, requestId)
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
      const currentUserId = this.currentUser?.id
      
      // Invalidate session before signing out
      await this.invalidateSession()
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      // Log security event
      if (currentUserId) {
        await this.logSecurityEvent({
          event_type: 'logout_successful',
          user_id: currentUserId,
          ip_address: await this.getClientIP(),
          user_agent: navigator?.userAgent,
          success: true
        })
      }

      this.currentUser = null
      this.currentSession = null
      this.sessionInfo = null
      this.clearSessionRefreshTimer()
      
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

  /**
   * Session Management Methods
   */

  /**
   * Create secure session with tracking
   */
  private async createSecureSession(userId: string, session: Session): Promise<void> {
    try {
      const sessionToken = this.generateSecureToken()
      const refreshTokenHash = await this.hashToken(session.refresh_token || '')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const ipAddress = await this.getClientIP()
      const userAgent = navigator?.userAgent || 'unknown'

      // Create session in database
      const { data, error } = await supabase.rpc('create_user_session', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_refresh_token_hash: refreshTokenHash,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_expires_at: expiresAt.toISOString()
      })

      if (error) {
        console.error('Failed to create secure session:', error)
        return
      }

      // Store session info locally
      this.sessionInfo = {
        id: data,
        userId,
        expiresAt,
        lastActivity: new Date(),
        ipAddress,
        userAgent
      }

      // Set up session refresh timer
      this.setupSessionRefreshTimer()

      // Log security event
      await this.logSecurityEvent({
        event_type: 'session_created',
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
        metadata: {
          session_id: data,
          expires_at: expiresAt.toISOString()
        }
      })

    } catch (error) {
      console.error('Error creating secure session:', error)
    }
  }

  /**
   * Update session activity
   */
  private async updateSessionActivity(): Promise<void> {
    if (!this.sessionInfo || !this.currentSession) return

    try {
      const now = new Date()
      
      // Update local session info
      this.sessionInfo.lastActivity = now

      // Update session in database (throttled to every 5 minutes)
      const lastUpdate = this.sessionInfo.lastActivity.getTime()
      const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000

      if (lastUpdate < fiveMinutesAgo) {
        await supabase
          .from('user_sessions')
          .update({ last_activity: now.toISOString() })
          .eq('id', this.sessionInfo.id)
      }

    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }

  /**
   * Validate current session
   */
  private async validateSession(): Promise<boolean> {
    if (!this.sessionInfo || !this.currentSession) return false

    try {
      // Check if session is expired
      if (this.sessionInfo.expiresAt <= new Date()) {
        await this.invalidateSession()
        return false
      }

      // Validate session exists in database
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, is_active, expires_at')
        .eq('id', this.sessionInfo.id)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        await this.invalidateSession()
        return false
      }

      return true

    } catch (error) {
      console.error('Error validating session:', error)
      return false
    }
  }

  /**
   * Invalidate current session
   */
  private async invalidateSession(): Promise<void> {
    try {
      if (this.sessionInfo) {
        // Mark session as inactive in database
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', this.sessionInfo.id)

        // Log security event
        await this.logSecurityEvent({
          event_type: 'session_invalidated',
          user_id: this.sessionInfo.userId,
          success: true,
          metadata: {
            session_id: this.sessionInfo.id,
            reason: 'expired_or_invalid'
          }
        })
      }

      // Clear local session data
      this.sessionInfo = null
      this.clearSessionRefreshTimer()

    } catch (error) {
      console.error('Error invalidating session:', error)
    }
  }

  /**
   * Setup session refresh timer
   */
  private setupSessionRefreshTimer(): void {
    this.clearSessionRefreshTimer()

    // Refresh session every 30 minutes
    this.sessionRefreshTimer = setInterval(async () => {
      await this.updateSessionActivity()
      
      // Validate session periodically
      const isValid = await this.validateSession()
      if (!isValid) {
        await this.signOut()
      }
    }, 30 * 60 * 1000)
  }

  /**
   * Clear session refresh timer
   */
  private clearSessionRefreshTimer(): void {
    if (this.sessionRefreshTimer) {
      clearInterval(this.sessionRefreshTimer)
      this.sessionRefreshTimer = null
    }
  }

  /**
   * Security and Rate Limiting Methods
   */

  /**
   * Check rate limiting before auth operations
   */
  private async checkAuthRateLimit(identifier: string, action: string): Promise<boolean> {
    try {
      const isAllowed = await rateLimiter.checkAuthLimit(identifier, action)
      
      if (!isAllowed) {
        await this.logSecurityEvent({
          event_type: 'rate_limit_exceeded',
          email: identifier,
          ip_address: await this.getClientIP(),
          user_agent: navigator?.userAgent,
          success: false,
          metadata: { action }
        })
      }

      return isAllowed
    } catch (error) {
      console.error('Rate limit check error:', error)
      return true // Allow on error to prevent blocking legitimate users
    }
  }

  /**
   * Check if account is blocked due to failed attempts
   */
  private async checkAccountBlocked(email: string): Promise<boolean> {
    try {
      const ipAddress = await this.getClientIP()
      
      const { data, error } = await supabase.rpc('is_account_blocked', {
        p_email: email,
        p_ip_address: ipAddress
      })

      return !error && data === true
    } catch (error) {
      console.error('Account block check error:', error)
      return false
    }
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(email: string): Promise<void> {
    try {
      const ipAddress = await this.getClientIP()
      const userAgent = navigator?.userAgent || 'unknown'

      await supabase.rpc('record_failed_login', {
        p_email: email,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })
    } catch (error) {
      console.error('Failed to record failed login:', error)
    }
  }

  /**
   * Clear failed login attempts after successful login
   */
  private async clearFailedLoginAttempts(email: string): Promise<void> {
    try {
      const ipAddress = await this.getClientIP()
      
      await supabase.rpc('clear_failed_login_attempts', {
        p_email: email,
        p_ip_address: ipAddress
      })
    } catch (error) {
      console.error('Failed to clear failed login attempts:', error)
    }
  }

  /**
   * Error Handling Methods
   */

  /**
   * Handle authentication errors with proper classification and logging
   */
  private async handleAuthError(
    error: any, 
    context: ErrorContext, 
    requestId?: string
  ): Promise<AuthResult> {
    const authError = authErrorHandler.createError(error, context, requestId)
    
    // Log error for monitoring
    console.error('Authentication Error:', authErrorHandler.formatForLogging(authError, context))
    
    // Log security event
    await this.logSecurityEvent({
      event_type: `${context.action}_error`,
      email: context.email,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: false,
      error_message: authError.message,
      metadata: {
        error_type: authError.type,
        severity: authErrorHandler.getSeverity(authError.type),
        retryable: authError.retryable,
        request_id: requestId,
        ...context.metadata
      }
    })

    return {
      success: false,
      error: authError.userMessage,
      errorType: authError.type,
      retryable: authError.retryable,
      retryAfter: authError.retryAfter
    }
  }

  /**
   * Generate request ID for error tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Utility Methods
   */

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Hash token for secure storage
   */
  private async hashToken(token: string): Promise<string> {
    if (!token) return ''
    
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string> {
    try {
      // This would typically be set by your CDN/proxy
      // For now, return a placeholder
      return 'client'
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: any): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          ...event,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Security event logging error:', error)
    }
  }

  /**
   * Get session information
   */
  getSessionInfo(): SessionInfo | null {
    return this.sessionInfo
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    return await this.validateSession()
  }

  /**
   * Force session refresh
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session) {
        this.currentSession = data.session
        await this.updateSessionActivity()
      }

      return { success: true }
    } catch (error) {
      console.error('Session refresh error:', error)
      return { success: false, error: 'Failed to refresh session' }
    }
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService