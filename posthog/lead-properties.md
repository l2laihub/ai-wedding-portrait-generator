# PostHog User Properties Schema for Lead Tracking

## User Identification Strategy

### 1. Anonymous User Tracking
```javascript
// Generate anonymous ID on first visit
const getAnonymousId = () => {
  let anonId = localStorage.getItem('wedai_anon_id');
  if (!anonId) {
    anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('wedai_anon_id', anonId);
  }
  return anonId;
};

// Set anonymous user
posthog.identify(getAnonymousId());
```

### 2. Lead Capture Opportunities
- After first successful generation
- On download action
- When sharing results
- PWA installation

## Core User Properties

### 1. Demographic Properties
```javascript
{
  // Geographic
  "$geoip_city_name": "auto-captured",
  "$geoip_country_name": "auto-captured", 
  "$geoip_country_code": "auto-captured",
  "$geoip_region_name": "auto-captured",
  "$geoip_time_zone": "auto-captured",
  
  // Device & Browser
  "$device_type": "mobile" | "tablet" | "desktop",
  "$browser": "Chrome" | "Safari" | "Firefox" | etc,
  "$browser_version": string,
  "$os": "iOS" | "Android" | "Windows" | "macOS" | "Linux",
  "$os_version": string,
  
  // Language & Locale
  "language": "en-US" | "es-ES" | etc,
  "locale": string
}
```

### 2. Acquisition Properties
```javascript
{
  // First Touch Attribution
  "first_seen_at": datetime,
  "first_referrer": string,
  "first_utm_source": string,
  "first_utm_medium": string,
  "first_utm_campaign": string,
  "first_utm_content": string,
  "first_utm_term": string,
  "first_landing_page": string,
  
  // Signup/Lead Capture Context
  "lead_captured_at": datetime,
  "lead_capture_method": "download" | "share" | "pwa_install" | "email_signup",
  "lead_capture_context": {
    "images_generated": number,
    "styles_viewed": string[],
    "session_duration_min": number
  }
}
```

### 3. Behavioral Properties
```javascript
{
  // Usage Statistics
  "total_uploads": number,
  "total_generations": number,
  "successful_generations": number,
  "failed_generations": number,
  "total_downloads": number,
  "total_shares": number,
  
  // Engagement Metrics
  "last_seen_at": datetime,
  "total_sessions": number,
  "total_session_duration_min": number,
  "avg_session_duration_min": number,
  "days_since_first_seen": number,
  "days_since_last_seen": number,
  
  // Feature Usage
  "has_used_custom_prompt": boolean,
  "custom_prompts_count": number,
  "favorite_styles": string[], // Top 3 most used
  "features_used": string[], // List of all features tried
  
  // Quality Indicators
  "avg_generation_success_rate": number, // 0-1
  "has_multiple_sessions": boolean,
  "is_power_user": boolean, // 5+ generations
  "has_shared_results": boolean
}
```

### 4. Technical Properties
```javascript
{
  // Performance
  "avg_page_load_time_ms": number,
  "avg_generation_time_ms": number,
  "predominant_connection_type": "4g" | "3g" | "wifi" | etc,
  "has_slow_connection_issues": boolean,
  
  // PWA Status
  "pwa_installed": boolean,
  "pwa_install_date": datetime,
  "pwa_install_prompted_count": number,
  
  // Capabilities
  "supports_webgl": boolean,
  "supports_share_api": boolean,
  "supports_service_worker": boolean,
  "screen_resolution": string // "1920x1080"
}
```

### 5. Lead Scoring Properties
```javascript
{
  // Lead Score Components
  "lead_score": number, // 0-100
  "lead_score_components": {
    "engagement_score": number, // 0-40
    "quality_score": number, // 0-30
    "retention_score": number // 0-30
  },
  "lead_score_updated_at": datetime,
  
  // Lead Classification
  "lead_status": "visitor" | "prospect" | "qualified" | "hot",
  "lead_grade": "A" | "B" | "C" | "D",
  "predicted_ltv": number, // If implementing predictive analytics
  
  // Engagement Stage
  "lifecycle_stage": "visitor" | "lead" | "engaged" | "advocate",
  "funnel_stage": "awareness" | "interest" | "consideration" | "intent" | "evaluation" | "purchase"
}
```

### 6. Campaign & Marketing Properties
```javascript
{
  // Campaign Response
  "campaigns_engaged": string[],
  "last_campaign_engaged": string,
  "campaign_conversion": boolean,
  
  // Email Marketing (if implemented)
  "email_subscriber": boolean,
  "email_verified": boolean,
  "email_engagement_score": number,
  
  // Referral
  "referred_by_user_id": string,
  "referral_count": number,
  "referral_source": string
}
```

### 7. Custom Segment Properties
```javascript
{
  // Wedding Planning Stage (inferred)
  "wedding_planning_stage": "browsing" | "active_planning" | "final_prep",
  "estimated_wedding_timeframe": "0-3mo" | "3-6mo" | "6-12mo" | "12mo+",
  
  // User Intent
  "primary_use_case": "personal" | "professional" | "gift",
  "style_preference": "classic" | "modern" | "rustic" | "mixed",
  
  // Value Indicators
  "high_quality_user": boolean, // Multiple successful generations
  "potential_advocate": boolean, // High share rate
  "at_risk": boolean // Haven't returned in 30+ days
}
```

## User Property Update Triggers

### 1. On Session Start
```javascript
posthog.people.set({
  last_seen_at: new Date().toISOString(),
  total_sessions: posthog.get_property('total_sessions') + 1,
  days_since_last_seen: daysSince(posthog.get_property('last_seen_at'))
});
```

### 2. On Image Upload
```javascript
posthog.people.increment('total_uploads');
posthog.people.set_once({
  first_upload_at: new Date().toISOString()
});
```

### 3. On Generation Complete
```javascript
posthog.people.increment('total_generations');
posthog.people.increment(success ? 'successful_generations' : 'failed_generations');

// Update success rate
const totalGen = posthog.get_property('total_generations');
const successGen = posthog.get_property('successful_generations');
posthog.people.set({
  avg_generation_success_rate: successGen / totalGen
});

// Update lead score
updateLeadScore(userId);
```

### 4. On Download/Share
```javascript
posthog.people.increment(action === 'download' ? 'total_downloads' : 'total_shares');
posthog.people.set({
  has_shared_results: true,
  lead_status: 'qualified' // Upgrade lead status
});
```

## Lead Scoring Algorithm

```javascript
function calculateLeadScore(userProperties) {
  let score = 0;
  
  // Engagement Score (0-40)
  if (userProperties.total_uploads > 0) score += 10;
  if (userProperties.total_generations > 0) score += 15;
  if (userProperties.total_downloads > 0) score += 10;
  if (userProperties.total_shares > 0) score += 5;
  
  // Quality Score (0-30)
  if (userProperties.has_used_custom_prompt) score += 5;
  if (userProperties.total_generations > 2) score += 10;
  if (userProperties.avg_generation_success_rate > 0.8) score += 5;
  if (userProperties.pwa_installed) score += 10;
  
  // Retention Score (0-30)
  if (userProperties.has_multiple_sessions) score += 10;
  if (userProperties.avg_session_duration_min > 5) score += 10;
  if (userProperties.total_downloads >= 3) score += 10;
  
  // Determine grade
  let grade;
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else grade = 'D';
  
  return { score, grade };
}
```

## Privacy & Compliance

### 1. PII Handling
- Never store actual names or email addresses without explicit consent
- Use hashed identifiers for any PII
- Implement data retention policies (e.g., 24 months)

### 2. Consent Management
```javascript
{
  "consent_given": boolean,
  "consent_date": datetime,
  "consent_version": string,
  "marketing_consent": boolean,
  "analytics_consent": boolean
}
```

### 3. Data Rights
- Implement user data export functionality
- Support data deletion requests
- Maintain audit log of data changes

## User Property Best Practices

### 1. Update Frequency
- Real-time: Critical actions (downloads, shares)
- Batched: Aggregate metrics (averages, counts)
- Daily: Calculated scores and segments

### 2. Data Quality
- Validate all property values before setting
- Use consistent naming conventions
- Document all custom properties

### 3. Performance
- Limit property updates per session
- Use increment operations for counters
- Batch multiple updates together

### 4. Segmentation Strategy
- Create cohorts based on lead scores
- Build behavioral segments for targeting
- Track segment movement over time