-- Setup admin user script
-- This script adds the admin@huybuilds.app user to the admin_users table

-- First, find the user ID for admin@huybuilds.app
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for admin@huybuilds.app
  SELECT id INTO admin_user_id 
  FROM users 
  WHERE email = 'admin@huybuilds.app';
  
  -- Check if user exists
  IF admin_user_id IS NOT NULL THEN
    -- Insert or update admin user record
    INSERT INTO admin_users (user_id, role, permissions) 
    VALUES (admin_user_id, 'admin', '{"dashboard": true, "users": true, "analytics": true}')
    ON CONFLICT (user_id) DO UPDATE SET
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      updated_at = NOW();
    
    RAISE NOTICE 'Admin user successfully configured for: admin@huybuilds.app (ID: %)', admin_user_id;
  ELSE
    RAISE NOTICE 'User admin@huybuilds.app not found. Please ensure the user is registered first.';
  END IF;
END $$;

-- Verify the admin user was created
SELECT 
  au.id,
  au.user_id,
  u.email,
  au.role,
  au.permissions,
  au.created_at
FROM admin_users au
JOIN users u ON au.user_id = u.id
WHERE u.email = 'admin@huybuilds.app';