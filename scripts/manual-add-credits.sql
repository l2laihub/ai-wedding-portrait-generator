-- Manual script to add credits after successful payment
-- Replace the user_id with your actual user ID

-- First, check current credits
SELECT 
  u.email,
  uc.paid_credits,
  uc.bonus_credits,
  uc.free_credits_used_today
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
WHERE u.email = 'YOUR_EMAIL@example.com';

-- Add credits manually (adjust the amount based on what you purchased)
-- For $9.99 Wedding Pack = 25 credits
SELECT add_paid_credits(
  p_user_id := (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'),
  p_credits := 25,
  p_stripe_payment_id := 'manual_test_' || NOW()::TEXT,
  p_description := 'Manual credit addition for test purchase'
);

-- Verify credits were added
SELECT 
  u.email,
  uc.paid_credits,
  uc.bonus_credits,
  uc.free_credits_used_today
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
WHERE u.email = 'YOUR_EMAIL@example.com';