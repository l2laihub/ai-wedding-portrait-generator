import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface GenerationRequest {
  imageData: string // base64 encoded image
  imageType: string // mime type
  prompt: string
  style: string
  userId?: string
  sessionId?: string
  apiKey?: string
}

interface RateLimitResult {
  can_proceed: boolean
  hourly_count: number
  daily_count: number
  hourly_limit: number
  daily_limit: number
  hourly_remaining: number
  daily_remaining: number
  reset_at: string
}

// Rate limiting configuration
const RATE_LIMITS = {
  anonymous: { hourly: 3, daily: 3 },
  authenticated: { hourly: 30, daily: 100 },
  premium: { hourly: 100, daily: 500 }
}

const fileToBase64 = (base64Data: string, mimeType: string) => {
  return { base64: base64Data, mimeType }
}

const callGeminiAPI = async (imageData: string, mimeType: string, prompt: string) => {
  const requestBody = {
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType,
          }
        },
        {
          text: prompt
        }
      ]
    },
    config: {
      responseModalities: ['IMAGE', 'TEXT']
    }
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  
  // Extract image and text from response
  const generatedContent = {
    imageUrl: null as string | null,
    text: null as string | null,
  }

  if (result.candidates && result.candidates.length > 0) {
    for (const part of result.candidates[0].content.parts) {
      if (part.text) {
        generatedContent.text = part.text
      } else if (part.inlineData) {
        generatedContent.imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }
  }
  
  if (!generatedContent.imageUrl) {
    throw new Error("API did not return an image. It may have considered the prompt unsafe.")
  }

  return generatedContent
}

const validateApiKey = async (apiKey: string): Promise<any> => {
  const { data, error } = await supabase.rpc('validate_api_key', {
    p_raw_key: apiKey
  })
  
  if (error) {
    console.error('API key validation error:', error)
    throw new Error('Invalid API key')
  }
  
  return data
}

const checkRateLimit = async (
  identifier: string, 
  identifierType: string, 
  userType: 'anonymous' | 'authenticated' | 'premium' = 'anonymous'
): Promise<RateLimitResult> => {
  const limits = RATE_LIMITS[userType]
  
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_identifier_type: identifierType,
    p_limit_per_hour: limits.hourly,
    p_limit_per_day: limits.daily
  })
  
  if (error) {
    console.error('Rate limit check error:', error)
    throw new Error('Rate limit check failed')
  }
  
  return data as RateLimitResult
}

const recordGenerationRequest = async (
  userId: string | null,
  sessionId: string | null,
  ipAddress: string,
  userAgent: string | null,
  requestHash: string,
  styles: string[],
  creditsConsumed: number = 1
): Promise<string> => {
  const { data, error } = await supabase.rpc('record_generation_request', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
    p_request_hash: requestHash,
    p_styles: styles,
    p_credits_consumed: creditsConsumed
  })
  
  if (error) {
    console.error('Failed to record generation request:', error)
    throw new Error('Failed to record request')
  }
  
  return data
}

const updateGenerationRequest = async (
  requestId: string,
  status: string,
  processingTimeMs?: number,
  errorMessage?: string
) => {
  const { error } = await supabase.rpc('update_generation_request', {
    p_request_id: requestId,
    p_status: status,
    p_processing_time_ms: processingTimeMs,
    p_error_message: errorMessage
  })
  
  if (error) {
    console.error('Failed to update generation request:', error)
  }
}

const generateRequestHash = async (imageData: string, prompt: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(imageData + prompt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const getUserType = async (userId: string | null): Promise<'anonymous' | 'authenticated' | 'premium'> => {
  if (!userId) return 'anonymous'
  
  // Check if user has any credits (paid or bonus)
  const { data: credits } = await supabase
    .from('user_credits')
    .select('paid_credits, bonus_credits')
    .eq('user_id', userId)
    .single()
  
  if (credits && (credits.paid_credits > 0 || credits.bonus_credits > 0)) {
    return 'premium'
  }
  
  return 'authenticated'
}

const getClientIP = (request: Request): string => {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  
  return '127.0.0.1' // fallback
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    const startTime = Date.now()
    const clientIP = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || null
    
    // Parse request body
    const requestData: GenerationRequest = await req.json()
    const { imageData, imageType, prompt, style, userId, sessionId, apiKey } = requestData

    // Validate required fields
    if (!imageData || !imageType || !prompt || !style) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageData, imageType, prompt, style' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate API key if provided (for service-to-service calls)
    if (apiKey) {
      try {
        const keyValidation = await validateApiKey(apiKey)
        if (!keyValidation.valid) {
          return new Response(
            JSON.stringify({ error: 'Invalid API key' }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'API key validation failed' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Get authenticated user ID from JWT token if available
    let authenticatedUserId: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        authenticatedUserId = user?.id || null
      } catch (error) {
        console.warn('Failed to get user from token:', error)
      }
    }

    // Use authenticated user ID over request body userId for security
    const finalUserId = authenticatedUserId || userId || null

    // Determine user type and identifier for rate limiting
    const userType = await getUserType(finalUserId)
    const identifier = finalUserId || sessionId || clientIP
    const identifierType = finalUserId ? 'user' : sessionId ? 'anonymous' : 'ip'

    // Check rate limits
    const rateLimitResult = await checkRateLimit(identifier, identifierType, userType)
    
    if (!rateLimitResult.can_proceed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          rate_limit: {
            hourly_remaining: rateLimitResult.hourly_remaining,
            daily_remaining: rateLimitResult.daily_remaining,
            reset_at: rateLimitResult.reset_at
          }
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate request hash for duplicate detection
    const requestHash = await generateRequestHash(imageData, prompt)

    // Record the generation request
    const requestId = await recordGenerationRequest(
      finalUserId,
      sessionId || null,
      clientIP,
      userAgent,
      requestHash,
      [style],
      1
    )

    // Update request status to processing
    await updateGenerationRequest(requestId, 'processing')

    try {
      // Call Gemini API
      const result = await callGeminiAPI(imageData, imageType, prompt)
      
      const processingTime = Date.now() - startTime

      // Update request status to completed
      await updateGenerationRequest(requestId, 'completed', processingTime)

      // Return successful result
      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          style: style,
          processing_time_ms: processingTime,
          rate_limit: {
            hourly_remaining: rateLimitResult.hourly_remaining - 1,
            daily_remaining: rateLimitResult.daily_remaining - 1,
            reset_at: rateLimitResult.reset_at
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (geminiError) {
      const processingTime = Date.now() - startTime
      const errorMessage = geminiError instanceof Error ? geminiError.message : 'Unknown error'
      
      console.error('Gemini API error:', errorMessage)
      
      // Update request status to failed
      await updateGenerationRequest(requestId, 'failed', processingTime, errorMessage)
      
      return new Response(
        JSON.stringify({ 
          error: 'Portrait generation failed', 
          details: errorMessage,
          processing_time_ms: processingTime
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Portrait generation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})