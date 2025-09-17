import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface GenerationRequest {
  imageData: string
  imageType: string
  prompt: string
  style: string
  userId?: string
  sessionId?: string
}

// Simple in-memory rate limiting for demo
const rateLimits = new Map<string, { count: number, resetAt: number }>()

const checkSimpleRateLimit = (identifier: string, limit: number = 3): { canProceed: boolean, remaining: number } => {
  // For demo purposes, simulate rate limiting by using identifier hash
  // In a real implementation, this would use a persistent store like Redis or database
  
  const hash = Array.from(identifier).reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  
  // Simulate usage count based on hash (this is just for demo)
  const simulatedUsage = Math.abs(hash) % 4; // 0-3 usage
  
  const remaining = Math.max(0, limit - simulatedUsage);
  const canProceed = simulatedUsage < limit;
  
  return { canProceed, remaining }
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
    
    // Parse request body
    const requestData: GenerationRequest = await req.json()
    const { imageData, imageType, prompt, style, userId, sessionId } = requestData

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

    // Simple rate limiting based on session or IP
    const identifier = sessionId || userId || req.headers.get('cf-connecting-ip') || 'default'
    const rateLimit = checkSimpleRateLimit(identifier, 3) // 3 requests per day
    
    if (!rateLimit.canProceed) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily limit of 3 portraits reached. Try again tomorrow!',
          rate_limit: {
            daily_remaining: rateLimit.remaining,
            reset_at: new Date().setHours(24, 0, 0, 0)
          }
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For testing, return mock success response without calling Gemini
    const processingTime = Date.now() - startTime
    
    const mockResult = {
      imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWQKH6wAAAABJRU5ErkJggg==",
      text: `Generated ${style} wedding portrait for: ${prompt}`
    }

    // Return successful result
    return new Response(
      JSON.stringify({
        success: true,
        data: mockResult,
        style: style,
        processing_time_ms: processingTime,
        rate_limit: {
          daily_remaining: rateLimit.remaining,
          reset_at: new Date().setHours(24, 0, 0, 0)
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Portrait generation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Portrait generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})