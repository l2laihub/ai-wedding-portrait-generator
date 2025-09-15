-- Test the verify_payment_and_add_credits function

-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'verify_payment_and_add_credits';

-- Test calling the function (replace with your actual user_id)
-- This should return: {"success": false, "error": "Payment already processed"}
-- if you try the same session_id twice
SELECT verify_payment_and_add_credits(
  'test_session_' || NOW()::TEXT,
  (SELECT id FROM users LIMIT 1)
);