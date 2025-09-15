import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  console.log('Test webhook called:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  })

  // Always return success for testing
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Test webhook received',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  )
})