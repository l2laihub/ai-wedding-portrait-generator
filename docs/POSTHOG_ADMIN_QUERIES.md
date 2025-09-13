# PostHog Admin Analytics Queries

This document provides example queries and insights for administrators to monitor and analyze the AI Wedding Portrait Generator's performance and usage patterns.

## Core Business Metrics

### 1. Total Generations and Growth Rate

**Query**: Counter Increments Over Time
```json
{
  "events": [{
    "id": "generation_counter_incremented",
    "math": "total"
  }],
  "interval": "day",
  "date_from": "-30d",
  "display": "ActionsLineGraph"
}
```

**HogQL Query** (for advanced analysis):
```sql
SELECT 
  toDate(timestamp) as date,
  count() as daily_generations,
  sum(totalGenerations) as running_total
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= today() - interval 30 day
GROUP BY date
ORDER BY date
```

### 2. Success Rate Analysis

**Query**: Generation Success Rate Trends
```json
{
  "events": [{
    "id": "generation_counter_incremented",
    "math": "avg",
    "math_property": "successRate"
  }],
  "interval": "hour",
  "date_from": "-7d",
  "display": "ActionsLineGraph"
}
```

**HogQL Query**:
```sql
SELECT 
  toStartOfHour(timestamp) as hour,
  avg(JSONExtractFloat(properties, 'successRate')) as avg_success_rate,
  count() as total_generations
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= now() - interval 7 day
GROUP BY hour
ORDER BY hour
```

### 3. Photo Type Preference Distribution

**Query**: Photo Type Breakdown
```json
{
  "events": [{
    "id": "generation_counter_incremented"
  }],
  "breakdown": "photoType",
  "date_from": "-30d",
  "display": "ActionsPie"
}
```

**HogQL Query**:
```sql
SELECT 
  JSONExtractString(properties, 'photoType') as photo_type,
  count() as generation_count,
  count() * 100.0 / (SELECT count() FROM events WHERE event = 'generation_counter_incremented' AND timestamp >= today() - interval 30 day) as percentage
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= today() - interval 30 day
GROUP BY photo_type
ORDER BY generation_count DESC
```

## User Engagement Analysis

### 4. Daily Active Users (DAU)

**Query**: Unique Users per Day
```json
{
  "events": [{
    "id": "generation_started",
    "math": "dau"
  }],
  "interval": "day",
  "date_from": "-30d",
  "display": "ActionsLineGraph"
}
```

**HogQL Query**:
```sql
SELECT 
  toDate(timestamp) as date,
  count(DISTINCT person_id) as daily_active_users
FROM events 
WHERE event IN ('generation_started', 'image_upload_started')
  AND timestamp >= today() - interval 30 day
GROUP BY date
ORDER BY date
```

### 5. User Retention Analysis

**HogQL Query**: 7-Day Retention
```sql
SELECT 
  first_day,
  count(DISTINCT user_id) as cohort_size,
  count(DISTINCT CASE WHEN day_diff = 1 THEN user_id END) as day_1_retention,
  count(DISTINCT CASE WHEN day_diff = 7 THEN user_id END) as day_7_retention
FROM (
  SELECT 
    person_id as user_id,
    min(toDate(timestamp)) as first_day,
    toDate(timestamp) as activity_day,
    activity_day - first_day as day_diff
  FROM events 
  WHERE event = 'generation_started'
    AND timestamp >= today() - interval 30 day
  GROUP BY person_id, activity_day
)
GROUP BY first_day
ORDER BY first_day
```

### 6. Engagement Score Distribution

**Query**: User Engagement Metrics
```json
{
  "events": [{
    "id": "user_engagement_metrics",
    "math": "avg",
    "math_property": "engagementScore"
  }],
  "interval": "day",
  "date_from": "-7d",
  "display": "ActionsLineGraph"
}
```

**HogQL Query**:
```sql
SELECT 
  toDate(timestamp) as date,
  avg(JSONExtractFloat(properties, 'engagementScore')) as avg_engagement,
  count(DISTINCT person_id) as users_with_score,
  quantile(0.5)(JSONExtractFloat(properties, 'engagementScore')) as median_engagement
FROM events 
WHERE event = 'user_engagement_metrics'
  AND timestamp >= today() - interval 7 day
GROUP BY date
ORDER BY date
```

## Performance Monitoring

### 7. Generation Duration Analysis

**Query**: Average Generation Time
```json
{
  "events": [{
    "id": "generation_completed",
    "math": "avg",
    "math_property": "duration"
  }],
  "interval": "hour",
  "date_from": "-24h",
  "display": "ActionsLineGraph"
}
```

**HogQL Query**:
```sql
SELECT 
  toStartOfHour(timestamp) as hour,
  avg(JSONExtractInt(properties, 'duration')) / 1000 as avg_duration_seconds,
  quantile(0.95)(JSONExtractInt(properties, 'duration')) / 1000 as p95_duration_seconds,
  count() as total_generations
FROM events 
WHERE event = 'generation_completed'
  AND timestamp >= now() - interval 24 hour
GROUP BY hour
ORDER BY hour
```

### 8. Error Rate Monitoring

**HogQL Query**: Error Analysis
```sql
SELECT 
  toDate(timestamp) as date,
  count(CASE WHEN event = 'generation_failed' THEN 1 END) as failed_generations,
  count(CASE WHEN event = 'generation_completed' THEN 1 END) as successful_generations,
  failed_generations * 100.0 / (failed_generations + successful_generations) as error_rate_percent
FROM events 
WHERE event IN ('generation_completed', 'generation_failed')
  AND timestamp >= today() - interval 7 day
GROUP BY date
ORDER BY date
```

### 9. API Response Time Tracking

**HogQL Query**: Performance by Photo Type
```sql
SELECT 
  JSONExtractString(properties, 'photoType') as photo_type,
  avg(JSONExtractInt(properties, 'duration')) / 1000 as avg_duration_seconds,
  count() as generation_count,
  avg(JSONExtractFloat(properties, 'successRate')) as avg_success_rate
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= today() - interval 7 day
GROUP BY photo_type
ORDER BY avg_duration_seconds DESC
```

## Feature Usage Analysis

### 10. Custom Prompt Usage

**Query**: Custom Prompt Adoption
```json
{
  "events": [{
    "id": "generation_counter_incremented"
  }],
  "breakdown": "hasCustomPrompt",
  "date_from": "-30d",
  "display": "ActionsPie"
}
```

**HogQL Query**:
```sql
SELECT 
  toDate(timestamp) as date,
  count(CASE WHEN JSONExtractBool(properties, 'hasCustomPrompt') = true THEN 1 END) as with_custom_prompt,
  count(CASE WHEN JSONExtractBool(properties, 'hasCustomPrompt') = false THEN 1 END) as without_custom_prompt,
  with_custom_prompt * 100.0 / (with_custom_prompt + without_custom_prompt) as custom_prompt_usage_percent
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= today() - interval 30 day
GROUP BY date
ORDER BY date
```

### 11. Style Popularity Analysis

**HogQL Query**: Most Popular Wedding Styles
```sql
SELECT 
  style_name,
  count() as generation_count,
  avg(JSONExtractFloat(properties, 'successRate')) as avg_success_rate
FROM events 
ARRAY JOIN JSONExtractArrayRaw(properties, 'styles') as style_raw
WHERE event = 'generation_counter_incremented'
  AND timestamp >= today() - interval 30 day
  AND style_raw != ''
GROUP BY JSONExtractString(style_raw) as style_name
ORDER BY generation_count DESC
LIMIT 10
```

### 12. Family Photo Size Analysis

**HogQL Query**: Family Member Count Distribution
```sql
SELECT 
  JSONExtractInt(properties, 'familyMemberCount') as member_count,
  count() as family_photo_count,
  avg(JSONExtractFloat(properties, 'successRate')) as avg_success_rate
FROM events 
WHERE event = 'generation_counter_incremented'
  AND JSONExtractString(properties, 'photoType') = 'family'
  AND timestamp >= today() - interval 30 day
GROUP BY member_count
ORDER BY member_count
```

## Conversion Funnel Analysis

### 13. Complete User Journey

**Funnel Query**: Upload to Download
```json
{
  "insight": "FUNNELS",
  "events": [
    {"id": "image_upload_started", "name": "Upload Started"},
    {"id": "generation_started", "name": "Generation Started"},
    {"id": "generation_completed", "name": "Generation Completed"},
    {"id": "image_downloaded", "name": "Image Downloaded"}
  ],
  "funnel_window_days": 1,
  "date_from": "-30d"
}
```

### 14. Conversion Rate by Photo Type

**HogQL Query**: Photo Type Conversion Analysis
```sql
SELECT 
  photo_type,
  count(DISTINCT person_id) as users_started,
  count(DISTINCT CASE WHEN completed = 1 THEN person_id END) as users_completed,
  users_completed * 100.0 / users_started as completion_rate
FROM (
  SELECT 
    person_id,
    JSONExtractString(properties, 'photoType') as photo_type,
    max(CASE WHEN event = 'generation_completed' THEN 1 ELSE 0 END) as completed
  FROM events 
  WHERE event IN ('generation_started', 'generation_completed')
    AND timestamp >= today() - interval 7 day
  GROUP BY person_id, photo_type
)
WHERE photo_type != ''
GROUP BY photo_type
ORDER BY completion_rate DESC
```

## Milestone and Achievement Tracking

### 15. Milestone Achievement Timeline

**HogQL Query**: Counter Milestones
```sql
SELECT 
  JSONExtractInt(properties, 'milestone') as milestone_value,
  count() as times_achieved,
  min(timestamp) as first_achieved,
  max(timestamp) as last_achieved,
  avg(JSONExtractInt(properties, 'totalGenerations')) as avg_total_at_milestone
FROM events 
WHERE event = 'counter_milestone_reached'
  AND timestamp >= today() - interval 90 day
GROUP BY milestone_value
ORDER BY milestone_value
```

### 16. User Growth Milestones

**HogQL Query**: Daily User Milestones
```sql
SELECT 
  date,
  daily_users,
  CASE 
    WHEN daily_users >= 1000 THEN '1000+ users'
    WHEN daily_users >= 500 THEN '500-999 users'
    WHEN daily_users >= 100 THEN '100-499 users'
    WHEN daily_users >= 50 THEN '50-99 users'
    ELSE 'Under 50 users'
  END as user_milestone
FROM (
  SELECT 
    toDate(timestamp) as date,
    count(DISTINCT person_id) as daily_users
  FROM events 
  WHERE event IN ('generation_started', 'image_upload_started')
    AND timestamp >= today() - interval 30 day
  GROUP BY date
)
ORDER BY date
```

## Business Intelligence Queries

### 17. Revenue Potential (If Monetized)

**HogQL Query**: Hypothetical Revenue by User Segment
```sql
SELECT 
  user_segment,
  user_count,
  total_generations,
  total_generations * 0.99 as potential_revenue_usd -- Hypothetical $0.99 per generation
FROM (
  SELECT 
    CASE 
      WHEN generation_count >= 10 THEN 'Power Users'
      WHEN generation_count >= 5 THEN 'Regular Users'
      WHEN generation_count >= 2 THEN 'Casual Users'
      ELSE 'One-time Users'
    END as user_segment,
    count(DISTINCT person_id) as user_count,
    sum(generation_count) as total_generations
  FROM (
    SELECT 
      person_id,
      count() as generation_count
    FROM events 
    WHERE event = 'generation_counter_incremented'
      AND timestamp >= today() - interval 30 day
    GROUP BY person_id
  )
  GROUP BY user_segment
)
ORDER BY total_generations DESC
```

### 18. Peak Usage Hours

**HogQL Query**: Hourly Usage Patterns
```sql
SELECT 
  hour_of_day,
  avg(daily_generations) as avg_generations_per_hour,
  max(daily_generations) as peak_generations,
  count(distinct date) as days_analyzed
FROM (
  SELECT 
    toDate(timestamp) as date,
    toHour(timestamp) as hour_of_day,
    count() as daily_generations
  FROM events 
  WHERE event = 'generation_counter_incremented'
    AND timestamp >= today() - interval 30 day
  GROUP BY date, hour_of_day
)
GROUP BY hour_of_day
ORDER BY avg_generations_per_hour DESC
```

### 19. Geographic Distribution (if tracking location)

**HogQL Query**: Usage by Region
```sql
SELECT 
  JSONExtractString(properties, 'timezone') as user_timezone,
  count(DISTINCT person_id) as unique_users,
  count() as total_generations,
  avg(JSONExtractFloat(properties, 'successRate')) as avg_success_rate
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= today() - interval 30 day
  AND JSONExtractString(properties, 'timezone') != ''
GROUP BY user_timezone
ORDER BY unique_users DESC
LIMIT 20
```

## Alert Conditions

### Critical Alerts (SQL Conditions)
```sql
-- Success Rate Below 80%
SELECT avg(JSONExtractFloat(properties, 'successRate')) as avg_success_rate
FROM events 
WHERE event = 'generation_counter_incremented'
  AND timestamp >= now() - interval 1 hour
HAVING avg_success_rate < 0.80

-- Error Rate Above 5%
SELECT 
  count(CASE WHEN event = 'generation_failed' THEN 1 END) * 100.0 / count() as error_rate
FROM events 
WHERE event IN ('generation_completed', 'generation_failed')
  AND timestamp >= now() - interval 1 hour
HAVING error_rate > 5.0

-- Daily Active Users Drop by 50%
SELECT 
  count(DISTINCT person_id) as today_users,
  (SELECT count(DISTINCT person_id) FROM events WHERE event = 'generation_started' AND timestamp >= yesterday() AND timestamp < today()) as yesterday_users
FROM events 
WHERE event = 'generation_started' 
  AND timestamp >= today()
HAVING today_users < yesterday_users * 0.5
```

## Usage Instructions

1. **Dashboard Setup**: Use these queries as insights in PostHog dashboards
2. **Scheduled Reports**: Set up email reports for key metrics
3. **Alert Configuration**: Implement the alert conditions for monitoring
4. **Custom Analysis**: Modify queries for specific business questions
5. **Performance Monitoring**: Use these queries to track system health

## Query Optimization Tips

- Use appropriate time ranges to avoid performance issues
- Leverage PostHog's sampling for large datasets
- Create saved insights for frequently used queries
- Use cohorts for user segmentation analysis
- Consider data retention policies when writing historical queries

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Maintainer**: Development Team