import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Checkout endpoint
app.post('/api/checkout/create', async (req, res) => {
  console.log('📦 Checkout request received:', { body: req.body });
  try {
    const { priceId, userId, couponCode } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: priceId and userId' 
      });
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId;
    
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          user_id: userId
        }
      });
      
      customerId = customer.id;

      // Link customer in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customerId
        });
    }

    // Create checkout session
    const sessionParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'payment',
      success_url: `http://localhost:5173/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/?canceled=true`,
      metadata: {
        user_id: userId
      }
    };

    // Apply coupon if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          sessionParams.discounts = [{
            coupon: couponCode
          }];
        }
      } catch (couponError) {
        console.warn('Invalid coupon code:', couponCode);
        // Continue without coupon rather than failing
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log('✅ Checkout session created:', session.id);
    console.log('🔗 Redirect URL:', session.url);

    return res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});

// Test webhook endpoint
app.post('/api/webhooks/test', express.json(), async (req, res) => {
  console.log('🔧 Test webhook called:', req.body);
  res.json({ received: true, message: 'Test webhook working' });
});

// Webhook endpoint (for Stripe events)
// Note: This endpoint needs raw body for signature verification
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    
    console.log(`Received webhook: ${event.type} (${event.id})`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Payment successful for session:', session.id);
        
        // Extract metadata
        const userId = session.metadata.user_id;
        const amountTotal = session.amount_total || 0;
        
        // Calculate credits based on amount
        let creditsToAdd = 0;
        switch (amountTotal) {
          case 499:  // $4.99 - Starter Pack
            creditsToAdd = 10;
            break;
          case 999:  // $9.99 - Wedding Pack
            creditsToAdd = 25;
            break;
          case 2499: // $24.99 - Party Pack
            creditsToAdd = 75;
            break;
          default:
            console.warn(`Unknown payment amount: ${amountTotal} cents`);
        }
        
        if (creditsToAdd > 0 && userId) {
          try {
            // Update user credits in database
            const { error } = await supabase.rpc('add_paid_credits', {
              p_user_id: userId,
              p_credits: creditsToAdd,
              p_stripe_payment_id: session.payment_intent,
              p_description: `Credit purchase - Session ${session.id}`
            });
            
            if (error) {
              console.error('Error adding credits:', error);
            } else {
              console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);
            }
          } catch (dbError) {
            console.error('Database error:', dbError);
          }
        }
        break;
        
      case 'payment_intent.succeeded':
        console.log('Payment intent succeeded:', event.data.object.id);
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
  console.log('Stripe checkout endpoint: http://localhost:3001/api/checkout/create');
});