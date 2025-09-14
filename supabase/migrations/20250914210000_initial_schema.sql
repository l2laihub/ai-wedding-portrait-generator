-- WedAI Database Schema
-- Initial migration for monetization features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to generate referral codes
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS text AS $$
BEGIN
  RETURN lower(substring(gen_random_uuid()::text from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Waitlist table for email capture
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  promised_credits INTEGER DEFAULT 10,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage analytics table
CREATE TABLE usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  portrait_type TEXT,
  theme TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  referral_code TEXT UNIQUE DEFAULT generate_referral_code()
);

-- User credits table
CREATE TABLE user_credits (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  free_credits_used_today INTEGER DEFAULT 0,
  paid_credits INTEGER DEFAULT 0,
  bonus_credits INTEGER DEFAULT 0,
  last_free_reset DATE DEFAULT CURRENT_DATE
);

-- Credit transactions table
CREATE TABLE credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'free_daily', 'purchase', 'bonus', 'usage', 'refund'
  amount INTEGER NOT NULL, -- positive for credit, negative for debit
  balance_after INTEGER NOT NULL,
  description TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referrals table
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed'
  credits_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at);
CREATE INDEX idx_usage_analytics_timestamp ON usage_analytics(timestamp);
CREATE INDEX idx_usage_analytics_session_id ON usage_analytics(session_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Row Level Security (RLS) policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Waitlist policies (public read for count, insert only)
CREATE POLICY "Anyone can insert into waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read waitlist count" ON waitlist
  FOR SELECT USING (true);

-- Usage analytics policies (public insert for tracking)
CREATE POLICY "Anyone can insert analytics" ON usage_analytics
  FOR INSERT WITH CHECK (true);

-- Users policies (users can read/update their own data)
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User credits policies (users can view their own credits)
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Credit transactions policies (users can view their own transactions)
CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Referrals policies (users can view their own referrals)
CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);

-- Functions for credit management
CREATE OR REPLACE FUNCTION reset_daily_credits() RETURNS void AS $$
BEGIN
  UPDATE user_credits 
  SET free_credits_used_today = 0, last_free_reset = CURRENT_DATE
  WHERE last_free_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Insert into users table with error handling
  INSERT INTO users (id, email, display_name, referral_code)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    generate_referral_code()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into user_credits table with error handling  
  INSERT INTO user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Function to process referral completion
CREATE OR REPLACE FUNCTION complete_referral(referrer_id UUID, referred_id UUID) 
RETURNS void AS $$
BEGIN
  -- Update referral status (PostgreSQL doesn't support LIMIT in UPDATE)
  UPDATE referrals 
  SET status = 'completed', 
      referred_user_id = referred_id,
      credits_earned = 5
  WHERE id = (
    SELECT id FROM referrals 
    WHERE referrer_user_id = referrer_id 
      AND referred_user_id IS NULL
      AND status = 'pending'
    LIMIT 1
  );
  
  -- Add bonus credits to referrer
  UPDATE user_credits 
  SET bonus_credits = bonus_credits + 5
  WHERE user_id = referrer_id;
  
  -- Add welcome credits to referred user
  UPDATE user_credits 
  SET bonus_credits = bonus_credits + 10
  WHERE user_id = referred_id;
  
  -- Log transactions
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
  SELECT referrer_id, 'bonus', 5, (SELECT bonus_credits FROM user_credits WHERE user_id = referrer_id), 'Referral reward';
  
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
  SELECT referred_id, 'bonus', 10, (SELECT bonus_credits FROM user_credits WHERE user_id = referred_id), 'Welcome bonus';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin views (for dashboard)
CREATE VIEW admin_stats AS
SELECT 
  (SELECT COUNT(*) FROM waitlist) as waitlist_count,
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM usage_analytics WHERE timestamp >= CURRENT_DATE) as today_generations,
  (SELECT COUNT(*) FROM usage_analytics) as total_generations,
  (SELECT SUM(paid_credits) FROM user_credits) as total_paid_credits;

-- Comments for documentation
COMMENT ON TABLE waitlist IS 'Email waitlist for pre-launch signups';
COMMENT ON TABLE usage_analytics IS 'Track portrait generation usage';
COMMENT ON TABLE users IS 'Extended user profiles';
COMMENT ON TABLE user_credits IS 'User credit balances and usage tracking';
COMMENT ON TABLE credit_transactions IS 'Log of all credit transactions';
COMMENT ON TABLE referrals IS 'Referral tracking system';

-- Initial data (optional)
-- Add any seed data here if needed