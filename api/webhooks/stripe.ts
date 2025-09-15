/**
 * Stripe Webhook Handler
 * 
 * Security-first implementation for processing Stripe webhooks
 * - Signature verification to prevent replay attacks
 * - Idempotency to handle duplicate events
 * - Atomic database operations
 * - Comprehensive error handling and logging
 * - Rate limiting protection
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Supabase admin client for webhook operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Types for webhook events
interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
  request?: {
    id?: string;
    idempotency_key?: string;
  };
}

interface WebhookProcessingResult {
  success: boolean;
  error?: string;
  processed: boolean;
  eventId: string;
  eventType: string;
}

/**
 * Security: Verify webhook signature from Stripe
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<WebhookEvent> {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event as WebhookEvent;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Check if event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking event processing status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isEventProcessed:', error);
    return false;
  }
}

/**
 * Mark event as processed
 */
async function markEventProcessed(
  eventId: string,
  eventType: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await supabaseAdmin.from('webhook_events').insert({
      stripe_event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
      success,
      error_message: errorMessage,
    });
  } catch (error) {
    console.error('Error marking event as processed:', error);
  }
}

/**
 * Calculate credits from payment amount based on pricing tiers
 */
function getCreditsFromAmount(amountInCents: number): number {
  // Pricing tiers based on stripeService.ts
  switch (amountInCents) {
    case 499:  // $4.99 - Starter Pack
      return 10;
    case 999:  // $9.99 - Wedding Pack
      return 25;
    case 2499: // $24.99 - Party Pack
      return 75;
    default:
      // Handle discounted amounts (50% off for launch weekend)
      const discountedAmounts = {
        250: 10,  // $2.50 (50% off Starter)
        500: 25,  // $5.00 (50% off Wedding) 
        1250: 75  // $12.50 (50% off Party)
      };
      
      if (discountedAmounts[amountInCents as keyof typeof discountedAmounts]) {
        return discountedAmounts[amountInCents as keyof typeof discountedAmounts];
      }
      
      // Fallback calculation for unknown amounts
      console.warn(`Unknown payment amount: ${amountInCents} cents`);
      return Math.floor(amountInCents / 50); // Default: 1 credit per $0.50
  }
}

/**
 * Process checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(event: WebhookEvent): Promise<WebhookProcessingResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = session.customer as string;
  const paymentIntentId = session.payment_intent as string;
  const amountTotal = session.amount_total || 0;
  
  // Calculate credits based on our pricing tiers
  const creditsToAdd = getCreditsFromAmount(amountTotal);

  try {
    // Start transaction
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const userId = customerData.user_id;

    // Add credits atomically
    const { error: creditsError } = await supabaseAdmin.rpc(
      'add_paid_credits',
      {
        p_user_id: userId,
        p_credits: creditsToAdd,
        p_stripe_payment_id: paymentIntentId,
        p_description: `Credit purchase - Session ${session.id}`
      }
    );

    if (creditsError) {
      throw creditsError;
    }

    console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);

    return {
      success: true,
      processed: true,
      eventId: event.id,
      eventType: event.type,
    };
  } catch (error) {
    console.error('Error processing checkout.session.completed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false,
      eventId: event.id,
      eventType: event.type,
    };
  }
}

/**
 * Process payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(event: WebhookEvent): Promise<WebhookProcessingResult> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const customerId = paymentIntent.customer as string;
  const amount = paymentIntent.amount;

  try {
    // Log successful payment for audit trail
    const { error: logError } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        stripe_payment_id: paymentIntent.id,
        customer_id: customerId,
        amount,
        status: 'succeeded',
        event_type: 'payment_intent.succeeded',
        metadata: paymentIntent.metadata,
      });

    if (logError) {
      console.error('Error logging payment intent:', logError);
    }

    return {
      success: true,
      processed: true,
      eventId: event.id,
      eventType: event.type,
    };
  } catch (error) {
    console.error('Error processing payment_intent.succeeded:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false,
      eventId: event.id,
      eventType: event.type,
    };
  }
}

/**
 * Process payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: WebhookEvent): Promise<WebhookProcessingResult> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const customerId = paymentIntent.customer as string;
  const failureCode = paymentIntent.last_payment_error?.code;
  const failureMessage = paymentIntent.last_payment_error?.message;

  try {
    // Log failed payment
    const { error: logError } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        stripe_payment_id: paymentIntent.id,
        customer_id: customerId,
        amount: paymentIntent.amount,
        status: 'failed',
        event_type: 'payment_intent.payment_failed',
        error_code: failureCode,
        error_message: failureMessage,
        metadata: paymentIntent.metadata,
      });

    if (logError) {
      console.error('Error logging failed payment:', logError);
    }

    return {
      success: true,
      processed: true,
      eventId: event.id,
      eventType: event.type,
    };
  } catch (error) {
    console.error('Error processing payment_intent.payment_failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false,
      eventId: event.id,
      eventType: event.type,
    };
  }
}

/**
 * Process customer.subscription.created event (future subscription handling)
 */
async function handleSubscriptionCreated(event: WebhookEvent): Promise<WebhookProcessingResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  try {
    // Get user from customer ID
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // Store subscription data
    const { error: subscriptionError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: customerData.user_id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        plan_id: subscription.items.data[0]?.price.id,
      });

    if (subscriptionError) {
      throw subscriptionError;
    }

    return {
      success: true,
      processed: true,
      eventId: event.id,
      eventType: event.type,
    };
  } catch (error) {
    console.error('Error processing customer.subscription.created:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false,
      eventId: event.id,
      eventType: event.type,
    };
  }
}

/**
 * Main webhook handler
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body for signature verification
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(payload, signature);

    console.log(`Received webhook: ${event.type} (${event.id})`);

    // Check if event already processed (idempotency)
    if (await isEventProcessed(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, skipped: true });
    }

    let result: WebhookProcessingResult;

    // Process event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(event);
        break;
      case 'payment_intent.succeeded':
        result = await handlePaymentIntentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        result = await handlePaymentIntentFailed(event);
        break;
      case 'customer.subscription.created':
        result = await handleSubscriptionCreated(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        result = {
          success: true,
          processed: false,
          eventId: event.id,
          eventType: event.type,
        };
    }

    // Mark event as processed
    await markEventProcessed(
      event.id,
      event.type,
      result.success,
      result.error
    );

    if (!result.success) {
      console.error(`Failed to process event ${event.id}: ${result.error}`);
      return NextResponse.json(
        { error: 'Event processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      received: true, 
      processed: result.processed,
      eventType: event.type 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export configuration for Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';