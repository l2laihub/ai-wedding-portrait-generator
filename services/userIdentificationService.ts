/**
 * User Identification Service
 * Provides consistent user identification for rate limiting and analytics
 */

import { supabase } from './supabaseClient'

export interface UserIdentification {
  userId: string | null
  sessionId: string
  fingerprint: string
  isAuthenticated: boolean
  userType: 'anonymous' | 'authenticated' | 'premium'
}

export interface DeviceFingerprint {
  userAgent: string
  language: string
  platform: string
  screenResolution: string
  timezone: string
  cookieEnabled: boolean
  localStorageEnabled: boolean
  sessionStorageEnabled: boolean
  indexedDBEnabled: boolean
  webglRenderer: string | null
  canvasFingerprint: string
}

class UserIdentificationService {
  private sessionId: string | null = null
  private fingerprint: string | null = null
  private cachedIdentification: UserIdentification | null = null

  /**
   * Initialize the service and generate session ID if needed
   */
  public async initialize(): Promise<void> {
    if (!this.sessionId) {
      this.sessionId = this.getOrCreateSessionId()
    }
    
    if (!this.fingerprint) {
      this.fingerprint = await this.generateDeviceFingerprint()
    }
  }

  /**
   * Get or create a persistent session ID
   */
  private getOrCreateSessionId(): string {
    const storageKey = 'wedai_session_id'
    
    try {
      let sessionId = localStorage.getItem(storageKey)
      
      if (!sessionId) {
        sessionId = this.generateSessionId()
        localStorage.setItem(storageKey, sessionId)
      }
      
      return sessionId
    } catch (error) {
      console.warn('Failed to access localStorage for session ID:', error)
      // Fallback to memory-only session ID
      return this.generateSessionId()
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substr(2, 9)
    return `sess_${timestamp}_${randomPart}`
  }

  /**
   * Generate device fingerprint for user identification
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const fingerprint: DeviceFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      localStorageEnabled: this.isStorageEnabled('localStorage'),
      sessionStorageEnabled: this.isStorageEnabled('sessionStorage'),
      indexedDBEnabled: this.isIndexedDBEnabled(),
      webglRenderer: this.getWebGLRenderer(),
      canvasFingerprint: this.generateCanvasFingerprint()
    }

    // Create hash from fingerprint data
    const fingerprintString = JSON.stringify(fingerprint)
    return await this.hashString(fingerprintString)
  }

  /**
   * Check if a storage type is enabled
   */
  private isStorageEnabled(storageType: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[storageType]
      const testKey = '__test__'
      storage.setItem(testKey, 'test')
      storage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if IndexedDB is enabled
   */
  private isIndexedDBEnabled(): boolean {
    try {
      return !!window.indexedDB
    } catch {
      return false
    }
  }

  /**
   * Get WebGL renderer information
   */
  private getWebGLRenderer(): string | null {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (!gl) return null
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null
    } catch {
      return null
    }
  }

  /**
   * Generate canvas fingerprint
   */
  private generateCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return 'no-canvas'
      
      // Draw a simple pattern
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('WedAI Fingerprint', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('Device ID', 4, 17)
      
      return canvas.toDataURL()
    } catch {
      return 'canvas-error'
    }
  }

  /**
   * Hash a string using Web Crypto API
   */
  private async hashString(str: string): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(str)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fallback to simple hash
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16)
    }
  }

  /**
   * Get current user identification
   */
  public async getCurrentIdentification(): Promise<UserIdentification> {
    await this.initialize()
    
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    const userId = user?.id || null
    const isAuthenticated = !!user
    
    // Determine user type
    let userType: 'anonymous' | 'authenticated' | 'premium' = 'anonymous'
    
    if (isAuthenticated && userId) {
      userType = 'authenticated'
      
      // Check if user has premium credits
      try {
        const { data: credits } = await supabase
          .from('user_credits')
          .select('paid_credits')
          .eq('user_id', userId)
          .single()
        
        if (credits && credits.paid_credits > 0) {
          userType = 'premium'
        }
      } catch (error) {
        console.warn('Failed to check user credits:', error)
      }
    }
    
    const identification: UserIdentification = {
      userId,
      sessionId: this.sessionId!,
      fingerprint: this.fingerprint!,
      isAuthenticated,
      userType
    }
    
    this.cachedIdentification = identification
    return identification
  }

  /**
   * Get cached identification (faster, but may be stale)
   */
  public getCachedIdentification(): UserIdentification | null {
    return this.cachedIdentification
  }

  /**
   * Clear cached identification (e.g., after login/logout)
   */
  public clearCache(): void {
    this.cachedIdentification = null
  }

  /**
   * Get rate limiting identifier based on user status
   */
  public async getRateLimitIdentifier(): Promise<{
    identifier: string
    type: 'user' | 'anonymous' | 'ip'
  }> {
    const identification = await this.getCurrentIdentification()
    
    if (identification.userId) {
      return {
        identifier: identification.userId,
        type: 'user'
      }
    }
    
    if (identification.sessionId) {
      return {
        identifier: identification.sessionId,
        type: 'anonymous'
      }
    }
    
    // Fallback to fingerprint-based identification
    return {
      identifier: identification.fingerprint,
      type: 'ip'
    }
  }

  /**
   * Track user activity for analytics
   */
  public async trackActivity(activity: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const identification = await this.getCurrentIdentification()
      
      // Track in Supabase analytics
      await supabase.from('usage_analytics').insert({
        session_id: identification.sessionId,
        portrait_type: activity,
        theme: metadata?.style || null
      })
      
    } catch (error) {
      console.warn('Failed to track user activity:', error)
    }
  }

  /**
   * Get anonymized analytics data
   */
  public async getAnalyticsData(): Promise<Record<string, any>> {
    const identification = await this.getCurrentIdentification()
    
    return {
      session_id: identification.sessionId,
      user_type: identification.userType,
      is_authenticated: identification.isAuthenticated,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Reset session (generates new session ID)
   */
  public resetSession(): void {
    try {
      localStorage.removeItem('wedai_session_id')
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error)
    }
    
    this.sessionId = null
    this.fingerprint = null
    this.cachedIdentification = null
  }

  /**
   * Check if user can perform action based on rate limits
   */
  public async checkCanPerformAction(action: string = 'generate_portrait'): Promise<{
    canProceed: boolean
    reason?: string
    resetAt?: Date
  }> {
    try {
      const identification = await this.getCurrentIdentification()
      const rateLimitId = await this.getRateLimitIdentifier()
      
      // This would be implemented based on your rate limiting logic
      // For now, return a simple check
      return {
        canProceed: true
      }
    } catch (error) {
      console.error('Failed to check rate limits:', error)
      return {
        canProceed: false,
        reason: 'Rate limit check failed'
      }
    }
  }
}

// Export singleton instance
export const userIdentificationService = new UserIdentificationService()

// Export the class for testing
export default UserIdentificationService