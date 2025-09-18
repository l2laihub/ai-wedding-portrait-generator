-- Package Rate Limiting Integration - Corrected Version
-- Fixes all table reference issues and ensures proper integration

BEGIN;

-- ==========================================
-- 1. PACKAGE-AWARE RATE LIMITING TABLES
-- ==========================================

-- Create package rate limits table
CREATE TABLE IF NOT EXISTS package_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('anonymous', 'free', 'paid', 'premium')),
  
  -- Limits
  hourly_limit INTEGER NOT NULL DEFAULT 3,
  daily_limit INTEGER NOT NULL DEFAULT 9,
  monthly_limit INTEGER DEFAULT NULL,
  
  -- Package-specific settings
  credit_cost_multiplier NUMERIC(3,2) DEFAULT 1.0,
  cooldown_seconds INTEGER DEFAULT 0,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(package_id, user_type)
);

-- Create package usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS package_rate_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier TEXT NOT NULL, -- user_id or IP for anonymous
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  
  -- Usage counts
  hourly_count INTEGER DEFAULT 0,
  daily_count INTEGER DEFAULT 0,
  monthly_count INTEGER DEFAULT 0,
  
  -- Timestamps for resets
  last_hourly_reset TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('hour', NOW()),
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  last_monthly_reset DATE DEFAULT DATE_TRUNC('month', NOW())::DATE,
  
  -- Last usage
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_identifier, package_id)
);

-- ==========================================
-- 2. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_package_rate_limits_package_id ON package_rate_limits(package_id);
CREATE INDEX IF NOT EXISTS idx_package_rate_limits_user_type ON package_rate_limits(user_type);
CREATE INDEX IF NOT EXISTS idx_package_rate_limits_enabled ON package_rate_limits(enabled) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_package_rate_tracking_user_identifier ON package_rate_tracking(user_identifier);
CREATE INDEX IF NOT EXISTS idx_package_rate_tracking_package_id ON package_rate_tracking(package_id);
CREATE INDEX IF NOT EXISTS idx_package_rate_tracking_last_used_at ON package_rate_tracking(last_used_at);

-- ==========================================
-- 3. RLS POLICIES
-- ==========================================

ALTER TABLE package_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_rate_tracking ENABLE ROW LEVEL SECURITY;

-- Rate limits policies
DROP POLICY IF EXISTS "Service role can manage package rate limits" ON package_rate_limits;
CREATE POLICY "Service role can manage package rate limits"
  ON package_rate_limits FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admin users can view package rate limits" ON package_rate_limits;
CREATE POLICY "Admin users can view package rate limits"
  ON package_rate_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_admin = true
    )
  );

-- Rate tracking policies
DROP POLICY IF EXISTS "Service role can manage package rate tracking" ON package_rate_tracking;
CREATE POLICY "Service role can manage package rate tracking"
  ON package_rate_tracking FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Users can view their own rate tracking" ON package_rate_tracking;
CREATE POLICY "Users can view their own rate tracking"
  ON package_rate_tracking FOR SELECT
  USING (
    auth.uid()::TEXT = user_identifier
  );

-- ==========================================
-- 4. ENHANCED FUNCTIONS
-- ==========================================

-- Function to check package rate limits
CREATE OR REPLACE FUNCTION check_package_rate_limit(
  p_user_identifier TEXT,
  p_package_id UUID,
  p_user_type TEXT DEFAULT 'anonymous'
)
RETURNS JSONB AS $$
DECLARE
  rate_limit RECORD;
  current_tracking RECORD;
  current_hour TIMESTAMP WITH TIME ZONE;
  current_day DATE;
  current_month DATE;
  result JSONB;
BEGIN
  -- Get rate limits for this package and user type
  SELECT * INTO rate_limit
  FROM package_rate_limits 
  WHERE package_id = p_package_id 
    AND user_type = p_user_type 
    AND enabled = true;
  
  -- If no specific limits, use default
  IF NOT FOUND THEN
    rate_limit.hourly_limit := CASE p_user_type
      WHEN 'anonymous' THEN 3
      WHEN 'free' THEN 9
      WHEN 'paid' THEN 100
      WHEN 'premium' THEN 1000
      ELSE 3
    END;
    rate_limit.daily_limit := CASE p_user_type
      WHEN 'anonymous' THEN 9
      WHEN 'free' THEN 25
      WHEN 'paid' THEN 300
      WHEN 'premium' THEN 3000
      ELSE 9
    END;
    rate_limit.monthly_limit := NULL;
    rate_limit.cooldown_seconds := 0;
  END IF;
  
  -- Get current time boundaries
  current_hour := DATE_TRUNC('hour', NOW());
  current_day := CURRENT_DATE;
  current_month := DATE_TRUNC('month', NOW())::DATE;
  
  -- Get or create tracking record
  SELECT * INTO current_tracking
  FROM package_rate_tracking
  WHERE user_identifier = p_user_identifier 
    AND package_id = p_package_id;
  
  IF NOT FOUND THEN
    INSERT INTO package_rate_tracking (
      user_identifier, package_id, hourly_count, daily_count, monthly_count,
      last_hourly_reset, last_daily_reset, last_monthly_reset
    )
    VALUES (
      p_user_identifier, p_package_id, 0, 0, 0,
      current_hour, current_day, current_month
    )
    RETURNING * INTO current_tracking;
  END IF;
  
  -- Reset counters if needed
  IF current_tracking.last_hourly_reset < current_hour THEN
    UPDATE package_rate_tracking 
    SET hourly_count = 0, last_hourly_reset = current_hour
    WHERE user_identifier = p_user_identifier AND package_id = p_package_id;
    current_tracking.hourly_count := 0;
  END IF;
  
  IF current_tracking.last_daily_reset < current_day THEN
    UPDATE package_rate_tracking 
    SET daily_count = 0, last_daily_reset = current_day
    WHERE user_identifier = p_user_identifier AND package_id = p_package_id;
    current_tracking.daily_count := 0;
  END IF;
  
  IF current_tracking.last_monthly_reset < current_month THEN
    UPDATE package_rate_tracking 
    SET monthly_count = 0, last_monthly_reset = current_month
    WHERE user_identifier = p_user_identifier AND package_id = p_package_id;
    current_tracking.monthly_count := 0;
  END IF;
  
  -- Check limits and build result
  result := jsonb_build_object(
    'allowed', true,
    'reason', null,
    'hourly_remaining', rate_limit.hourly_limit - current_tracking.hourly_count,
    'daily_remaining', rate_limit.daily_limit - current_tracking.daily_count,
    'monthly_remaining', CASE 
      WHEN rate_limit.monthly_limit IS NOT NULL 
      THEN rate_limit.monthly_limit - current_tracking.monthly_count 
      ELSE NULL 
    END,
    'cooldown_seconds', rate_limit.cooldown_seconds,
    'reset_times', jsonb_build_object(
      'hourly_reset', current_hour + INTERVAL '1 hour',
      'daily_reset', current_day + INTERVAL '1 day',
      'monthly_reset', current_month + INTERVAL '1 month'
    )
  );
  
  -- Check hourly limit
  IF current_tracking.hourly_count >= rate_limit.hourly_limit THEN
    result := jsonb_set(result, '{allowed}', 'false');
    result := jsonb_set(result, '{reason}', '"Hourly limit exceeded"');
    RETURN result;
  END IF;
  
  -- Check daily limit
  IF current_tracking.daily_count >= rate_limit.daily_limit THEN
    result := jsonb_set(result, '{allowed}', 'false');
    result := jsonb_set(result, '{reason}', '"Daily limit exceeded"');
    RETURN result;
  END IF;
  
  -- Check monthly limit if set
  IF rate_limit.monthly_limit IS NOT NULL AND current_tracking.monthly_count >= rate_limit.monthly_limit THEN
    result := jsonb_set(result, '{allowed}', 'false');
    result := jsonb_set(result, '{reason}', '"Monthly limit exceeded"');
    RETURN result;
  END IF;
  
  -- Check cooldown
  IF rate_limit.cooldown_seconds > 0 AND 
     current_tracking.last_used_at > NOW() - (rate_limit.cooldown_seconds || ' seconds')::INTERVAL THEN
    result := jsonb_set(result, '{allowed}', 'false');
    result := jsonb_set(result, '{reason}', '"Cooldown period active"');
    RETURN result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment package usage counters
CREATE OR REPLACE FUNCTION increment_package_usage(
  p_user_identifier TEXT,
  p_package_id UUID,
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO package_rate_tracking (
    user_identifier, package_id, hourly_count, daily_count, monthly_count, last_used_at
  )
  VALUES (
    p_user_identifier, p_package_id, p_increment, p_increment, p_increment, NOW()
  )
  ON CONFLICT (user_identifier, package_id)
  DO UPDATE SET
    hourly_count = package_rate_tracking.hourly_count + p_increment,
    daily_count = package_rate_tracking.daily_count + p_increment,
    monthly_count = package_rate_tracking.monthly_count + p_increment,
    last_used_at = NOW(),
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function for processing package usage with credits
CREATE OR REPLACE FUNCTION process_package_usage(
  p_user_id UUID,
  p_package_id UUID,
  p_tier_id UUID,
  p_session_id TEXT DEFAULT NULL,
  p_themes_used TEXT[] DEFAULT '{}',
  p_upload_type TEXT DEFAULT 'couple'
)
RETURNS JSONB AS $$
DECLARE
  usage_id UUID;
  tier_info RECORD;
  user_credits_info RECORD;
  final_credit_cost INTEGER;
  result JSONB;
BEGIN
  -- Get tier information
  SELECT * INTO tier_info
  FROM package_pricing_tiers
  WHERE id = p_tier_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or disabled pricing tier'
    );
  END IF;
  
  -- Get user credits
  SELECT * INTO user_credits_info
  FROM user_credits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User credits not found'
    );
  END IF;
  
  -- Calculate final credit cost (using 1 credit for now, can be enhanced)
  final_credit_cost := 1;
  
  -- Check if user has enough credits
  IF (user_credits_info.paid_credits + user_credits_info.bonus_credits) < final_credit_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', final_credit_cost,
      'available', user_credits_info.paid_credits + user_credits_info.bonus_credits
    );
  END IF;
  
  -- Create usage record
  INSERT INTO package_usage (
    user_id, package_id, tier_id, credits_used, 
    generations_count, themes_used, session_id, upload_type
  ) VALUES (
    p_user_id, p_package_id, p_tier_id, final_credit_cost,
    3, p_themes_used, p_session_id, p_upload_type
  ) RETURNING id INTO usage_id;
  
  -- Deduct credits (prioritize bonus credits first)
  IF user_credits_info.bonus_credits >= final_credit_cost THEN
    UPDATE user_credits 
    SET bonus_credits = bonus_credits - final_credit_cost
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_credits 
    SET 
      bonus_credits = 0,
      paid_credits = paid_credits - (final_credit_cost - user_credits_info.bonus_credits)
    WHERE user_id = p_user_id;
  END IF;
  
  -- Log credit transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, description,
    package_id, tier_id, usage_id
  )
  VALUES (
    p_user_id, 'usage', -final_credit_cost,
    (SELECT paid_credits + bonus_credits FROM user_credits WHERE user_id = p_user_id),
    'Package usage: ' || tier_info.name,
    p_package_id, p_tier_id, usage_id
  );
  
  -- Update rate limiting
  PERFORM increment_package_usage(p_user_id::TEXT, p_package_id, 1);
  
  RETURN jsonb_build_object(
    'success', true,
    'usage_id', usage_id,
    'credits_used', final_credit_cost,
    'remaining_credits', (SELECT paid_credits + bonus_credits FROM user_credits WHERE user_id = p_user_id),
    'generations_included', 3
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track package usage (called by process_package_usage)
CREATE OR REPLACE FUNCTION track_package_usage(
  p_user_id UUID,
  p_package_id UUID,
  p_tier_id UUID,
  p_credits_used INTEGER DEFAULT 1,
  p_generations_count INTEGER DEFAULT 3,
  p_themes_used TEXT[] DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL,
  p_upload_type TEXT DEFAULT 'couple'
)
RETURNS UUID AS $$
DECLARE
  usage_id UUID;
BEGIN
  INSERT INTO package_usage (
    user_id, package_id, tier_id, credits_used, 
    generations_count, themes_used, session_id, upload_type
  ) VALUES (
    p_user_id, p_package_id, p_tier_id, p_credits_used,
    p_generations_count, p_themes_used, p_session_id, p_upload_type
  ) RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete package usage
CREATE OR REPLACE FUNCTION complete_package_usage(
  p_usage_id UUID,
  p_status TEXT DEFAULT 'completed',
  p_processing_time INTEGER DEFAULT NULL,
  p_quality_score INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE package_usage 
  SET 
    status = p_status,
    processing_time = p_processing_time,
    result_quality_score = p_quality_score,
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_usage_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get package statistics
CREATE OR REPLACE FUNCTION get_package_statistics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_packages', (SELECT COUNT(*) FROM photo_packages),
    'active_packages', (SELECT COUNT(*) FROM photo_packages WHERE is_active = true),
    'total_themes', (SELECT COUNT(*) FROM package_themes WHERE is_active = true),
    'total_usage_today', (SELECT COUNT(*) FROM package_usage WHERE created_at::date = CURRENT_DATE),
    'total_revenue_today_cents', (SELECT COALESCE(SUM(pt.price_cents), 0) 
                                  FROM package_usage pu 
                                  JOIN package_pricing_tiers pt ON pt.id = pu.tier_id 
                                  WHERE pu.created_at::date = CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. SEED DEFAULT RATE LIMITS
-- ==========================================

-- Insert default rate limits for the wedding package
DO $$
DECLARE
    wedding_package_id UUID;
BEGIN
    SELECT id INTO wedding_package_id 
    FROM photo_packages 
    WHERE slug = 'wedding-portraits';
    
    IF wedding_package_id IS NOT NULL THEN
        INSERT INTO package_rate_limits (package_id, user_type, hourly_limit, daily_limit, monthly_limit) VALUES
        (wedding_package_id, 'anonymous', 3, 9, NULL),
        (wedding_package_id, 'free', 5, 15, NULL),
        (wedding_package_id, 'paid', 50, 150, NULL),
        (wedding_package_id, 'premium', 100, 300, NULL)
        ON CONFLICT (package_id, user_type) DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 6. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON package_rate_limits TO service_role;
GRANT ALL ON package_rate_tracking TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ==========================================
-- 7. UTILITY VIEWS
-- ==========================================

-- View for package rate limit overview
CREATE OR REPLACE VIEW package_rate_limit_overview AS
SELECT 
  p.id as package_id,
  p.name as package_name,
  p.slug as package_slug,
  prl.user_type,
  prl.hourly_limit,
  prl.daily_limit,
  prl.monthly_limit,
  prl.credit_cost_multiplier,
  prl.cooldown_seconds,
  prl.enabled
FROM photo_packages p
LEFT JOIN package_rate_limits prl ON prl.package_id = p.id
WHERE p.is_active = true
ORDER BY p.name, prl.user_type;

COMMIT;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'Package Rate Limiting Integration - Corrected Version completed successfully!';
  RAISE NOTICE 'Fixed all table references to use photo_packages and proper UUIDs';
  RAISE NOTICE 'Created rate limiting functions with proper error handling';
  RAISE NOTICE 'Installed default rate limits for wedding package';
END $$;