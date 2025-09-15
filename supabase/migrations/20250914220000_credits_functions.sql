-- Credits System Functions (Simplified)
-- Essential functions for credit management

-- Function to get user credits with automatic daily reset  
CREATE OR REPLACE FUNCTION get_user_credits_with_reset(p_user_id UUID)
RETURNS TABLE (
  ret_user_id UUID,
  ret_free_credits_used_today INTEGER,
  ret_paid_credits INTEGER,
  ret_bonus_credits INTEGER,
  ret_last_free_reset DATE
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
  
  -- Return the credits with renamed columns to avoid ambiguity
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

-- Comments for documentation
COMMENT ON FUNCTION get_user_credits_with_reset IS 'Get user credits with automatic daily reset';