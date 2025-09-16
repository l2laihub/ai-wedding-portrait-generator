// Test the admin metrics edge function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptgmobxrvptiahundusu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z21vYnhydnB0aWFodW5kdXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MjMwNjMsImV4cCI6MjA3MzM5OTA2M30.dn5oK1vSL9pFLBcpvoVXo4XOl9GlP0hp8H2A6IWhkQU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminMetrics() {
  console.log('🧪 Testing admin metrics edge function...\n');

  try {
    // First, sign in as admin
    console.log('1. Signing in as admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@huybuilds.app',
      password: 'password123'  // You'll need to use the actual password
    });

    if (authError) {
      console.log('❌ Sign in failed:', authError.message);
      return;
    }

    console.log('✅ Signed in as:', authData.user.email);

    // Get session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('❌ No valid session found');
      return;
    }

    console.log('✅ Got session token');

    // Call admin metrics function
    console.log('2. Calling admin metrics function...');
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.log('❌ Function call failed:', errorData);
      return;
    }

    const metrics = await response.json();
    console.log('✅ Metrics received:', metrics);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAdminMetrics();