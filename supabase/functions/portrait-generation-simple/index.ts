import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// Environment variables
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

interface GenerationRequest {
  imageData: string // base64 encoded image
  imageType: string // mime type
  prompt: string
  style: string
  userId?: string
  sessionId?: string
}

// Simple in-memory rate limiting for demo
const rateLimits = new Map<string, { count: number, resetAt: number }>()

const checkSimpleRateLimit = (identifier: string, limit: number = 3): { canProceed: boolean, remaining: number } => {
  // Simple stateless rate limiting based on identifier hash
  // In production, this should use a database or Redis for persistence
  
  const hash = Array.from(identifier).reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  
  // Use hash to determine usage (0 to limit-1)
  const simulatedUsage = Math.abs(hash) % (limit + 1);
  
  const remaining = Math.max(0, limit - simulatedUsage);
  const canProceed = simulatedUsage < limit;
  
  return { canProceed, remaining }
}

const callGeminiAPI = async (imageData: string, mimeType: string, prompt: string) => {
  const requestBody = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageData
          }
        },
        {
          text: prompt
        }
      ]
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT']
    }
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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

    // Call Gemini API
    const result = await callGeminiAPI(imageData, imageType, prompt)
    
    const processingTime = Date.now() - startTime

    // Return successful result
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
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