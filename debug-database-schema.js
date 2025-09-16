// Debug script to check what tables and data exist in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptgmobxrvptiahundusu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z21vYnhydnB0aWFodW5kdXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyMzA2MywiZXhwIjoyMDczMzk5MDYzfQ.7Yg9e__QhWdPvLT-aaq1prMwfOtDIigW2n-hZLRmHCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('🔍 Debugging database schema and data...\n');

  // Check users table
  console.log('👥 Users table:');
  try {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    console.log(`- Total users: ${count}`);
    
    const { data: sampleUsers } = await supabase.from('users').select('*').limit(3);
    console.log(`- Sample users:`, sampleUsers?.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  // Check usage_analytics table
  console.log('\n📊 Usage Analytics table:');
  try {
    const { count } = await supabase.from('usage_analytics').select('*', { count: 'exact', head: true });
    console.log(`- Total analytics records: ${count}`);
    
    const { data: sampleAnalytics } = await supabase.from('usage_analytics').select('*').limit(3);
    console.log(`- Sample analytics:`, sampleAnalytics);
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  // Check payment_logs table
  console.log('\n💰 Payment Logs table:');
  try {
    const { count } = await supabase.from('payment_logs').select('*', { count: 'exact', head: true });
    console.log(`- Total payment records: ${count}`);
    
    const { data: samplePayments } = await supabase.from('payment_logs').select('*').limit(3);
    console.log(`- Sample payments:`, samplePayments);
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  // Check user_credits table
  console.log('\n💳 User Credits table:');
  try {
    const { count } = await supabase.from('user_credits').select('*', { count: 'exact', head: true });
    console.log(`- Total credit records: ${count}`);
    
    const { data: sampleCredits } = await supabase.from('user_credits').select('*').limit(3);
    console.log(`- Sample credits:`, sampleCredits);
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  // Check credit_transactions table
  console.log('\n💸 Credit Transactions table:');
  try {
    const { count } = await supabase.from('credit_transactions').select('*', { count: 'exact', head: true });
    console.log(`- Total transaction records: ${count}`);
    
    const { data: sampleTransactions } = await supabase.from('credit_transactions').select('*').limit(3);
    console.log(`- Sample transactions:`, sampleTransactions);
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  // Check waitlist table
  console.log('\n📝 Waitlist table:');
  try {
    const { count } = await supabase.from('waitlist').select('*', { count: 'exact', head: true });
    console.log(`- Total waitlist records: ${count}`);
    
    const { data: sampleWaitlist } = await supabase.from('waitlist').select('*').limit(3);
    console.log(`- Sample waitlist:`, sampleWaitlist?.map(w => ({ email: w.email, created_at: w.created_at })));
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  // Check admin_users table
  console.log('\n👑 Admin Users table:');
  try {
    const { count } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    console.log(`- Total admin records: ${count}`);
    
    const { data: sampleAdmins } = await supabase.from('admin_users').select('*').limit(3);
    console.log(`- Sample admins:`, sampleAdmins);
  } catch (error) {
    console.log(`- Error: ${error.message}`);
  }

  console.log('\n✅ Database debug complete!');
}

debugDatabase().catch(console.error);