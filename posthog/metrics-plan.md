# PostHog Metrics & KPIs Plan

## Core Business Metrics

### 1. Conversion Funnel Metrics

#### Primary Funnel: Visit → Upload → Generate → Result
```
Visitor → Image Uploader → Portrait Generator → Result Viewer → Downloader/Sharer
```

**Key Metrics:**
- **Overall Conversion Rate**: Visitors who complete at least one download
- **Funnel Drop-off Rates**: 
  - Visit → Upload: % who upload an image
  - Upload → Generate: % who click generate
  - Generate → View Results: % who see results
  - View → Download/Share: % who download or share

**Formulas:**
```sql
-- Overall Conversion Rate
(COUNT(DISTINCT user_id WHERE downloaded > 0) / COUNT(DISTINCT user_id)) * 100

-- Stage Conversion Rates
upload_rate = (users_uploaded / total_visitors) * 100
generation_rate = (users_generated / users_uploaded) * 100
completion_rate = (users_viewed_results / users_generated) * 100
engagement_rate = (users_downloaded_or_shared / users_viewed_results) * 100
```

### 2. Lead Quality Metrics

#### Lead Scoring Model
```javascript
leadScore = {
  // Engagement signals (0-40 points)
  uploaded_image: 10,
  generated_portraits: 15,
  downloaded_image: 10,
  shared_image: 5,
  
  // Quality signals (0-30 points)
  custom_prompt_used: 5,
  multiple_generations: 10,
  all_styles_successful: 5,
  pwa_installed: 10,
  
  // Retention signals (0-30 points)
  returning_user: 10,
  session_duration_5min+: 10,
  multiple_downloads: 10
}

// Lead Categories
hot_lead: score >= 70
warm_lead: score >= 40 && score < 70
cold_lead: score < 40
```

#### Lead Quality KPIs
- **Hot Lead Rate**: % of users with score ≥ 70
- **Lead Velocity**: Time from first visit to hot lead status
- **Lead Activation Rate**: % of leads who generate within first session
- **Lead Retention Rate**: % of leads who return within 7 days

### 3. User Engagement Patterns

#### Engagement Metrics
- **Average Session Duration**: Time spent per session
- **Pages per Session**: Number of interactions per visit
- **Bounce Rate**: % who leave without uploading
- **Return User Rate**: % who visit more than once

#### Behavioral Cohorts
1. **Power Users**: 3+ generations, 5+ downloads
2. **Engaged Users**: 1-2 generations, 1-4 downloads
3. **Browsers**: Upload but don't generate
4. **Visitors**: View but don't upload

### 4. API Usage & Cost Metrics

#### Usage Tracking
- **Daily API Calls**: Total Gemini API requests
- **API Success Rate**: Successful calls / Total calls
- **Average Response Time**: API latency by hour
- **Cost per User**: API cost / Active users

#### Cost Optimization KPIs
```javascript
metrics = {
  cost_per_generation: api_cost / total_generations,
  cost_per_successful_result: api_cost / successful_downloads,
  cost_per_lead: api_cost / qualified_leads,
  roi_per_user: (user_lifetime_value - api_cost) / api_cost
}
```

## Advanced Analytics

### 1. Performance Metrics

#### Page Load Performance
- **First Contentful Paint (FCP)**: < 1.8s target
- **Largest Contentful Paint (LCP)**: < 2.5s target
- **Time to Interactive (TTI)**: < 3.8s target
- **Cumulative Layout Shift (CLS)**: < 0.1 target

#### Generation Performance
- **Average Generation Time**: By device type and network
- **Concurrent vs Sequential Performance**: Mobile optimization impact
- **Error Rate by Style**: Identify problematic themes

### 2. Device & Platform Analytics

#### Device Segmentation
```javascript
deviceMetrics = {
  mobile: {
    conversion_rate: number,
    avg_generation_time: number,
    pwa_install_rate: number,
    share_vs_download_ratio: number
  },
  desktop: {
    conversion_rate: number,
    avg_generation_time: number,
    multi_download_rate: number
  }
}
```

#### Network Impact Analysis
- Conversion rate by connection type
- Generation success rate by network speed
- Timeout rates on slow connections

### 3. Feature Adoption Metrics

#### Feature Usage Rates
- **Custom Prompt Usage**: % who add custom text
- **Style Preference**: Most/least popular wedding styles
- **Share Feature Adoption**: Native API vs fallback usage
- **PWA Installation Rate**: By device and user segment

### 4. Revenue Attribution Metrics

#### Attribution Model
```javascript
revenueAttribution = {
  first_touch: {
    source: string,
    medium: string,
    campaign: string
  },
  last_touch: {
    source: string,
    medium: string,
    campaign: string
  },
  multi_touch: {
    touchpoints: Array<TouchPoint>,
    attribution_weight: number[]
  }
}
```

## Key Performance Indicators (KPIs)

### Primary KPIs
1. **Monthly Active Users (MAU)**: Unique users per month
2. **Generation Success Rate**: Successful portraits / Total attempts
3. **User Acquisition Cost (UAC)**: Marketing spend / New users
4. **Lead Conversion Rate**: Qualified leads / Total visitors
5. **API Cost Efficiency**: Cost per qualified lead

### Secondary KPIs
1. **Average Revenue Per User (ARPU)**: If monetized
2. **Network Churn Rate**: Users lost due to connectivity
3. **Feature Adoption Rate**: New features usage %
4. **Support Ticket Rate**: Issues / Active users
5. **Social Sharing Rate**: Shares / Generated portraits

## Tracking Implementation

### 1. Custom Properties for All Events
```javascript
// Enrich all events with context
posthog.capture('event_name', {
  ...eventProperties,
  // Performance context
  page_load_time_ms: performance.timing.loadEventEnd - performance.timing.navigationStart,
  time_since_page_load_ms: Date.now() - pageLoadTime,
  
  // User journey context
  images_uploaded_session: sessionImageCount,
  generations_completed_session: sessionGenerationCount,
  current_funnel_stage: funnelStage,
  
  // Technical context
  api_latency_ms: lastAPILatency,
  memory_usage_mb: performance.memory?.usedJSHeapSize / 1048576,
  connection_effective_type: navigator.connection?.effectiveType
});
```

### 2. Calculated Metrics

```sql
-- Weekly Active Users who Generate
SELECT 
  COUNT(DISTINCT user_id) as wau_generators
FROM events
WHERE 
  event = 'generation_completed'
  AND timestamp > now() - interval '7 days'
  AND properties->successful_styles > 0;

-- Average Generations per User
SELECT 
  AVG(generation_count) as avg_generations_per_user
FROM (
  SELECT 
    user_id,
    COUNT(*) as generation_count
  FROM events
  WHERE event = 'generation_completed'
  GROUP BY user_id
) user_generations;

-- Conversion Rate by Source
SELECT 
  properties->utm_source as source,
  COUNT(DISTINCT CASE WHEN converted THEN user_id END) / COUNT(DISTINCT user_id) as conversion_rate
FROM (
  SELECT 
    user_id,
    properties->utm_source,
    MAX(CASE WHEN event = 'result_downloaded' THEN 1 ELSE 0 END) as converted
  FROM events
  GROUP BY user_id, properties->utm_source
) user_conversions
GROUP BY properties->utm_source;
```

## Success Metrics Dashboard Structure

### 1. Executive Dashboard
- MAU trend (30-day rolling)
- Overall conversion funnel
- API cost vs user acquisition trend
- Lead quality distribution

### 2. Product Dashboard
- Feature adoption rates
- User flow sankey diagram
- Error rates by feature
- Performance metrics by device

### 3. Marketing Dashboard
- Acquisition channels performance
- Campaign conversion rates
- Cost per lead by source
- User journey paths

### 4. Technical Dashboard
- API performance metrics
- Error rates and types
- Page load performance
- Device/browser compatibility