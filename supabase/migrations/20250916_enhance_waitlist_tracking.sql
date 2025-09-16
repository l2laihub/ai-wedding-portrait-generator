-- Migration: enhance_waitlist_tracking
-- Created: 2025-09-16
-- Description: Add conversion tracking for waitlist bonus credits

-- Add fields to track waitlist conversion and bonus credit fulfillment
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS converted_user_id UUID REFERENCES users(id);
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS bonus_granted BOOLEAN DEFAULT FALSE;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS bonus_granted_at TIMESTAMP;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Create index for email lookups during signup
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_waitlist_converted ON waitlist(converted_user_id);

-- Function to check and fulfill waitlist bonus credits
CREATE OR REPLACE FUNCTION check_waitlist_bonus_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_waitlist_record RECORD;
  v_user_email TEXT;
BEGIN
  -- Get the email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if this email is in the waitlist
  SELECT * INTO v_waitlist_record
  FROM waitlist
  WHERE LOWER(email) = LOWER(v_user_email)
    AND converted_user_id IS NULL
    AND bonus_granted = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  -- If found, mark as converted
  IF v_waitlist_record.id IS NOT NULL THEN
    UPDATE waitlist
    SET 
      converted_user_id = NEW.id,
      converted_at = NOW()
    WHERE id = v_waitlist_record.id;

    -- Log the pending bonus (to be granted when paid system launches)
    INSERT INTO credit_transactions (
      user_id,
      type,
      amount,
      balance_after,
      description,
      created_at
    ) VALUES (
      NEW.id,
      'bonus',
      0, -- Set to 0 for now, will update when granting
      0,
      'Pending waitlist bonus: ' || v_waitlist_record.promised_credits || ' credits',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check waitlist on user creation
DROP TRIGGER IF EXISTS check_waitlist_on_user_creation ON users;
CREATE TRIGGER check_waitlist_on_user_creation
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_waitlist_bonus_on_signup();

-- Function to grant pending waitlist bonuses (for when paid system launches)
CREATE OR REPLACE FUNCTION grant_pending_waitlist_bonuses()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  credits_granted INTEGER,
  success BOOLEAN,
  error TEXT
) AS $$
DECLARE
  v_waitlist_record RECORD;
BEGIN
  -- Find all converted but not granted waitlist entries
  FOR v_waitlist_record IN 
    SELECT w.*, u.email as user_email
    FROM waitlist w
    JOIN users u ON u.id = w.converted_user_id
    WHERE w.converted_user_id IS NOT NULL
      AND w.bonus_granted = FALSE
  LOOP
    BEGIN
      -- Add bonus credits
      PERFORM add_bonus_credits(
        v_waitlist_record.converted_user_id,
        v_waitlist_record.promised_credits,
        'Waitlist early adopter bonus as promised!'
      );

      -- Mark as granted
      UPDATE waitlist
      SET 
        bonus_granted = TRUE,
        bonus_granted_at = NOW()
      WHERE id = v_waitlist_record.id;

      -- Return success
      user_id := v_waitlist_record.converted_user_id;
      email := v_waitlist_record.user_email;
      credits_granted := v_waitlist_record.promised_credits;
      success := TRUE;
      error := NULL;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Return error
      user_id := v_waitlist_record.converted_user_id;
      email := v_waitlist_record.user_email;
      credits_granted := 0;
      success := FALSE;
      error := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for admin dashboard
CREATE OR REPLACE VIEW waitlist_analytics AS
SELECT 
  COUNT(*) as total_waitlist,
  COUNT(converted_user_id) as total_converted,
  COUNT(CASE WHEN bonus_granted THEN 1 END) as bonuses_granted,
  COUNT(CASE WHEN converted_user_id IS NOT NULL AND NOT bonus_granted THEN 1 END) as pending_bonuses,
  SUM(promised_credits) as total_promised_credits,
  SUM(CASE WHEN bonus_granted THEN promised_credits ELSE 0 END) as total_granted_credits,
  AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/3600)::INTEGER as avg_hours_to_convert
FROM waitlist;

-- Grant read access to analytics view
GRANT SELECT ON waitlist_analytics TO authenticated;

COMMENT ON FUNCTION grant_pending_waitlist_bonuses IS 'Grants all pending waitlist bonuses - run this when launching paid credits system';
COMMENT ON VIEW waitlist_analytics IS 'Analytics dashboard for waitlist conversion and bonus tracking';