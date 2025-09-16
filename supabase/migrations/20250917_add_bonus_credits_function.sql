-- Migration: add_bonus_credits_function
-- Created: 2025-09-16
-- Description: Add function to grant bonus credits to users

-- Function to add bonus credits
CREATE OR REPLACE FUNCTION add_bonus_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_description TEXT
) RETURNS VOID AS $$
DECLARE
  v_current_bonus INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current bonus credits
  SELECT bonus_credits INTO v_current_bonus
  FROM user_credits
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, bonus_credits)
    VALUES (p_user_id, p_credits);
    
    v_new_balance := p_credits;
  ELSE
    -- Update bonus credits
    UPDATE user_credits
    SET bonus_credits = bonus_credits + p_credits
    WHERE user_id = p_user_id
    RETURNING bonus_credits INTO v_new_balance;
  END IF;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    created_at
  ) VALUES (
    p_user_id,
    'bonus',
    p_credits,
    v_new_balance,
    p_description,
    NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error adding bonus credits for user %: %', p_user_id, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for admin use)
GRANT EXECUTE ON FUNCTION add_bonus_credits TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION add_bonus_credits IS 'Add bonus credits to a user account with transaction logging';