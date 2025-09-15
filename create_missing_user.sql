-- Create missing user profile for dqh978@gmail.com
INSERT INTO users (id, email, display_name, referral_code)
VALUES (
  'c99486df-3d05-48ce-93ad-30c2592d2e8f',
  'dqh978@gmail.com', 
  'Huy Test1',
  'c99486df'
) ON CONFLICT (id) DO NOTHING;

-- Create missing credit record
INSERT INTO user_credits (user_id)
VALUES ('c99486df-3d05-48ce-93ad-30c2592d2e8f')
ON CONFLICT (user_id) DO NOTHING;

-- Verify creation
SELECT 'User profile:' as check_type, id, email, display_name 
FROM users 
WHERE id = 'c99486df-3d05-48ce-93ad-30c2592d2e8f'
UNION ALL
SELECT 'User credits:' as check_type, user_id::text as id, 'balance' as email, 
       (free_credits_used_today::text || '/' || paid_credits::text) as display_name 
FROM user_credits 
WHERE user_id = 'c99486df-3d05-48ce-93ad-30c2592d2e8f';