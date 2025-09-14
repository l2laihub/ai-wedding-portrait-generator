-- Credits System Functions
-- Advanced functions for credit management with atomic operations

-- Function to get user credits with automatic daily reset
CREATE OR REPLACE FUNCTION get_user_credits_with_reset(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  free_credits_used_today INTEGER,
  paid_credits INTEGER,
  bonus_credits INTEGER,
  last_free_reset DATE
) AS $$
BEGIN
  -- First, ensure the user has a credits record
  INSERT INTO user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Reset daily credits if needed
  UPDATE user_credits 
  SET free_credits_used_today = 0, 
      last_free_reset = CURRENT_DATE
  WHERE user_credits.user_id = p_user_id 
    AND last_free_reset < CURRENT_DATE;
  
  -- Return the credits
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.free_credits_used_today,
    uc.paid_credits,
    uc.bonus_credits,
    uc.last_free_reset
  FROM user_credits uc
  WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credit atomically with priority order
CREATE OR REPLACE FUNCTION consume_credit_atomic(
  p_user_id UUID,
  p_description TEXT DEFAULT 'Portrait generation'
) RETURNS TABLE (
  success BOOLEAN,
  credit_type TEXT,
  remaining_total INTEGER
) AS $$
DECLARE
  v_free_used INTEGER;
  v_paid_credits INTEGER;
  v_bonus_credits INTEGER;
  v_free_limit INTEGER := 3;
  v_credit_type TEXT;
  v_amount INTEGER := -1; -- Negative for consumption
  v_balance_after INTEGER;
BEGIN
  -- Get current credits with reset
  SELECT 
    free_credits_used_today,
    paid_credits,
    bonus_credits
  INTO v_free_used, v_paid_credits, v_bonus_credits
  FROM get_user_credits_with_reset(p_user_id)
  LIMIT 1;
  
  -- Check if user has any credits available
  IF (v_free_limit - v_free_used) <= 0 AND v_bonus_credits <= 0 AND v_paid_credits <= 0 THEN
    RETURN QUERY SELECT FALSE, 'none'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Determine which type of credit to consume (priority: bonus -> free -> paid)
  IF v_bonus_credits > 0 THEN
    -- Consume bonus credit
    UPDATE user_credits 
    SET bonus_credits = bonus_credits - 1
    WHERE user_id = p_user_id;
    
    v_credit_type := 'bonus';
    v_balance_after := (v_free_limit - v_free_used) + v_paid_credits + (v_bonus_credits - 1);
    
  ELSIF (v_free_limit - v_free_used) > 0 THEN
    -- Consume free credit
    UPDATE user_credits 
    SET free_credits_used_today = free_credits_used_today + 1
    WHERE user_id = p_user_id;
    
    v_credit_type := 'free_daily';
    v_balance_after := (v_free_limit - v_free_used - 1) + v_paid_credits + v_bonus_credits;
    
  ELSIF v_paid_credits > 0 THEN
    -- Consume paid credit
    UPDATE user_credits 
    SET paid_credits = paid_credits - 1
    WHERE user_id = p_user_id;
    
    v_credit_type := 'purchase';
    v_balance_after := (v_free_limit - v_free_used) + (v_paid_credits - 1) + v_bonus_credits;
    
  ELSE
    -- Should not happen due to initial check, but safety net
    RETURN QUERY SELECT FALSE, 'none'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    'usage',
    v_amount,
    v_balance_after,
    p_description
  );
  
  RETURN QUERY SELECT TRUE, v_credit_type, v_balance_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add bonus credits
CREATE OR REPLACE FUNCTION add_bonus_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_description TEXT DEFAULT 'Bonus credits'
) RETURNS void AS $$
DECLARE
  v_new_balance INTEGER;
  v_current_total INTEGER;
BEGIN
  -- Ensure user credits record exists
  INSERT INTO user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current total for balance calculation
  SELECT 
    (3 - free_credits_used_today) + paid_credits + bonus_credits
  INTO v_current_total
  FROM get_user_credits_with_reset(p_user_id)
  LIMIT 1;
  
  -- Update bonus credits atomically
  UPDATE user_credits 
  SET bonus_credits = bonus_credits + p_credits
  WHERE user_id = p_user_id
  RETURNING (3 - free_credits_used_today) + paid_credits + bonus_credits INTO v_new_balance;
  
  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    'bonus',
    p_credits,
    v_new_balance,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily credits for a specific user
CREATE OR REPLACE FUNCTION reset_daily_credits_for_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_credits 
  SET free_credits_used_today = 0, 
      last_free_reset = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed credit summary for admin/user dashboard
CREATE OR REPLACE FUNCTION get_credit_summary(p_user_id UUID)
RETURNS TABLE (
  total_available INTEGER,
  free_remaining INTEGER,
  paid_credits INTEGER,
  bonus_credits INTEGER,
  used_today INTEGER,
  total_purchased INTEGER,
  total_used_all_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total available
    (3 - uc.free_credits_used_today) + uc.paid_credits + uc.bonus_credits,
    -- Free remaining today
    3 - uc.free_credits_used_today,
    -- Paid credits
    uc.paid_credits,
    -- Bonus credits  
    uc.bonus_credits,
    -- Used today
    uc.free_credits_used_today,
    -- Total purchased (from transactions)
    COALESCE((SELECT SUM(amount) FROM credit_transactions WHERE user_id = p_user_id AND type = 'purchase'), 0)::INTEGER,
    -- Total used all time (from transactions)  
    COALESCE((SELECT ABS(SUM(amount)) FROM credit_transactions WHERE user_id = p_user_id AND type = 'usage'), 0)::INTEGER
  FROM get_user_credits_with_reset(p_user_id) uc
  WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced view for admin dashboard
CREATE OR REPLACE VIEW admin_credit_stats AS
SELECT 
  (SELECT COUNT(*) FROM user_credits WHERE paid_credits > 0) as paying_users,
  (SELECT COUNT(*) FROM user_credits WHERE free_credits_used_today > 0) as active_free_users,
  (SELECT SUM(paid_credits + bonus_credits) FROM user_credits) as total_paid_credits_balance,
  (SELECT SUM(amount) FROM credit_transactions WHERE type = 'purchase' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as credits_sold_30_days,
  (SELECT ABS(SUM(amount)) FROM credit_transactions WHERE type = 'usage' AND created_at >= CURRENT_DATE) as credits_used_today,
  (SELECT ABS(SUM(amount)) FROM credit_transactions WHERE type = 'usage' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as credits_used_7_days;

-- Add RLS policies for the new functions (they use SECURITY DEFINER)
-- Users can call these functions for their own data
CREATE POLICY "Users can call credit functions for themselves" ON user_credits
  FOR ALL USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON FUNCTION get_user_credits_with_reset IS 'Get user credits with automatic daily reset';
COMMENT ON FUNCTION consume_credit_atomic IS 'Atomically consume one credit with priority order (bonus->free->paid)';
COMMENT ON FUNCTION add_bonus_credits IS 'Add bonus credits and log transaction';
COMMENT ON FUNCTION reset_daily_credits_for_user IS 'Reset daily credits for specific user';
COMMENT ON FUNCTION get_credit_summary IS 'Get comprehensive credit summary for user dashboard';
COMMENT ON VIEW admin_credit_stats IS 'Administrative statistics for credit system monitoring';