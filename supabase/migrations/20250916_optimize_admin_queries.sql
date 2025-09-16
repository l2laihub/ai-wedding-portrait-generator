-- Migration: optimize_admin_queries
-- Created: Mon Sep 16 2025
-- 
-- Description: Query optimization for admin dashboard performance

-- Create optimized views for common admin queries

-- User summary view with aggregated data
CREATE OR REPLACE VIEW user_summary AS
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.created_at,
  u.last_login,
  u.referral_code,
  
  -- Credit information
  COALESCE(uc.paid_credits, 0) as paid_credits,
  COALESCE(uc.bonus_credits, 0) as bonus_credits,
  COALESCE(uc.free_credits_used_today, 0) as free_credits_used_today,
  (COALESCE(uc.paid_credits, 0) + COALESCE(uc.bonus_credits, 0)) as total_credits,
  
  -- Transaction summaries
  COALESCE(purchase_stats.total_purchases, 0) as total_purchases,
  COALESCE(purchase_stats.total_spent, 0) as total_spent,
  COALESCE(usage_stats.total_credits_used, 0) as total_credits_used,
  COALESCE(usage_stats.last_usage, null) as last_usage,
  
  -- Activity metrics
  COALESCE(generation_stats.total_generations, 0) as total_generations,
  COALESCE(generation_stats.last_generation, null) as last_generation,
  
  -- Referral information
  COALESCE(referral_stats.successful_referrals, 0) as successful_referrals,
  COALESCE(referral_stats.referral_credits_earned, 0) as referral_credits_earned,
  
  -- User status
  CASE 
    WHEN u.last_login >= NOW() - INTERVAL '7 days' THEN 'active'
    WHEN u.last_login >= NOW() - INTERVAL '30 days' THEN 'inactive'
    WHEN u.last_login IS NULL THEN 'never_logged_in'
    ELSE 'dormant'
  END as user_status,
  
  -- Lifetime value calculation
  COALESCE(purchase_stats.total_spent, 0) as lifetime_value

FROM users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as total_purchases,
    SUM(amount) as total_spent
  FROM credit_transactions
  WHERE type = 'purchase'
  GROUP BY user_id
) purchase_stats ON u.id = purchase_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(ABS(amount)) as total_credits_used,
    MAX(created_at) as last_usage
  FROM credit_transactions
  WHERE type = 'usage'
  GROUP BY user_id
) usage_stats ON u.id = usage_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as total_generations,
    MAX(timestamp) as last_generation
  FROM usage_analytics
  GROUP BY user_id
) generation_stats ON u.id = generation_stats.user_id
LEFT JOIN (
  SELECT 
    referrer_user_id,
    COUNT(*) as successful_referrals,
    SUM(credits_earned) as referral_credits_earned
  FROM referrals
  WHERE status = 'completed'
  GROUP BY referrer_user_id
) referral_stats ON u.id = referral_stats.referrer_user_id;

-- Payment summary view
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
  pl.id,
  pl.stripe_payment_id,
  pl.customer_id,
  pl.user_id,
  pl.amount,
  pl.status,
  pl.event_type,
  pl.error_code,
  pl.error_message,
  pl.created_at,
  
  -- User information
  u.email as user_email,
  u.display_name as user_display_name,
  
  -- Product type based on amount
  CASE 
    WHEN pl.amount = 499 THEN 'starter_pack'
    WHEN pl.amount = 999 THEN 'wedding_pack'
    WHEN pl.amount = 2499 THEN 'party_pack'
    ELSE 'unknown'
  END as product_type,
  
  -- Credits associated with payment
  CASE 
    WHEN pl.amount = 499 THEN 10
    WHEN pl.amount = 999 THEN 25
    WHEN pl.amount = 2499 THEN 75
    ELSE 0
  END as credits_amount,
  
  -- Metadata fields
  pl.metadata

FROM payment_logs pl
LEFT JOIN users u ON pl.user_id = u.id;

-- Analytics summary view
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
  DATE(ua.timestamp) as date,
  ua.theme,
  ua.portrait_type,
  COUNT(*) as generation_count,
  COUNT(DISTINCT ua.session_id) as unique_sessions,
  
  -- User breakdown if we can identify users
  COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN u.id END) as authenticated_users,
  COUNT(CASE WHEN u.id IS NULL THEN 1 END) as anonymous_generations

FROM usage_analytics ua
LEFT JOIN users u ON ua.session_id = u.id::text
GROUP BY DATE(ua.timestamp), ua.theme, ua.portrait_type;

-- Revenue summary view by date and product
CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
  DATE(pl.created_at) as date,
  CASE 
    WHEN pl.amount = 499 THEN 'starter_pack'
    WHEN pl.amount = 999 THEN 'wedding_pack'
    WHEN pl.amount = 2499 THEN 'party_pack'
    ELSE 'unknown'
  END as product_type,
  
  COUNT(*) as transaction_count,
  SUM(pl.amount) as gross_revenue,
  
  -- Calculate estimated Stripe fees (2.9% + 30 cents)
  SUM(ROUND(pl.amount * 0.029 + 30)) as estimated_stripe_fees,
  SUM(pl.amount - ROUND(pl.amount * 0.029 + 30)) as estimated_net_revenue,
  
  -- Status breakdown
  COUNT(CASE WHEN pl.status = 'succeeded' THEN 1 END) as successful_payments,
  COUNT(CASE WHEN pl.status = 'failed' THEN 1 END) as failed_payments,
  COUNT(CASE WHEN pl.status = 'disputed' THEN 1 END) as disputed_payments,
  
  -- Average order value
  AVG(pl.amount) as avg_order_value

FROM payment_logs pl
WHERE pl.status IN ('succeeded', 'failed', 'disputed')
GROUP BY DATE(pl.created_at), product_type;

-- Create optimized functions for common admin operations

-- Function to get user details with all related data
CREATE OR REPLACE FUNCTION get_user_details(p_user_id UUID)
RETURNS TABLE(
  user_info JSONB,
  credit_info JSONB,
  transaction_history JSONB,
  activity_history JSONB,
  referral_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- User basic info
    to_jsonb(u.*) as user_info,
    
    -- Credit information
    to_jsonb(uc.*) as credit_info,
    
    -- Transaction history (last 50)
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(ct.*) ORDER BY ct.created_at DESC)
       FROM credit_transactions ct 
       WHERE ct.user_id = p_user_id 
       LIMIT 50), 
      '[]'::jsonb
    ) as transaction_history,
    
    -- Activity history (last 100)
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(ual.*) ORDER BY ual.timestamp DESC)
       FROM user_activity_logs ual 
       WHERE ual.user_id = p_user_id 
       LIMIT 100), 
      '[]'::jsonb
    ) as activity_history,
    
    -- Referral information
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC)
       FROM referrals r 
       WHERE r.referrer_user_id = p_user_id), 
      '[]'::jsonb
    ) as referral_info
    
  FROM users u
  LEFT JOIN user_credits uc ON u.id = uc.user_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard metrics with caching
CREATE OR REPLACE FUNCTION get_dashboard_metrics(use_cache BOOLEAN DEFAULT true)
RETURNS TABLE(
  overview_metrics JSONB,
  recent_activity JSONB,
  alert_summary JSONB
) AS $$
DECLARE
  cache_key TEXT := 'dashboard_metrics';
  cached_result JSONB;
  cache_expiry INTERVAL := '5 minutes';
BEGIN
  -- Check cache first if enabled
  IF use_cache THEN
    SELECT metadata INTO cached_result
    FROM system_metrics 
    WHERE metric_type = cache_key 
      AND timestamp > NOW() - cache_expiry
    ORDER BY timestamp DESC 
    LIMIT 1;
    
    IF cached_result IS NOT NULL THEN
      RETURN QUERY
      SELECT 
        cached_result->'overview_metrics',
        cached_result->'recent_activity', 
        cached_result->'alert_summary';
      RETURN;
    END IF;
  END IF;

  -- Calculate fresh metrics
  RETURN QUERY
  WITH overview AS (
    SELECT jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM users),
      'active_users_7d', (SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '7 days'),
      'new_users_today', (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE),
      'total_generations', (SELECT COUNT(*) FROM usage_analytics),
      'generations_today', (SELECT COUNT(*) FROM usage_analytics WHERE DATE(timestamp) = CURRENT_DATE),
      'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM payment_logs WHERE status = 'succeeded'),
      'revenue_today', (SELECT COALESCE(SUM(amount), 0) FROM payment_logs WHERE status = 'succeeded' AND DATE(created_at) = CURRENT_DATE),
      'total_credits_purchased', (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE type = 'purchase'),
      'total_credits_used', (SELECT COALESCE(ABS(SUM(amount)), 0) FROM credit_transactions WHERE type = 'usage'),
      'pending_alerts', (SELECT COUNT(*) FROM alert_history WHERE resolved_at IS NULL)
    ) as overview_metrics
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ual.id,
        'user_email', u.email,
        'activity_type', ual.activity_type,
        'timestamp', ual.timestamp,
        'activity_data', ual.activity_data
      ) ORDER BY ual.timestamp DESC
    ) as recent_activity
    FROM user_activity_logs ual
    LEFT JOIN users u ON ual.user_id = u.id
    WHERE ual.timestamp >= NOW() - INTERVAL '24 hours'
    LIMIT 20
  ),
  alerts AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ah.id,
        'alert_type', ac.alert_type,
        'alert_message', ah.alert_message,
        'alert_value', ah.alert_value,
        'triggered_at', ah.triggered_at
      ) ORDER BY ah.triggered_at DESC
    ) as alert_summary
    FROM alert_history ah
    LEFT JOIN alert_configs ac ON ah.alert_config_id = ac.id
    WHERE ah.resolved_at IS NULL
    LIMIT 10
  )
  SELECT 
    overview.overview_metrics,
    COALESCE(recent.recent_activity, '[]'::jsonb),
    COALESCE(alerts.alert_summary, '[]'::jsonb)
  FROM overview, recent, alerts;
  
  -- Cache the result if caching is enabled
  IF use_cache THEN
    INSERT INTO system_metrics (metric_type, metric_value, metadata)
    SELECT 
      cache_key,
      0,
      jsonb_build_object(
        'overview_metrics', overview_metrics,
        'recent_activity', recent_activity,
        'alert_summary', alert_summary
      )
    FROM (
      SELECT * FROM get_dashboard_metrics(false)
    ) fresh_data;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for efficient user search with pagination
CREATE OR REPLACE FUNCTION search_users(
  search_term TEXT DEFAULT NULL,
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 50,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc',
  filter_status TEXT DEFAULT NULL,
  filter_has_credits BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  users JSONB,
  total_count INTEGER,
  page_info JSONB
) AS $$
DECLARE
  offset_val INTEGER;
  where_clause TEXT := 'WHERE 1=1';
  order_clause TEXT;
  count_query TEXT;
  data_query TEXT;
  user_data JSONB;
  total INTEGER;
BEGIN
  -- Calculate offset
  offset_val := (page_num - 1) * page_size;
  
  -- Build WHERE clause
  IF search_term IS NOT NULL AND search_term != '' THEN
    where_clause := where_clause || format(' AND (u.email ILIKE %L OR u.display_name ILIKE %L OR u.id::text = %L)', 
      '%' || search_term || '%', '%' || search_term || '%', search_term);
  END IF;
  
  IF filter_status IS NOT NULL THEN
    CASE filter_status
      WHEN 'active' THEN
        where_clause := where_clause || ' AND u.last_login >= NOW() - INTERVAL ''7 days''';
      WHEN 'inactive' THEN
        where_clause := where_clause || ' AND u.last_login < NOW() - INTERVAL ''7 days'' AND u.last_login IS NOT NULL';
      WHEN 'never_logged_in' THEN
        where_clause := where_clause || ' AND u.last_login IS NULL';
    END CASE;
  END IF;
  
  IF filter_has_credits IS NOT NULL THEN
    IF filter_has_credits THEN
      where_clause := where_clause || ' AND (COALESCE(uc.paid_credits, 0) + COALESCE(uc.bonus_credits, 0)) > 0';
    ELSE
      where_clause := where_clause || ' AND (COALESCE(uc.paid_credits, 0) + COALESCE(uc.bonus_credits, 0)) = 0';
    END IF;
  END IF;
  
  -- Build ORDER clause
  order_clause := format('ORDER BY %I %s', sort_by, CASE WHEN sort_order = 'asc' THEN 'ASC' ELSE 'DESC' END);
  
  -- Get total count
  count_query := format('
    SELECT COUNT(*)
    FROM users u
    LEFT JOIN user_credits uc ON u.id = uc.user_id
    %s', where_clause);
  
  EXECUTE count_query INTO total;
  
  -- Get data
  data_query := format('
    SELECT jsonb_agg(
      jsonb_build_object(
        ''id'', u.id,
        ''email'', u.email,
        ''display_name'', u.display_name,
        ''created_at'', u.created_at,
        ''last_login'', u.last_login,
        ''total_credits'', COALESCE(uc.paid_credits, 0) + COALESCE(uc.bonus_credits, 0),
        ''paid_credits'', COALESCE(uc.paid_credits, 0),
        ''bonus_credits'', COALESCE(uc.bonus_credits, 0),
        ''user_status'', CASE 
          WHEN u.last_login >= NOW() - INTERVAL ''7 days'' THEN ''active''
          WHEN u.last_login >= NOW() - INTERVAL ''30 days'' THEN ''inactive''
          WHEN u.last_login IS NULL THEN ''never_logged_in''
          ELSE ''dormant''
        END
      )
    )
    FROM users u
    LEFT JOIN user_credits uc ON u.id = uc.user_id
    %s
    %s
    LIMIT %s OFFSET %s',
    where_clause, order_clause, page_size, offset_val);
  
  EXECUTE data_query INTO user_data;
  
  RETURN QUERY
  SELECT 
    COALESCE(user_data, '[]'::jsonb) as users,
    total as total_count,
    jsonb_build_object(
      'page', page_num,
      'page_size', page_size,
      'total_pages', CEIL(total::numeric / page_size),
      'total_count', total,
      'has_next', (page_num * page_size) < total,
      'has_prev', page_num > 1
    ) as page_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create additional indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login_desc ON users(last_login DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc ON users(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trgm ON users USING gin(email gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_display_name_trgm ON users USING gin(display_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_transactions_type_created_at ON credit_transactions(type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_logs_type_timestamp ON user_activity_logs(activity_type, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_status_created_at ON payment_logs(status, created_at DESC);

-- Enable trigram extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE user_credits;
ANALYZE credit_transactions;
ANALYZE payment_logs;
ANALYZE user_activity_logs;
ANALYZE usage_analytics;

-- Comments for documentation
COMMENT ON VIEW user_summary IS 'Optimized view with pre-aggregated user data for admin dashboard';
COMMENT ON VIEW payment_summary IS 'Payment data with user information and product classification';
COMMENT ON VIEW analytics_summary IS 'Aggregated analytics data by date and type';
COMMENT ON VIEW revenue_summary IS 'Revenue metrics by date and product with fee calculations';
COMMENT ON FUNCTION get_user_details IS 'Efficient function to get complete user information';
COMMENT ON FUNCTION get_dashboard_metrics IS 'Cached dashboard metrics for performance';
COMMENT ON FUNCTION search_users IS 'Efficient user search with pagination and filtering';