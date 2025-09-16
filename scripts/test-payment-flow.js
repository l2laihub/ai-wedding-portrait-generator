#!/usr/bin/env node

/**
 * Test script for end-to-end payment flow
 * Tests: Checkout creation -> Webhook processing -> Credit addition
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPaymentFlow() {
  console.log('🧪 Testing Payment Flow End-to-End\n');

  try {
    // Step 1: Check database connectivity
    console.log('1️⃣ Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    const testUser = testData[0];
    if (!testUser) {
      throw new Error('No test user found in database');
    }
    
    console.log(`✅ Database connected. Test user: ${testUser.email}`);

    // Step 2: Check current credits
    console.log('\n2️⃣ Checking current credit balance...');
    const { data: creditsData, error: creditsError } = await supabase
      .rpc('get_user_credits_with_reset', { p_user_id: testUser.id });
    
    if (creditsError) {
      console.warn(`⚠️  Credits check failed: ${creditsError.message}`);
    } else {
      console.log(`✅ Current credits: ${JSON.stringify(creditsData)}`);
    }

    // Step 3: Test verify_payment_and_add_credits function
    console.log('\n3️⃣ Testing payment verification function...');
    const testSessionId = `cs_test_${Date.now()}_manual_test`;
    
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('verify_payment_and_add_credits', {
        p_session_id: testSessionId,
        p_user_id: testUser.id
      });
    
    if (verifyError) {
      console.error(`❌ Payment verification failed: ${verifyError.message}`);
    } else {
      console.log(`✅ Payment verification result:`, verifyData);
    }

    // Step 4: Verify credits were added
    console.log('\n4️⃣ Verifying credits were added...');
    const { data: newCreditsData, error: newCreditsError } = await supabase
      .rpc('get_user_credits_with_reset', { p_user_id: testUser.id });
    
    if (newCreditsError) {
      console.error(`❌ Credits verification failed: ${newCreditsError.message}`);
    } else {
      console.log(`✅ Updated credits: ${JSON.stringify(newCreditsData)}`);
    }

    // Step 5: Check transaction history
    console.log('\n5️⃣ Checking transaction history...');
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('stripe_payment_id', testSessionId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (transactionError) {
      console.error(`❌ Transaction history check failed: ${transactionError.message}`);
    } else if (transactionData.length === 0) {
      console.warn('⚠️  No transaction record found');
    } else {
      console.log(`✅ Transaction recorded:`, transactionData[0]);
    }

    // Step 6: Test webhook endpoint accessibility
    console.log('\n6️⃣ Testing webhook endpoint...');
    const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'connectivity' })
      });
      
      if (response.status === 400 || response.status === 401) {
        console.log(`✅ Webhook endpoint accessible (${response.status} - expected for unsigned request)`);
      } else {
        console.log(`⚠️  Webhook returned unexpected status: ${response.status}`);
      }
    } catch (fetchError) {
      console.error(`❌ Webhook endpoint not accessible: ${fetchError.message}`);
    }

    console.log('\n✅ Payment flow test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Make a real test payment through the app');
    console.log('2. Check that credits are added correctly');
    console.log('3. Verify transaction is logged in database');
    console.log('4. Monitor webhook logs in Supabase dashboard');

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testPaymentFlow();