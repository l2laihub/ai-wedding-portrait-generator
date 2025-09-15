-- Check recent credit transactions
SELECT 
  ct.*,
  u.email
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ct.created_at DESC;

-- Check current credit balance for all users
SELECT 
  u.email,
  uc.paid_credits,
  uc.bonus_credits,
  uc.free_credits_used_today,
  (3 - uc.free_credits_used_today + uc.paid_credits + uc.bonus_credits) as total_available
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
ORDER BY u.email;