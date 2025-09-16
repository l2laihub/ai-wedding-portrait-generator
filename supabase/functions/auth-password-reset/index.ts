import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PasswordResetRequest {
  email: string
  redirectTo?: string
}

interface PasswordUpdateRequest {
  newPassword: string
  accessToken?: string
}

interface TokenValidationRequest {
  token: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname

    // Route requests based on path
    switch (path) {
      case '/auth-password-reset/request':
        return await handlePasswordResetRequest(req, supabase)
      
      case '/auth-password-reset/validate':
        return await handleTokenValidation(req, supabase)
      
      case '/auth-password-reset/update':
        return await handlePasswordUpdate(req, supabase)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }), 
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Password reset API error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Handle password reset request
 */
async function handlePasswordResetRequest(
  req: Request, 
  supabase: any
): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const body: PasswordResetRequest = await req.json()
    const { email, redirectTo } = body

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(supabase, email, 'password_reset')
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        }), 
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user exists (optional check to prevent email enumeration)
    const { data: user } = await supabase.auth.admin.getUserByEmail(email)
    
    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      const resetUrl = redirectTo || `${getBaseUrl(req)}/reset-password`
      
      const { error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: resetUrl
        }
      })

      if (error) {
        console.error('Password reset email error:', error)
        // Don't expose internal errors to prevent information leakage
      }

      // Log password reset request for security monitoring
      await logSecurityEvent(supabase, {
        event_type: 'password_reset_requested',
        email: email,
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent'),
        success: !error
      })
    }

    // Always return success response (security best practice)
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link shortly.' 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Password reset request error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process password reset request' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Validate password reset token
 */
async function handleTokenValidation(
  req: Request, 
  supabase: any
): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const body: TokenValidationRequest = await req.json()
    const { token } = body

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate token using Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    })

    const isValid = !error && data.user

    // Log token validation attempt
    await logSecurityEvent(supabase, {
      event_type: 'password_reset_token_validated',
      user_id: data?.user?.id,
      ip_address: getClientIP(req),
      user_agent: req.headers.get('user-agent'),
      success: isValid
    })

    return new Response(
      JSON.stringify({ 
        valid: isValid,
        user: isValid ? {
          id: data.user.id,
          email: data.user.email
        } : null
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Token validation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to validate token' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Handle password update
 */
async function handlePasswordUpdate(
  req: Request, 
  supabase: any
): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const body: PasswordUpdateRequest = await req.json()
    const { newPassword, accessToken } = body

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Password does not meet requirements',
          requirements: passwordValidation.requirements
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authorization header or use provided access token
    const authHeader = req.headers.get('authorization')
    const token = accessToken || (authHeader?.replace('Bearer ', ''))

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create authenticated supabase client
    const authenticatedSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Update password
    const { data, error } = await authenticatedSupabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Password update error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log successful password change
    await logSecurityEvent(supabase, {
      event_type: 'password_changed',
      user_id: data.user.id,
      email: data.user.email,
      ip_address: getClientIP(req),
      user_agent: req.headers.get('user-agent'),
      success: true
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password updated successfully'
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Password update error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update password' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Utility Functions
 */

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

function validatePasswordStrength(password: string): { valid: boolean; requirements: string[] } {
  const requirements = []
  
  if (!password || password.length < 8) {
    requirements.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    requirements.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    requirements.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    requirements.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    requirements.push('Password must contain at least one special character')
  }

  return {
    valid: requirements.length === 0,
    requirements
  }
}

async function checkRateLimit(
  supabase: any, 
  identifier: string, 
  action: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  try {
    // Check recent attempts
    const { data: attempts } = await supabase
      .from('rate_limit_logs')
      .select('created_at')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })

    // Allow max 5 attempts per hour
    const maxAttempts = 5
    if (attempts && attempts.length >= maxAttempts) {
      const oldestAttempt = new Date(attempts[attempts.length - 1].created_at)
      const retryAfter = Math.ceil((oldestAttempt.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000)
      return { allowed: false, retryAfter }
    }

    // Log this attempt
    await supabase
      .from('rate_limit_logs')
      .insert({
        identifier,
        action,
        ip_address: 'unknown', // Will be set by calling function
        created_at: now.toISOString()
      })

    return { allowed: true }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Allow on error to prevent blocking legitimate users
    return { allowed: true }
  }
}

async function logSecurityEvent(supabase: any, event: any): Promise<void> {
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

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown'
}

function getBaseUrl(req: Request): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}