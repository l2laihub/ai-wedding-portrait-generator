/**
 * Authentication Error Handling System
 * Provides comprehensive error classification, user-friendly messages, and security logging
 */

export enum AuthErrorType {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  
  // Rate Limiting & Security
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_TEMPORARILY_LOCKED = 'ACCOUNT_TEMPORARILY_LOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Session & Token Errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  
  // Password Errors
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_RECENTLY_USED = 'PASSWORD_RECENTLY_USED',
  PASSWORD_RESET_TOKEN_INVALID = 'PASSWORD_RESET_TOKEN_INVALID',
  PASSWORD_RESET_TOKEN_EXPIRED = 'PASSWORD_RESET_TOKEN_EXPIRED',
  
  // OAuth Errors
  OAUTH_ERROR = 'OAUTH_ERROR',
  OAUTH_CANCELLED = 'OAUTH_CANCELLED',
  OAUTH_ACCESS_DENIED = 'OAUTH_ACCESS_DENIED',
  
  // Registration Errors
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  SIGNUP_DISABLED = 'SIGNUP_DISABLED',
  
  // Network & Service Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export interface AuthError {
  type: AuthErrorType
  message: string
  userMessage: string
  retryable: boolean
  retryAfter?: number
  details?: any
  timestamp: Date
  requestId?: string
}

export interface ErrorContext {
  action: string
  email?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  metadata?: Record<string, any>
}

class AuthErrorHandler {
  private errorMessages: Record<AuthErrorType, { 
    user: string
    log: string
    retryable: boolean
    severity: 'low' | 'medium' | 'high' | 'critical'
  }> = {
    [AuthErrorType.INVALID_CREDENTIALS]: {
      user: 'Invalid email or password. Please check your credentials and try again.',
      log: 'Authentication failed: Invalid credentials provided',
      retryable: true,
      severity: 'medium'
    },
    [AuthErrorType.USER_NOT_FOUND]: {
      user: 'No account found with this email address. Please check your email or create a new account.',
      log: 'Authentication failed: User not found',
      retryable: false,
      severity: 'low'
    },
    [AuthErrorType.ACCOUNT_DISABLED]: {
      user: 'Your account has been disabled. Please contact support for assistance.',
      log: 'Authentication failed: Account disabled',
      retryable: false,
      severity: 'high'
    },
    [AuthErrorType.EMAIL_NOT_CONFIRMED]: {
      user: 'Please check your email and click the confirmation link before signing in.',
      log: 'Authentication failed: Email not confirmed',
      retryable: false,
      severity: 'low'
    },
    [AuthErrorType.RATE_LIMIT_EXCEEDED]: {
      user: 'Too many attempts. Please wait before trying again.',
      log: 'Rate limit exceeded for authentication request',
      retryable: true,
      severity: 'medium'
    },
    [AuthErrorType.ACCOUNT_TEMPORARILY_LOCKED]: {
      user: 'Account temporarily locked due to multiple failed attempts. Please try again later.',
      log: 'Account temporarily locked due to failed attempts',
      retryable: true,
      severity: 'high'
    },
    [AuthErrorType.SUSPICIOUS_ACTIVITY]: {
      user: 'Suspicious activity detected. Please contact support if you need assistance.',
      log: 'Suspicious activity detected during authentication',
      retryable: false,
      severity: 'critical'
    },
    [AuthErrorType.SESSION_EXPIRED]: {
      user: 'Your session has expired. Please sign in again.',
      log: 'Session expired',
      retryable: false,
      severity: 'low'
    },
    [AuthErrorType.INVALID_TOKEN]: {
      user: 'Invalid authentication token. Please sign in again.',
      log: 'Invalid authentication token provided',
      retryable: false,
      severity: 'medium'
    },
    [AuthErrorType.TOKEN_EXPIRED]: {
      user: 'Authentication token expired. Please sign in again.',
      log: 'Authentication token expired',
      retryable: false,
      severity: 'low'
    },
    [AuthErrorType.REFRESH_TOKEN_INVALID]: {
      user: 'Session could not be refreshed. Please sign in again.',
      log: 'Refresh token invalid or expired',
      retryable: false,
      severity: 'medium'
    },
    [AuthErrorType.WEAK_PASSWORD]: {
      user: 'Password does not meet security requirements. Please choose a stronger password.',
      log: 'Password validation failed: weak password',
      retryable: true,
      severity: 'low'
    },
    [AuthErrorType.PASSWORD_RECENTLY_USED]: {
      user: 'This password was recently used. Please choose a different password.',
      log: 'Password validation failed: recently used password',
      retryable: true,
      severity: 'low'
    },
    [AuthErrorType.PASSWORD_RESET_TOKEN_INVALID]: {
      user: 'Invalid password reset link. Please request a new password reset.',
      log: 'Password reset failed: invalid token',
      retryable: false,
      severity: 'medium'
    },
    [AuthErrorType.PASSWORD_RESET_TOKEN_EXPIRED]: {
      user: 'Password reset link has expired. Please request a new password reset.',
      log: 'Password reset failed: expired token',
      retryable: false,
      severity: 'low'
    },
    [AuthErrorType.OAUTH_ERROR]: {
      user: 'Authentication with Google failed. Please try again or use email/password.',
      log: 'OAuth authentication failed',
      retryable: true,
      severity: 'medium'
    },
    [AuthErrorType.OAUTH_CANCELLED]: {
      user: 'Authentication was cancelled. Please try again.',
      log: 'OAuth authentication cancelled by user',
      retryable: true,
      severity: 'low'
    },
    [AuthErrorType.OAUTH_ACCESS_DENIED]: {
      user: 'Access denied during authentication. Please grant the required permissions.',
      log: 'OAuth access denied',
      retryable: true,
      severity: 'medium'
    },
    [AuthErrorType.EMAIL_ALREADY_EXISTS]: {
      user: 'An account with this email already exists. Please sign in or use a different email.',
      log: 'Registration failed: email already exists',
      retryable: false,
      severity: 'low'
    },
    [AuthErrorType.INVALID_EMAIL_FORMAT]: {
      user: 'Please enter a valid email address.',
      log: 'Validation failed: invalid email format',
      retryable: true,
      severity: 'low'
    },
    [AuthErrorType.SIGNUP_DISABLED]: {
      user: 'New account registration is currently disabled. Please try again later.',
      log: 'Registration failed: signup disabled',
      retryable: false,
      severity: 'medium'
    },
    [AuthErrorType.NETWORK_ERROR]: {
      user: 'Network error. Please check your connection and try again.',
      log: 'Network error during authentication request',
      retryable: true,
      severity: 'medium'
    },
    [AuthErrorType.SERVICE_UNAVAILABLE]: {
      user: 'Authentication service is temporarily unavailable. Please try again later.',
      log: 'Authentication service unavailable',
      retryable: true,
      severity: 'high'
    },
    [AuthErrorType.TIMEOUT_ERROR]: {
      user: 'Request timed out. Please try again.',
      log: 'Authentication request timed out',
      retryable: true,
      severity: 'medium'
    },
    [AuthErrorType.UNKNOWN_ERROR]: {
      user: 'An unexpected error occurred. Please try again.',
      log: 'Unknown error during authentication',
      retryable: true,
      severity: 'high'
    },
    [AuthErrorType.VALIDATION_ERROR]: {
      user: 'Please check your input and try again.',
      log: 'Validation error',
      retryable: true,
      severity: 'low'
    },
    [AuthErrorType.PERMISSION_DENIED]: {
      user: 'You do not have permission to perform this action.',
      log: 'Permission denied',
      retryable: false,
      severity: 'medium'
    }
  }

  /**
   * Create AuthError from any error input
   */
  createError(
    errorInput: any, 
    context: ErrorContext,
    requestId?: string
  ): AuthError {
    const type = this.classifyError(errorInput, context)
    const config = this.errorMessages[type]
    
    return {
      type,
      message: config.log,
      userMessage: config.user,
      retryable: config.retryable,
      retryAfter: this.calculateRetryAfter(type, context),
      details: this.extractErrorDetails(errorInput),
      timestamp: new Date(),
      requestId
    }
  }

  /**
   * Classify error type based on error content and context
   */
  private classifyError(error: any, context: ErrorContext): AuthErrorType {
    if (!error) return AuthErrorType.UNKNOWN_ERROR

    const errorMessage = (error.message || error.error || '').toLowerCase()
    const errorCode = error.code || error.status

    // Network errors
    if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network')) {
      return AuthErrorType.NETWORK_ERROR
    }

    // Timeout errors
    if (errorCode === 'TIMEOUT' || errorMessage.includes('timeout')) {
      return AuthErrorType.TIMEOUT_ERROR
    }

    // Service unavailable
    if (errorCode === 503 || errorMessage.includes('service unavailable')) {
      return AuthErrorType.SERVICE_UNAVAILABLE
    }

    // Rate limiting
    if (errorCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return AuthErrorType.RATE_LIMIT_EXCEEDED
    }

    // Authentication specific errors
    switch (context.action) {
      case 'signin':
      case 'login':
        return this.classifySignInError(error)
      
      case 'signup':
      case 'register':
        return this.classifySignUpError(error)
      
      case 'password_reset':
        return this.classifyPasswordResetError(error)
      
      case 'oauth':
        return this.classifyOAuthError(error)
      
      case 'session_refresh':
        return this.classifySessionError(error)
      
      default:
        return this.classifyGenericError(error)
    }
  }

  /**
   * Classify sign-in specific errors
   */
  private classifySignInError(error: any): AuthErrorType {
    const message = (error.message || '').toLowerCase()
    
    if (message.includes('invalid login credentials') || message.includes('wrong password')) {
      return AuthErrorType.INVALID_CREDENTIALS
    }
    
    if (message.includes('user not found') || message.includes('no user')) {
      return AuthErrorType.USER_NOT_FOUND
    }
    
    if (message.includes('email not confirmed') || message.includes('confirm your email')) {
      return AuthErrorType.EMAIL_NOT_CONFIRMED
    }
    
    if (message.includes('account disabled') || message.includes('user disabled')) {
      return AuthErrorType.ACCOUNT_DISABLED
    }
    
    if (message.includes('too many attempts') || message.includes('temporarily locked')) {
      return AuthErrorType.ACCOUNT_TEMPORARILY_LOCKED
    }
    
    return AuthErrorType.INVALID_CREDENTIALS // Default for sign-in
  }

  /**
   * Classify sign-up specific errors
   */
  private classifySignUpError(error: any): AuthErrorType {
    const message = (error.message || '').toLowerCase()
    
    if (message.includes('user already registered') || message.includes('email already exists')) {
      return AuthErrorType.EMAIL_ALREADY_EXISTS
    }
    
    if (message.includes('invalid email') || message.includes('email format')) {
      return AuthErrorType.INVALID_EMAIL_FORMAT
    }
    
    if (message.includes('signup disabled') || message.includes('registration disabled')) {
      return AuthErrorType.SIGNUP_DISABLED
    }
    
    if (message.includes('weak password') || message.includes('password requirements')) {
      return AuthErrorType.WEAK_PASSWORD
    }
    
    return AuthErrorType.UNKNOWN_ERROR
  }

  /**
   * Classify password reset specific errors
   */
  private classifyPasswordResetError(error: any): AuthErrorType {
    const message = (error.message || '').toLowerCase()
    
    if (message.includes('invalid token') || message.includes('token not found')) {
      return AuthErrorType.PASSWORD_RESET_TOKEN_INVALID
    }
    
    if (message.includes('token expired') || message.includes('link expired')) {
      return AuthErrorType.PASSWORD_RESET_TOKEN_EXPIRED
    }
    
    if (message.includes('recently used') || message.includes('password history')) {
      return AuthErrorType.PASSWORD_RECENTLY_USED
    }
    
    if (message.includes('weak password') || message.includes('password requirements')) {
      return AuthErrorType.WEAK_PASSWORD
    }
    
    return AuthErrorType.UNKNOWN_ERROR
  }

  /**
   * Classify OAuth specific errors
   */
  private classifyOAuthError(error: any): AuthErrorType {
    const message = (error.message || '').toLowerCase()
    
    if (message.includes('cancelled') || message.includes('canceled')) {
      return AuthErrorType.OAUTH_CANCELLED
    }
    
    if (message.includes('access_denied') || message.includes('permission denied')) {
      return AuthErrorType.OAUTH_ACCESS_DENIED
    }
    
    return AuthErrorType.OAUTH_ERROR
  }

  /**
   * Classify session-related errors
   */
  private classifySessionError(error: any): AuthErrorType {
    const message = (error.message || '').toLowerCase()
    
    if (message.includes('session expired') || message.includes('token expired')) {
      return AuthErrorType.SESSION_EXPIRED
    }
    
    if (message.includes('invalid token') || message.includes('token not found')) {
      return AuthErrorType.INVALID_TOKEN
    }
    
    if (message.includes('refresh token') || message.includes('refresh_token')) {
      return AuthErrorType.REFRESH_TOKEN_INVALID
    }
    
    return AuthErrorType.SESSION_EXPIRED
  }

  /**
   * Classify generic errors
   */
  private classifyGenericError(error: any): AuthErrorType {
    const message = (error.message || '').toLowerCase()
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return AuthErrorType.PERMISSION_DENIED
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return AuthErrorType.VALIDATION_ERROR
    }
    
    return AuthErrorType.UNKNOWN_ERROR
  }

  /**
   * Calculate retry delay based on error type
   */
  private calculateRetryAfter(type: AuthErrorType, context: ErrorContext): number | undefined {
    switch (type) {
      case AuthErrorType.RATE_LIMIT_EXCEEDED:
        return 60000 // 1 minute
      
      case AuthErrorType.ACCOUNT_TEMPORARILY_LOCKED:
        return 900000 // 15 minutes
      
      case AuthErrorType.SERVICE_UNAVAILABLE:
        return 300000 // 5 minutes
      
      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.TIMEOUT_ERROR:
        return 10000 // 10 seconds
      
      default:
        return undefined
    }
  }

  /**
   * Extract relevant error details for logging
   */
  private extractErrorDetails(error: any): any {
    if (!error) return null

    return {
      code: error.code,
      status: error.status,
      name: error.name,
      stack: error.stack ? error.stack.split('\n').slice(0, 5) : undefined,
      supabaseError: error.__isSupabaseError ? true : undefined
    }
  }

  /**
   * Get user-friendly message for error type
   */
  getUserMessage(type: AuthErrorType): string {
    return this.errorMessages[type]?.user || this.errorMessages[AuthErrorType.UNKNOWN_ERROR].user
  }

  /**
   * Check if error is retryable
   */
  isRetryable(type: AuthErrorType): boolean {
    return this.errorMessages[type]?.retryable || false
  }

  /**
   * Get error severity level
   */
  getSeverity(type: AuthErrorType): 'low' | 'medium' | 'high' | 'critical' {
    return this.errorMessages[type]?.severity || 'medium'
  }

  /**
   * Format error for logging
   */
  formatForLogging(authError: AuthError, context: ErrorContext): string {
    return JSON.stringify({
      error: {
        type: authError.type,
        message: authError.message,
        severity: this.getSeverity(authError.type),
        retryable: authError.retryable,
        timestamp: authError.timestamp.toISOString(),
        requestId: authError.requestId
      },
      context: {
        action: context.action,
        email: context.email ? this.maskEmail(context.email) : undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent ? context.userAgent.substring(0, 100) : undefined,
        sessionId: context.sessionId
      },
      details: authError.details
    }, null, 2)
  }

  /**
   * Mask email for logging (preserve domain for analysis)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (local.length <= 2) return `${local}***@${domain}`
    return `${local.substring(0, 2)}***@${domain}`
  }
}

// Export singleton instance
export const authErrorHandler = new AuthErrorHandler()
export default authErrorHandler