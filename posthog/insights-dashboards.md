# PostHog Custom Insights & Dashboards Structure

## Dashboard Architecture

### 1. Executive Dashboard - "Business Overview"

#### Key Metrics Cards
```yaml
- Monthly Active Users (MAU):
    query: COUNT DISTINCT user_id WHERE timestamp > now() - interval 30 days
    comparison: Previous 30 days
    visualization: Trend line with annotation

- Lead Conversion Rate:
    query: (qualified_leads / total_visitors) * 100
    comparison: Previous period & YoY
    visualization: Progress bar with target

- API Cost Efficiency:
    formula: total_api_cost / qualified_leads_count
    comparison: Weekly trend
    visualization: Area chart with cost threshold

- User Acquisition Cost:
    formula: marketing_spend / new_users
    comparison: By channel
    visualization: Stacked bar chart
```

#### Insights
1. **User Growth Trend**
   - Type: Trends
   - Events: `session_started` (unique users)
   - Breakdown: New vs Returning
   - Time range: Last 90 days
   - Interval: Daily

2. **Conversion Funnel Overview**
   - Type: Funnel
   - Steps: Visit → Upload → Generate → View → Download/Share
   - Time to convert: 1 session
   - Breakdown: Device type

3. **Lead Quality Distribution**
   - Type: Stickiness
   - Events: Scored by lead grade (A, B, C, D)
   - Show: Distribution pie chart
   - Filter: Last 30 days

### 2. Product Performance Dashboard

#### Core Insights

1. **Feature Adoption Funnel**
   ```sql
   Funnel Analysis:
   1. Page Viewed (any user)
   2. Image Uploaded
   3. Custom Prompt Used (optional)
   4. Generation Started
   5. Results Viewed
   6. Downloaded OR Shared
   
   Breakdown by: Device Type, First-time vs Returning
   ```

2. **Style Popularity Analysis**
   - Type: Bar chart
   - Event: `generation_style_completed`
   - Group by: `style_name`
   - Metric: Count & Success Rate
   - Time: Last 30 days

3. **Generation Performance Metrics**
   ```yaml
   Average Generation Time:
     - By device type
     - By network quality
     - By time of day
   
   Success Rate:
     - Overall: successful / total attempts
     - By style: breakdown per wedding theme
     - By user segment: new vs returning
   ```

4. **Error Analysis Dashboard**
   - Type: Table
   - Events: `api_error`, `generation_style_failed`
   - Columns: Error type, Count, User impact, Device
   - Sort: By frequency descending

### 3. User Experience Dashboard

#### Mobile vs Desktop Insights

1. **Device Performance Comparison**
   ```yaml
   Metrics Grid:
   - Conversion Rate: mobile vs desktop
   - Avg Session Duration: by device
   - Feature Usage: breakdown by platform
   - Error Rate: by device and browser
   ```

2. **Page Load Performance**
   - Type: Line chart
   - Events: `performance_metric` where `metric_name` = 'page_load'
   - Percentiles: P50, P75, P95
   - Breakdown: Device type, Connection speed

3. **User Journey Paths**
   - Type: Path analysis
   - Starting point: `page_viewed`
   - Ending point: `result_downloaded` OR `session_ended`
   - Show: Top 10 paths

4. **PWA Adoption Tracking**
   ```yaml
   PWA Metrics:
   - Install Prompt Show Rate
   - Install Acceptance Rate
   - PWA vs Web Performance
   - Retention: PWA users vs regular
   ```

### 4. Marketing & Acquisition Dashboard

#### Campaign Performance

1. **Acquisition Channels Overview**
   - Type: Stacked area chart
   - Event: `session_started`
   - Breakdown: UTM source/medium
   - Show: Volume and conversion rate

2. **Campaign ROI Analysis**
   ```sql
   Table View:
   - Campaign Name
   - Visitors
   - Conversion Rate
   - Cost per Lead
   - Lead Quality Score Avg
   - ROI Calculation
   ```

3. **First Touch vs Last Touch Attribution**
   - Type: Sankey diagram
   - Show: User journey from first touch to conversion
   - Highlight: Multi-touch paths

4. **Geographic Performance**
   - Type: World map
   - Metrics: Users, Conversion Rate, Avg Lead Score
   - Filter: Zoomable by region

### 5. Lead Generation Dashboard

#### Lead Scoring Insights

1. **Lead Score Distribution**
   ```yaml
   Histogram:
   - X-axis: Lead score buckets (0-20, 21-40, etc.)
   - Y-axis: Number of users
   - Color: Lead grade (A, B, C, D)
   - Trend: Show movement between buckets
   ```

2. **Lead Velocity**
   - Type: Cohort analysis
   - Cohort by: Week of first visit
   - Show: Time to reach qualified lead status
   - Breakdown: By acquisition source

3. **High-Value User Identification**
   ```sql
   Segment Criteria:
   - Lead Score > 70
   - Multiple Sessions > 3
   - Downloads > 2
   - Has Shared Results
   
   Show: User list with contact opportunity
   ```

4. **Lead Nurturing Opportunities**
   - Type: User segments
   - Segments:
     - Uploaded but didn't generate
     - Generated but didn't download
     - Single session high engagement
     - Returning visitors without conversion

### 6. Technical & API Dashboard

#### System Health Monitoring

1. **API Performance Metrics**
   ```yaml
   Real-time Monitoring:
   - API Response Time (P50, P95, P99)
   - Error Rate by Endpoint
   - Rate Limiting Occurrences
   - Cost per 1000 API Calls
   ```

2. **Browser & Device Compatibility**
   - Type: Heat map
   - Dimensions: Browser version × OS
   - Metric: Error rate
   - Highlight: Problem areas

3. **Performance Budget Tracking**
   ```yaml
   Metrics vs Targets:
   - FCP: Current vs < 1.8s target
   - LCP: Current vs < 2.5s target  
   - TTI: Current vs < 3.8s target
   - CLS: Current vs < 0.1 target
   ```

## Custom Insights Configuration

### 1. Retention Analysis
```javascript
{
  insight: 'retention',
  events: [{
    id: 'generation_completed',
    name: 'Generated Portrait'
  }],
  date_range: 'last_12_weeks',
  retention_type: 'retention_first_time',
  breakdown_by: ['device_type', 'first_utm_source'],
  returning_event: 'session_started'
}
```

### 2. Lifecycle Analysis
```javascript
{
  insight: 'lifecycle',
  events: ['session_started'],
  date_range: 'last_30_days',
  shown_as: 'lifecycle_chart',
  breakdown_by: 'lead_grade',
  lifecycle_states: ['new', 'returning', 'resurrected', 'dormant']
}
```

### 3. Correlation Analysis
```javascript
{
  insight: 'correlation',
  success_event: 'result_downloaded',
  feature_flags: ['custom_prompt_used', 'multiple_styles_viewed'],
  properties: ['device_type', 'session_duration', 'network_quality'],
  exclude_properties: ['session_id', 'timestamp']
}
```

## A/B Testing Framework

### 1. Test Configuration Structure
```yaml
Test Name: "Wedding Style Randomization"
Hypothesis: "Showing different style sets will impact engagement"
Variants:
  control: Original 3 random styles
  variant_a: Top 3 most popular styles
  variant_b: Personalized based on upload
  
Metrics:
  primary: Conversion to download
  secondary: 
    - Generation completion rate
    - Styles per session
    - Time to conversion
    
Allocation: 33.3% each
Duration: 2 weeks minimum
```

### 2. Feature Flag Tests

#### Test Ideas with Measurement
```javascript
// Progressive Enhancement Test
{
  flag: 'progressive_image_loading',
  description: 'Test lazy loading impact on engagement',
  variants: {
    control: 'immediate_load',
    test: 'intersection_observer'
  },
  metrics: [
    'page_load_time',
    'bounce_rate',
    'images_viewed_per_session'
  ]
}

// Onboarding Flow Test
{
  flag: 'guided_onboarding',
  description: 'Test tutorial impact on conversion',
  variants: {
    control: 'no_tutorial',
    test: 'step_by_step_guide'
  },
  metrics: [
    'time_to_first_generation',
    'completion_rate',
    'error_rate'
  ]
}
```

### 3. Experiment Analysis Dashboard

#### Key Components
1. **Statistical Significance Calculator**
   - Sample size per variant
   - Conversion rates with confidence intervals
   - P-value and statistical power

2. **Segment Impact Analysis**
   - Performance by device type
   - New vs returning users
   - Geographic variations

3. **Time-based Analysis**
   - Hourly/daily patterns
   - Weekday vs weekend
   - Seasonal effects

## Alert Configuration

### 1. Business Alerts
```yaml
Lead Conversion Drop:
  metric: lead_conversion_rate
  condition: < 10% for 2 hours
  severity: high
  notify: product-team@company.com

API Cost Spike:
  metric: hourly_api_cost
  condition: > $50 per hour
  severity: critical
  notify: eng-team@company.com
```

### 2. Technical Alerts
```yaml
High Error Rate:
  metric: api_error_rate
  condition: > 5% for 10 minutes
  severity: high
  
Performance Degradation:
  metric: p95_generation_time
  condition: > 30 seconds
  severity: medium
```

## Dashboard Best Practices

### 1. Organization
- Group related insights together
- Use clear, descriptive names
- Add descriptions to complex queries
- Set appropriate refresh intervals

### 2. Visualization
- Choose appropriate chart types for data
- Use consistent color schemes
- Add context with annotations
- Include period comparisons

### 3. Performance
- Limit real-time queries
- Use sampling for large datasets
- Cache expensive calculations
- Optimize query complexity

### 4. Maintenance
- Review dashboard usage monthly
- Archive unused insights
- Update queries as schema evolves
- Document custom formulas