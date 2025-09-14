-- Migration: webhook_payment_infrastructure
-- Created: Sat Sep 13 22:34:05 PDT 2025
-- 
-- Description: Webhook and Payment Infrastructure for secure Stripe integration

-- Webhook and Payment Infrastructure
-- Migration for secure Stripe webhook handling

-- Webhook events table for idempotency
CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stripe customers table to map Stripe customer IDs to user IDs
CREATE TABLE stripe_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment logs for audit trail
CREATE TABLE payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_payment_id TEXT NOT NULL,
  customer_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- amount in cents
  status TEXT NOT NULL, -- 'succeeded', 'failed', 'pending', 'canceled'
  event_type TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions table (for future subscription features)
CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- 'active', 'canceled', 'incomplete', etc.
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  plan_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

CREATE INDEX idx_payment_logs_stripe_id ON payment_logs(stripe_payment_id);
CREATE INDEX idx_payment_logs_customer_id ON payment_logs(customer_id);
CREATE INDEX idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX idx_payment_logs_status ON payment_logs(status);
CREATE INDEX idx_payment_logs_created_at ON payment_logs(created_at);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Row Level Security
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin/service role only for webhook operations)
CREATE POLICY "Service role can manage webhook events" ON webhook_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage stripe customers" ON stripe_customers
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own stripe customer data" ON stripe_customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment logs" ON payment_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own payment logs" ON payment_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to add paid credits (atomic operation for webhooks)
CREATE OR REPLACE FUNCTION add_paid_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_stripe_payment_id TEXT,
  p_description TEXT DEFAULT 'Credit purchase'
) RETURNS void AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Update user credits atomically
  UPDATE user_credits 
  SET paid_credits = paid_credits + p_credits
  WHERE user_id = p_user_id
  RETURNING paid_credits INTO v_new_balance;
  
  -- If no user credits record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, paid_credits)
    VALUES (p_user_id, p_credits);
    v_new_balance := p_credits;
  END IF;
  
  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id, 
    type, 
    amount, 
    balance_after, 
    description, 
    stripe_payment_id
  )
  VALUES (
    p_user_id, 
    'purchase', 
    p_credits, 
    v_new_balance, 
    p_description, 
    p_stripe_payment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle refunds
CREATE OR REPLACE FUNCTION process_refund(
  p_user_id UUID,
  p_credits INTEGER,
  p_stripe_payment_id TEXT,
  p_description TEXT DEFAULT 'Refund processed'
) RETURNS void AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Deduct refunded credits
  UPDATE user_credits 
  SET paid_credits = GREATEST(0, paid_credits - p_credits)
  WHERE user_id = p_user_id
  RETURNING paid_credits INTO v_new_balance;
  
  -- Log the refund transaction
  INSERT INTO credit_transactions (
    user_id, 
    type, 
    amount, 
    balance_after, 
    description, 
    stripe_payment_id
  )
  VALUES (
    p_user_id, 
    'refund', 
    -p_credits, 
    v_new_balance, 
    p_description, 
    p_stripe_payment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link Stripe customer to user
CREATE OR REPLACE FUNCTION link_stripe_customer(
  p_user_id UUID,
  p_stripe_customer_id TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO stripe_customers (user_id, stripe_customer_id)
  VALUES (p_user_id, p_stripe_customer_id)
  ON CONFLICT (stripe_customer_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE webhook_events IS 'Track processed Stripe webhook events for idempotency';
COMMENT ON TABLE stripe_customers IS 'Map Stripe customer IDs to internal user IDs';
COMMENT ON TABLE payment_logs IS 'Comprehensive audit trail of all payment activities';
COMMENT ON TABLE user_subscriptions IS 'Track user subscription status and billing periods';
COMMENT ON FUNCTION add_paid_credits IS 'Atomic function to add purchased credits and log transaction';
COMMENT ON FUNCTION process_refund IS 'Handle refund processing and credit adjustments';
COMMENT ON FUNCTION link_stripe_customer IS 'Safely link Stripe customer to user account';
