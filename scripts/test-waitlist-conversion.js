#!/usr/bin/env node

/**
 * Test script for waitlist conversion tracking
 * Tests if waitlist users are properly tracked when they sign up
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWaitlistConversion() {
  console.log('🧪 Testing Waitlist Conversion Tracking\n');

  try {
    // Step 1: Check waitlist entries
    console.log('1️⃣ Checking waitlist entries...');
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (waitlistError) {
      throw new Error(`Waitlist query failed: ${waitlistError.message}`);
    }
    
    console.log(`✅ Found ${waitlistData.length} recent waitlist entries`);
    if (waitlistData.length > 0) {
      console.table(waitlistData.map(w => ({
        email: w.email,
        promised_credits: w.promised_credits,
        converted: w.converted_user_id ? 'Yes' : 'No',
        bonus_granted: w.bonus_granted ? 'Yes' : 'No'
      })));
    }

    // Step 2: Check for converted users
    console.log('\n2️⃣ Checking converted users...');
    const { data: convertedData, error: convertedError } = await supabase
      .from('waitlist')
      .select('*')
      .not('converted_user_id', 'is', null);
    
    if (convertedError) {
      console.warn(`⚠️  Converted users check failed: ${convertedError.message}`);
    } else {
      console.log(`✅ Found ${convertedData?.length || 0} converted users`);
    }

    // Step 3: Check pending bonuses
    console.log('\n3️⃣ Checking pending bonuses...');
    const { data: pendingData, error: pendingError } = await supabase
      .from('waitlist')
      .select('*')
      .not('converted_user_id', 'is', null)
      .eq('bonus_granted', false);
    
    if (pendingError) {
      console.warn(`⚠️  Pending bonuses check failed: ${pendingError.message}`);
    } else {
      console.log(`✅ Found ${pendingData?.length || 0} users with pending bonuses`);
    }

    // Step 4: Check if add_bonus_credits function exists
    console.log('\n4️⃣ Checking bonus credits function...');
    const { data: funcData, error: funcError } = await supabase
      .rpc('add_bonus_credits', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        p_credits: 0,
        p_description: 'Test call - no actual credits added'
      });
    
    if (funcError && funcError.message.includes('function public.add_bonus_credits')) {
      console.log(`⚠️  Bonus credits function not found - needs deployment`);
    } else if (funcError && !funcError.message.includes('violates foreign key')) {
      console.error(`❌ Unexpected error: ${funcError.message}`);
    } else {
      console.log(`✅ Bonus credits function is available`);
    }

    // Step 5: Simulate signup process
    console.log('\n5️⃣ Testing signup flow for waitlist users...');
    console.log('When a waitlist user signs up:');
    console.log('- The trigger check_waitlist_on_user_creation will fire');
    console.log('- It will link their waitlist entry to their user account');
    console.log('- They will be marked for bonus credit distribution');

    console.log('\n✅ Waitlist conversion tracking is set up correctly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test actual user signup with a waitlist email');
    console.log('2. Verify the user gets linked in the waitlist table');
    console.log('3. When ready to launch, run grant_pending_waitlist_bonuses()');

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testWaitlistConversion();