import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Initialize Stripe with the secret key
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  })

  // Log incoming request details for debugging
  console.log('Webhook request received:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  })

  const signature = req.headers.get('stripe-signature')
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  
  if (!signature) {
    console.error('Missing stripe signature header')
    return new Response(JSON.stringify({ error: 'Missing stripe signature' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    
    console.log(`Received webhook: ${event.type} (${event.id})`)

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Payment successful for session:', session.id)
        
        // Extract metadata
        const userId = session.metadata?.user_id
        const amountTotal = session.amount_total || 0
        
        if (!userId) {
          console.error('No user_id found in session metadata')
          break
        }
        
        // Calculate credits based on amount
        let creditsToAdd = 0
        switch (amountTotal) {
          case 499:  // $4.99 - Starter Pack
            creditsToAdd = 10
            break
          case 999:  // $9.99 - Wedding Pack
            creditsToAdd = 25
            break
          case 2499: // $24.99 - Party Pack
            creditsToAdd = 75
            break
          default:
            console.warn(`Unknown payment amount: ${amountTotal} cents`)
        }
        
        if (creditsToAdd > 0) {
          try {
            // Call database function to add credits
            const { error } = await supabase.rpc('add_paid_credits', {
              p_user_id: userId,
              p_credits: creditsToAdd,
              p_stripe_payment_id: session.payment_intent,
              p_description: `Credit purchase - Session ${session.id}`
            })
            
            if (error) {
              console.error('Error adding credits:', error)
            } else {
              console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`)
            }
          } catch (dbError) {
            console.error('Database error:', dbError)
          }
        }
        break
      }
      
      case 'payment_intent.succeeded':
        console.log('Payment intent succeeded:', event.data.object.id)
        break
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Webhook Error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})