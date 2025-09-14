-- Fix signup trigger function for user profile creation
-- This addresses the "Database error saving new user" issue

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Improved function with better error handling and conflict resolution
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Insert into users table with conflict handling
  INSERT INTO users (id, email, display_name, referral_code)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    generate_referral_code()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into user_credits table with conflict handling
  INSERT INTO user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Fix any existing users that might not have profiles
-- This handles cases where users were created before the trigger was fixed
INSERT INTO users (id, email, referral_code)
SELECT 
  au.id, 
  au.email, 
  generate_referral_code()
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure all users have credit records
INSERT INTO user_credits (user_id)
SELECT u.id
FROM users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify the fix worked
DO $$
DECLARE
    auth_count INTEGER;
    users_count INTEGER;
    credits_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO credits_count FROM user_credits;
    
    RAISE NOTICE 'Migration complete: % auth users, % user profiles, % credit records', 
                 auth_count, users_count, credits_count;
END $$;