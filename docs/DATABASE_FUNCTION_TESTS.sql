-- Photo Packages System - Database Function Tests
-- QA Testing Script for Database Layer Verification

-- ===========================================
-- TEST SETUP
-- ===========================================

-- Create test user ID for testing
DO $$
DECLARE
    test_user_id UUID := '12345678-1234-1234-1234-123456789012';
BEGIN
    -- Insert test user_credits record if it doesn't exist
    INSERT INTO user_credits (user_id, paid_credits, bonus_credits)
    VALUES (test_user_id, 100, 50)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Test setup completed for user: %', test_user_id;
END $$;

-- ===========================================
-- TEST 1: BASIC PACKAGE QUERIES
-- ===========================================

\echo '🧪 TEST 1: Basic Package Queries'

-- Get all packages
SELECT 
    'Test 1.1: Get all packages' as test_name,
    COUNT(*) as package_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_featured = true) as featured_count
FROM photo_packages;

-- Get wedding package details
SELECT 
    'Test 1.2: Wedding package details' as test_name,
    id, slug, name, category, images_per_generation, is_active, is_featured
FROM photo_packages 
WHERE slug = 'wedding-portraits';

-- Get pricing tiers for wedding package
SELECT 
    'Test 1.3: Pricing tiers' as test_name,
    pt.name, pt.shoots_count, pt.price_cents, pt.badge, pt.is_default
FROM package_pricing_tiers pt
JOIN photo_packages p ON p.id = pt.package_id
WHERE p.slug = 'wedding-portraits'
ORDER BY pt.sort_order;

-- ===========================================
-- TEST 2: RATE LIMITING FUNCTIONS
-- ===========================================

\echo '🧪 TEST 2: Rate Limiting Functions'

-- Test rate limit check for anonymous user
SELECT 
    'Test 2.1: Anonymous rate limit check' as test_name,
    check_package_rate_limit(
        'test-user-anonymous', 
        (SELECT id FROM photo_packages WHERE slug = 'wedding-portraits'), 
        'anonymous'
    ) as rate_limit_result;

-- Test rate limit check for paid user
SELECT 
    'Test 2.2: Paid user rate limit check' as test_name,
    check_package_rate_limit(
        'test-user-paid', 
        (SELECT id FROM photo_packages WHERE slug = 'wedding-portraits'), 
        'paid'
    ) as rate_limit_result;

-- Test incrementing usage for anonymous user
SELECT 
    'Test 2.3: Increment anonymous usage' as test_name,
    increment_package_usage(
        'test-user-anonymous',
        (SELECT id FROM photo_packages WHERE slug = 'wedding-portraits'),
        1
    ) as increment_result;

-- Check rate limit after increment
SELECT 
    'Test 2.4: Rate limit after increment' as test_name,
    check_package_rate_limit(
        'test-user-anonymous', 
        (SELECT id FROM photo_packages WHERE slug = 'wedding-portraits'), 
        'anonymous'
    ) as rate_limit_after;

-- ===========================================
-- TEST 3: PACKAGE USAGE PROCESSING
-- ===========================================

\echo '🧪 TEST 3: Package Usage Processing'

-- Test package usage processing (requires user_credits)
SELECT 
    'Test 3.1: Process package usage' as test_name,
    process_package_usage(
        '12345678-1234-1234-1234-123456789012'::UUID,
        (SELECT id FROM photo_packages WHERE slug = 'wedding-portraits'),
        (SELECT id FROM package_pricing_tiers WHERE name = 'Wedding' LIMIT 1),
        'test-session-123',
        ARRAY['classic-theme', 'romantic-theme'],
        'couple'
    ) as process_result;

-- Check user credits after usage
SELECT 
    'Test 3.2: User credits after usage' as test_name,
    paid_credits, bonus_credits, (paid_credits + bonus_credits) as total_credits
FROM user_credits 
WHERE user_id = '12345678-1234-1234-1234-123456789012';

-- Check package usage record
SELECT 
    'Test 3.3: Package usage record' as test_name,
    pu.credits_used, pu.generations_count, pu.status, array_length(pu.themes_used, 1) as themes_count
FROM package_usage pu
WHERE pu.user_id = '12345678-1234-1234-1234-123456789012'
ORDER BY pu.created_at DESC
LIMIT 1;

-- ===========================================
-- TEST 4: STATISTICS AND ANALYTICS
-- ===========================================

\echo '🧪 TEST 4: Statistics and Analytics'

-- Test package statistics function
SELECT 
    'Test 4.1: Package statistics' as test_name,
    get_package_statistics() as statistics;

-- View rate tracking data
SELECT 
    'Test 4.2: Rate tracking overview' as test_name,
    user_identifier, hourly_count, daily_count, last_used_at
FROM package_rate_tracking
ORDER BY last_used_at DESC
LIMIT 5;

-- View package usage summary
SELECT 
    'Test 4.3: Usage summary' as test_name,
    COUNT(*) as total_usage,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_usage,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_usage,
    SUM(credits_used) as total_credits_used
FROM package_usage;

-- ===========================================
-- TEST 5: DATA INTEGRITY CHECKS
-- ===========================================

\echo '🧪 TEST 5: Data Integrity Checks'

-- Check foreign key relationships
SELECT 
    'Test 5.1: Foreign key integrity' as test_name,
    'All foreign keys valid' as result
WHERE NOT EXISTS (
    -- Check package_themes references
    SELECT 1 FROM package_themes pt 
    LEFT JOIN photo_packages p ON p.id = pt.package_id 
    WHERE p.id IS NULL
    
    UNION ALL
    
    -- Check package_pricing_tiers references  
    SELECT 1 FROM package_pricing_tiers ppt
    LEFT JOIN photo_packages p ON p.id = ppt.package_id
    WHERE p.id IS NULL
    
    UNION ALL
    
    -- Check package_usage references
    SELECT 1 FROM package_usage pu
    LEFT JOIN photo_packages p ON p.id = pu.package_id
    WHERE p.id IS NULL
);

-- Check default tier constraint
SELECT 
    'Test 5.2: Default tier constraint' as test_name,
    package_id,
    COUNT(*) FILTER (WHERE is_default = true) as default_count
FROM package_pricing_tiers
GROUP BY package_id
HAVING COUNT(*) FILTER (WHERE is_default = true) != 1;

-- Check rate limit configurations
SELECT 
    'Test 5.3: Rate limit configurations' as test_name,
    p.name as package_name,
    COUNT(prl.*) as rate_limit_configs
FROM photo_packages p
LEFT JOIN package_rate_limits prl ON prl.package_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name;

-- ===========================================
-- TEST 6: PERFORMANCE VERIFICATION
-- ===========================================

\echo '🧪 TEST 6: Performance Verification'

-- Check index usage (explain plans)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT p.*, COUNT(pt.id) as theme_count
FROM photo_packages p
LEFT JOIN package_themes pt ON pt.package_id = p.id
WHERE p.is_active = true AND p.is_featured = true
GROUP BY p.id
ORDER BY p.sort_order;

-- ===========================================
-- TEST RESULTS SUMMARY
-- ===========================================

\echo '📊 TEST SUMMARY'

SELECT 
    'Test Summary' as report_section,
    jsonb_build_object(
        'total_packages', (SELECT COUNT(*) FROM photo_packages),
        'active_packages', (SELECT COUNT(*) FROM photo_packages WHERE is_active = true),
        'pricing_tiers', (SELECT COUNT(*) FROM package_pricing_tiers),
        'rate_limit_configs', (SELECT COUNT(*) FROM package_rate_limits),
        'usage_records', (SELECT COUNT(*) FROM package_usage),
        'rate_tracking_records', (SELECT COUNT(*) FROM package_rate_tracking),
        'test_timestamp', NOW()
    ) as summary_data;

-- Clean up test data (optional)
-- DELETE FROM package_usage WHERE user_id = '12345678-1234-1234-1234-123456789012';
-- DELETE FROM user_credits WHERE user_id = '12345678-1234-1234-1234-123456789012';

\echo '✅ All database function tests completed!'