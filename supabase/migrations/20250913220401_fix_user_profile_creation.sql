-- Migration: fix_user_profile_creation
-- Created: Sat Sep 13 22:04:01 PDT 2025
-- 
-- Description: Fix user profile creation issues and create missing profiles

-- First, let's check and fix RLS policies that might be blocking profile creation
-- Temporarily grant INSERT permissions to authenticated users for profile creation

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own credits" ON user_credits;
CREATE POLICY "Users can insert their own credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix the trigger function to use SECURITY DEFINER properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger 
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, display_name, referral_code)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    generate_referral_code()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name);
  
  -- Insert into user_credits table
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create profiles for any existing auth users who don't have profiles
-- This fixes the current user who signed up but doesn't have a profile
INSERT INTO users (id, email, referral_code)
SELECT 
  au.id, 
  au.email, 
  generate_referral_code()
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

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
    
    RAISE NOTICE 'Fixed user profiles: % auth users, % user profiles, % credit records', 
                 auth_count, users_count, credits_count;
                 
    -- Show any users still missing profiles
    IF EXISTS (
        SELECT 1 FROM auth.users au
        LEFT JOIN users u ON au.id = u.id
        WHERE u.id IS NULL
    ) THEN
        RAISE WARNING 'Some users still missing profiles - check RLS policies';
    ELSE
        RAISE NOTICE 'All users have profiles created successfully';
    END IF;
END $$;
