-- Manually add 25 credits for the user who just completed payment
-- User: dqh978@gmail.com (c99486df-3d05-48ce-93ad-30c2592d2e8f)
-- Package: Wedding Pack ($9.99 for 25 credits)

-- Add 25 paid credits using the webhook function
SELECT add_paid_credits(
  'c99486df-3d05-48ce-93ad-30c2592d2e8f'::uuid,
  25,
  'manual_dev_payment_' || extract(epoch from now())::text,
  'Manual credit addition for dev testing - Wedding Pack purchase'
);

-- Check the results
SELECT 
  'User credits after addition:' as status,
  user_id::text,
  free_credits_used_today,
  paid_credits,
  bonus_credits
FROM user_credits 
WHERE user_id = 'c99486df-3d05-48ce-93ad-30c2592d2e8f';

-- Check transaction log
SELECT 
  'Transaction log:' as status,
  created_at,
  type,
  amount,
  description
FROM credit_transactions 
WHERE user_id = 'c99486df-3d05-48ce-93ad-30c2592d2e8f'
ORDER BY created_at DESC 
LIMIT 3;