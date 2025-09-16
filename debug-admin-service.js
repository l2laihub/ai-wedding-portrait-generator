// Debug the admin service queries directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptgmobxrvptiahundusu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z21vYnhydnB0aWFodW5kdXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MjMwNjMsImV4cCI6MjA3MzM5OTA2M30.dn5oK1vSL9pFLBcpvoVXo4XOl9GlP0hp8H2A6IWhkQU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAdminQueries() {
  console.log('🔍 Debugging admin service queries with anon key...\n');

  // Test 1: Total users count
  console.log('1. Total Users:');
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    console.log(`   Count: ${count}, Error:`, error);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Active users count
  console.log('\n2. Active Users (last 7 days):');
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`   Looking for last_login >= ${sevenDaysAgo}`);
    
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', sevenDaysAgo);
    console.log(`   Count: ${count}, Error:`, error);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Total generations count
  console.log('\n3. Total Generations:');
  try {
    const { count, error } = await supabase
      .from('usage_analytics')
      .select('*', { count: 'exact', head: true });
    console.log(`   Count: ${count}, Error:`, error);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 4: Credit purchases for revenue
  console.log('\n4. Credit Purchases:');
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('amount, user_id')
      .eq('type', 'purchase');
    
    console.log(`   Data:`, data);
    console.log(`   Error:`, error);
    
    if (data) {
      const totalCredits = data.reduce((sum, t) => sum + t.amount, 0);
      const totalRevenue = totalCredits / 10; // Convert to dollars
      const uniqueUsers = new Set(data.map(t => t.user_id)).size;
      console.log(`   Total Credits Purchased: ${totalCredits}`);
      console.log(`   Total Revenue: $${totalRevenue}`);
      console.log(`   Unique Paying Users: ${uniqueUsers}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 5: Check current auth user
  console.log('\n5. Current Auth User:');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log(`   User: ${user?.email || 'None'}, Error:`, error);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n✅ Debug complete!');
}

debugAdminQueries().catch(console.error);