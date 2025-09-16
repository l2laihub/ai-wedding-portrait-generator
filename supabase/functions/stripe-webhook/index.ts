import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Allow webhook access - Stripe webhooks don't send authorization headers
  // We rely on webhook signature verification for security instead

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
    const event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret)
    
    console.log(`Received webhook: ${event.type} (${event.id})`)

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      console.log('Event already processed:', event.id)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Record webhook event for tracking
    try {
      await supabase
        .from('webhook_events')
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          success: true
        })
    } catch (logError) {
      console.error('Failed to log webhook event:', logError)
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Payment successful for session:', session.id)
        
        // Extract metadata and try customer lookup as fallback
        let userId = session.metadata?.user_id
        const amountTotal = session.amount_total || 0
        
        // If no user_id in metadata, try to find it via customer lookup
        if (!userId && session.customer) {
          console.log('No user_id in metadata, looking up customer:', session.customer)
          const { data: customerData, error: customerError } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('stripe_customer_id', session.customer)
            .single()
          
          if (customerData && !customerError) {
            userId = customerData.user_id
            console.log('Found user_id via customer lookup:', userId)
          } else {
            console.error('Customer lookup failed:', customerError)
          }
        }
        
        if (!userId) {
          console.error('No user_id found in session metadata or customer lookup')
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
        
        // Log payment details for admin dashboard
        const paymentLogData = {
          stripe_payment_id: session.payment_intent || session.id,
          customer_id: session.customer as string,
          user_id: userId,
          amount: amountTotal,
          status: 'succeeded',
          event_type: event.type,
          metadata: {
            session_id: session.id,
            customer_email: session.customer_email,
            payment_method_types: session.payment_method_types,
            credits_added: creditsToAdd
          }
        }

        // Insert payment log for admin tracking
        try {
          await supabase
            .from('payment_logs')
            .insert(paymentLogData)
        } catch (logError) {
          console.error('Failed to log payment:', logError)
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
              
              // Update payment log with error
              await supabase
                .from('payment_logs')
                .update({
                  status: 'failed',
                  error_message: error.message
                })
                .eq('stripe_payment_id', session.payment_intent || session.id)
            } else {
              console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`)
              
              // Log user activity
              await supabase
                .from('user_activity_logs')
                .insert({
                  user_id: userId,
                  activity_type: 'purchase',
                  activity_data: {
                    credits_purchased: creditsToAdd,
                    amount_paid: amountTotal,
                    stripe_session_id: session.id
                  }
                })

              // Link Stripe customer to user if not already linked
              if (session.customer) {
                await supabase.rpc('link_stripe_customer', {
                  p_user_id: userId,
                  p_stripe_customer_id: session.customer
                })
              }
            }
          } catch (dbError) {
            console.error('Database error:', dbError)
            
            // Update payment log with error
            await supabase
              .from('payment_logs')
              .update({
                status: 'failed',
                error_message: dbError.message
              })
              .eq('stripe_payment_id', session.payment_intent || session.id)
          }
        }
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any
        console.log('Payment intent succeeded:', paymentIntent.id)
        
        // Log successful payment intent
        await supabase
          .from('payment_logs')
          .insert({
            stripe_payment_id: paymentIntent.id,
            customer_id: paymentIntent.customer,
            amount: paymentIntent.amount,
            status: 'succeeded',
            event_type: event.type,
            metadata: {
              payment_method: paymentIntent.payment_method,
              currency: paymentIntent.currency,
              description: paymentIntent.description
            }
          })
        break
      }
        
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any
        console.log('Payment failed:', paymentIntent.id)
        
        // Log failed payment
        await supabase
          .from('payment_logs')
          .insert({
            stripe_payment_id: paymentIntent.id,
            customer_id: paymentIntent.customer,
            amount: paymentIntent.amount,
            status: 'failed',
            event_type: event.type,
            error_code: paymentIntent.last_payment_error?.code,
            error_message: paymentIntent.last_payment_error?.message,
            metadata: {
              payment_method: paymentIntent.payment_method,
              currency: paymentIntent.currency,
              failure_reason: paymentIntent.last_payment_error?.type
            }
          })
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as any
        console.log('Dispute created:', dispute.id)
        
        // Log dispute for admin attention
        await supabase
          .from('payment_logs')
          .insert({
            stripe_payment_id: dispute.charge,
            amount: dispute.amount,
            status: 'disputed',
            event_type: event.type,
            error_message: `Dispute reason: ${dispute.reason}`,
            metadata: {
              dispute_id: dispute.id,
              reason: dispute.reason,
              status: dispute.status,
              evidence_due_by: dispute.evidence_details?.due_by
            }
          })

        // Create alert for admin
        await supabase
          .from('alert_history')
          .insert({
            alert_config_id: null,
            alert_value: dispute.amount,
            alert_message: `Payment dispute created for $${(dispute.amount / 100).toFixed(2)} - Reason: ${dispute.reason}`
          })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        console.log('Invoice payment failed:', invoice.id)
        
        // Log failed subscription payment
        await supabase
          .from('payment_logs')
          .insert({
            stripe_payment_id: invoice.payment_intent,
            customer_id: invoice.customer,
            amount: invoice.amount_due,
            status: 'failed',
            event_type: event.type,
            error_message: 'Subscription payment failed',
            metadata: {
              invoice_id: invoice.id,
              subscription_id: invoice.subscription,
              attempt_count: invoice.attempt_count
            }
          })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        console.log(`Subscription ${event.type.split('.').pop()}:`, subscription.id)
        
        // Find user by customer ID
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .single()

        if (customer) {
          // Update or insert subscription record
          if (event.type === 'customer.subscription.deleted') {
            await supabase
              .from('user_subscriptions')
              .update({
                status: 'canceled',
                canceled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', subscription.id)
          } else {
            await supabase
              .from('user_subscriptions')
              .upsert({
                user_id: customer.user_id,
                stripe_subscription_id: subscription.id,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                plan_id: subscription.items?.data?.[0]?.price?.id,
                cancel_at_period_end: subscription.cancel_at_period_end,
                canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'stripe_subscription_id'
              })

          // Log subscription activity
          await supabase
            .from('user_activity_logs')
            .insert({
              user_id: customer.user_id,
              activity_type: 'subscription_' + event.type.split('.').pop(),
              activity_data: {
                subscription_id: subscription.id,
                status: subscription.status,
                plan_id: subscription.items?.data?.[0]?.price?.id
              }
            })
        }
        break
      }
        
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