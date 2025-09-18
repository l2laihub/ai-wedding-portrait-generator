-- Migration: admin_dashboard_metrics
-- Created: Mon Sep 16 2025
-- 
-- Description: Admin Dashboard Metrics Tracking and Analytics Infrastructure

-- Admin roles and permissions table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System metrics table for performance tracking
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'api_response_time', 'generation_time', 'db_query_time', etc.
  metric_value DECIMAL(10, 2) NOT NULL,
  endpoint TEXT,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Daily aggregated metrics for dashboard display
CREATE TABLE IF NOT EXISTS daily_metrics (
  date DATE PRIMARY KEY,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_generations INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0, -- in cents
  total_credits_purchased INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  avg_generation_time DECIMAL(10, 2),
  conversion_rate DECIMAL(5, 2), -- percentage
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User activity logs for detailed tracking
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'generation', 'purchase', 'referral', etc.
  activity_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Alert configurations
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'low_credits', 'high_error_rate', 'unusual_activity', etc.
  threshold_value DECIMAL(10, 2),
  comparison_operator TEXT CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=')),
  alert_channels JSONB DEFAULT '[]', -- ['email', 'slack', 'webhook']
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_config_id UUID REFERENCES alert_configs(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT NOW(),
  alert_value DECIMAL(10, 2),
  alert_message TEXT,
  resolved_at TIMESTAMP,
  acknowledged_by UUID REFERENCES admin_users(id),
  acknowledged_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Revenue analytics table
CREATE TABLE IF NOT EXISTS revenue_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  product_type TEXT NOT NULL, -- 'starter_pack', 'wedding_pack', 'party_pack'
  quantity_sold INTEGER DEFAULT 0,
  gross_revenue INTEGER DEFAULT 0, -- in cents
  net_revenue INTEGER DEFAULT 0, -- after fees
  refunds INTEGER DEFAULT 0,
  stripe_fees INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User segments for analytics
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_name TEXT UNIQUE NOT NULL,
  segment_criteria JSONB NOT NULL, -- Define criteria for segment
  user_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User segment membership
CREATE TABLE IF NOT EXISTS user_segment_members (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES user_segments(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, segment_id)
);

-- Export logs for tracking data exports
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exported_by UUID REFERENCES admin_users(id),
  export_type TEXT NOT NULL, -- 'users', 'transactions', 'analytics', etc.
  export_format TEXT NOT NULL, -- 'csv', 'json', 'excel'
  filters JSONB DEFAULT '{}',
  row_count INTEGER,
  file_size INTEGER, -- in bytes
  export_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_resolved ON alert_history(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_date ON revenue_analytics(date DESC);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
-- Admin users table - only super admins can manage
CREATE POLICY "Super admins can manage admin users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

-- System metrics - admins can view, service role can insert
CREATE POLICY "Admins can view system metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert system metrics" ON system_metrics
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Daily metrics - admins can view, service role can manage
CREATE POLICY "Admins can view daily metrics" ON daily_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage daily metrics" ON daily_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User activity logs - admins can view, service role can insert
CREATE POLICY "Admins can view user activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Alert configs - admins can manage
CREATE POLICY "Admins can manage alert configs" ON alert_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Alert history - admins can view and acknowledge
CREATE POLICY "Admins can view alert history" ON alert_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can acknowledge alerts" ON alert_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can create alerts" ON alert_history
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Revenue analytics - admins can view, service role can manage
CREATE POLICY "Admins can view revenue analytics" ON revenue_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage revenue analytics" ON revenue_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User segments - admins can manage
CREATE POLICY "Admins can manage user segments" ON user_segments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view segment members" ON user_segment_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage segment members" ON user_segment_members
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Export logs - admins can view and create
CREATE POLICY "Admins can manage export logs" ON export_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create materialized views for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_overview AS
SELECT
  -- User metrics
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as today_new_users,
  (SELECT COUNT(*) FROM users WHERE last_login >= CURRENT_DATE - INTERVAL '7 days') as weekly_active_users,
  
  -- Generation metrics
  (SELECT COUNT(*) FROM usage_analytics WHERE timestamp >= CURRENT_DATE) as today_generations,
  (SELECT COUNT(*) FROM usage_analytics WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days') as monthly_generations,
  
  -- Revenue metrics
  (SELECT COALESCE(SUM(amount), 0) FROM payment_logs WHERE status = 'succeeded' AND created_at >= CURRENT_DATE) as today_revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM payment_logs WHERE status = 'succeeded' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_revenue,
  
  -- Credit metrics
  (SELECT COALESCE(SUM(paid_credits), 0) FROM user_credits) as total_paid_credits,
  (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE type = 'usage' AND created_at >= CURRENT_DATE) as today_credits_used,
  
  -- Waitlist metrics
  (SELECT COUNT(*) FROM waitlist) as total_waitlist,
  (SELECT COUNT(*) FROM waitlist WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_waitlist,
  
  -- Last update
  NOW() as last_updated;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_overview_refresh ON dashboard_overview(last_updated);

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_overview;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily metrics (to be called by a cron job)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
DECLARE
  v_total_users INTEGER;
  v_new_users INTEGER;
  v_active_users INTEGER;
  v_total_generations INTEGER;
  v_total_revenue INTEGER;
  v_total_credits_purchased INTEGER;
  v_total_credits_used INTEGER;
  v_avg_generation_time DECIMAL(10, 2);
  v_conversion_rate DECIMAL(5, 2);
BEGIN
  -- Calculate metrics for the given date
  SELECT COUNT(*) INTO v_total_users FROM users WHERE created_at <= p_date + INTERVAL '1 day';
  SELECT COUNT(*) INTO v_new_users FROM users WHERE DATE(created_at) = p_date;
  SELECT COUNT(DISTINCT user_id) INTO v_active_users FROM user_activity_logs WHERE DATE(timestamp) = p_date;
  SELECT COUNT(*) INTO v_total_generations FROM usage_analytics WHERE DATE(timestamp) = p_date;
  
  -- Revenue metrics
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue 
  FROM payment_logs 
  WHERE status = 'succeeded' AND DATE(created_at) = p_date;
  
  -- Credits metrics
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits_purchased 
  FROM credit_transactions 
  WHERE type = 'purchase' AND DATE(created_at) = p_date;
  
  SELECT COALESCE(ABS(SUM(amount)), 0) INTO v_total_credits_used 
  FROM credit_transactions 
  WHERE type = 'usage' AND DATE(created_at) = p_date;
  
  -- Average generation time (placeholder - implement based on actual timing data)
  v_avg_generation_time := 0; -- Will be calculated from system_metrics
  
  -- Conversion rate (signups to paid users)
  IF v_new_users > 0 THEN
    SELECT COUNT(*) * 100.0 / v_new_users INTO v_conversion_rate
    FROM users u
    INNER JOIN credit_transactions ct ON u.id = ct.user_id
    WHERE DATE(u.created_at) = p_date AND ct.type = 'purchase';
  ELSE
    v_conversion_rate := 0;
  END IF;
  
  -- Insert or update daily metrics
  INSERT INTO daily_metrics (
    date, total_users, new_users, active_users, total_generations,
    total_revenue, total_credits_purchased, total_credits_used,
    avg_generation_time, conversion_rate
  ) VALUES (
    p_date, v_total_users, v_new_users, v_active_users, v_total_generations,
    v_total_revenue, v_total_credits_purchased, v_total_credits_used,
    v_avg_generation_time, v_conversion_rate
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users,
    total_generations = EXCLUDED.total_generations,
    total_revenue = EXCLUDED.total_revenue,
    total_credits_purchased = EXCLUDED.total_credits_purchased,
    total_credits_used = EXCLUDED.total_credits_used,
    avg_generation_time = EXCLUDED.avg_generation_time,
    conversion_rate = EXCLUDED.conversion_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check alerts
CREATE OR REPLACE FUNCTION check_alerts() RETURNS void AS $$
DECLARE
  alert_record RECORD;
  current_value DECIMAL(10, 2);
  should_trigger BOOLEAN;
BEGIN
  -- Loop through enabled alerts
  FOR alert_record IN SELECT * FROM alert_configs WHERE enabled = true LOOP
    should_trigger := FALSE;
    
    -- Check different alert types
    CASE alert_record.alert_type
      WHEN 'low_credits' THEN
        -- Check users with low credits
        SELECT COUNT(*) INTO current_value 
        FROM user_credits 
        WHERE (paid_credits + bonus_credits) < alert_record.threshold_value;
        
      WHEN 'high_error_rate' THEN
        -- Check error rate in last hour
        SELECT COUNT(*) * 100.0 / GREATEST(COUNT(*), 1) INTO current_value
        FROM system_metrics
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
          AND metric_type = 'error';
          
      -- Add more alert types as needed
      ELSE
        CONTINUE;
    END CASE;
    
    -- Evaluate comparison
    EXECUTE format('SELECT %s %s %s', current_value, alert_record.comparison_operator, alert_record.threshold_value) 
    INTO should_trigger;
    
    -- Create alert if triggered
    IF should_trigger THEN
      -- Check if alert was recently triggered (avoid spam)
      IF NOT EXISTS (
        SELECT 1 FROM alert_history
        WHERE alert_config_id = alert_record.id
          AND triggered_at >= NOW() - INTERVAL '1 hour'
          AND resolved_at IS NULL
      ) THEN
        INSERT INTO alert_history (
          alert_config_id,
          alert_value,
          alert_message
        ) VALUES (
          alert_record.id,
          current_value,
          format('Alert: %s - Current value: %s %s threshold: %s',
            alert_record.alert_type,
            current_value,
            alert_record.comparison_operator,
            alert_record.threshold_value
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO user_activity_logs (
    user_id,
    activity_type,
    activity_data,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_activity_data,
    p_ip_address,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE admin_users IS 'Admin users with role-based access control';
COMMENT ON TABLE system_metrics IS 'System performance and usage metrics';
COMMENT ON TABLE daily_metrics IS 'Pre-aggregated daily metrics for dashboard';
COMMENT ON TABLE user_activity_logs IS 'Detailed user activity tracking';
COMMENT ON TABLE alert_configs IS 'Alert configuration for monitoring';
COMMENT ON TABLE alert_history IS 'History of triggered alerts';
COMMENT ON TABLE revenue_analytics IS 'Revenue breakdown and analytics';
COMMENT ON TABLE user_segments IS 'User segmentation for analytics';
COMMENT ON TABLE export_logs IS 'Track data export history';
COMMENT ON MATERIALIZED VIEW dashboard_overview IS 'Pre-computed dashboard metrics for performance';