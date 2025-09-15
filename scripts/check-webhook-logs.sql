-- Check webhook events
SELECT * FROM webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Check payment logs
SELECT * FROM payment_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check recent credit transactions
SELECT 
  ct.*,
  u.email
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC
LIMIT 10;

-- Check if your test payment created a stripe customer record
SELECT 
  sc.*,
  u.email
FROM stripe_customers sc
JOIN users u ON sc.user_id = u.id
ORDER BY sc.created_at DESC
LIMIT 5;