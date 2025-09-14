import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on the implementation plan
export interface WaitlistEntry {
  id: string
  email: string
  source: string
  promised_credits: number
  ip_address?: string
  created_at: string
}

export interface UsageAnalytics {
  id: string
  session_id?: string
  portrait_type?: string
  theme?: string
  timestamp: string
}

export interface User {
  id: string
  email: string
  display_name?: string
  created_at: string
  last_login?: string
  referral_code: string
}

export interface UserCredits {
  user_id: string
  free_credits_used_today: number
  paid_credits: number
  bonus_credits: number
  last_free_reset: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  type: 'free_daily' | 'purchase' | 'bonus' | 'usage' | 'refund'
  amount: number
  balance_after: number
  description?: string
  stripe_payment_id?: string
  created_at: string
}

export interface Referral {
  id: string
  referrer_user_id: string
  referred_email: string
  referred_user_id?: string
  status: 'pending' | 'completed'
  credits_earned: number
  created_at: string
}

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export default supabase