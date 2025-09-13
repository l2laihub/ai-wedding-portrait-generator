# PostHog Dashboard Setup Guide

This guide provides comprehensive instructions for setting up PostHog analytics dashboards for the AI Wedding Portrait Generator, including admin analytics and key performance indicators.

## Overview

The application tracks comprehensive analytics through PostHog, including:
- Generation counter metrics
- User engagement patterns
- Performance analytics
- Feature usage
- Conversion tracking

## Event Types Tracked

### Core Events
- `generation_counter_incremented` - Counter increment with metadata
- `generation_started` - Generation process initiation
- `generation_completed` - Generation process completion
- `generation_failed` - Generation process failure
- `style_generated` - Individual style generation tracking

### User Interaction Events
- `image_upload_started/completed/failed` - File upload tracking
- `style_viewed` - Style interaction tracking
- `image_downloaded` - Download behavior
- `prompt_modified` - Custom prompt usage
- `user_identified` - User identification for lead tracking

### Milestone Events
- `counter_milestone_reached` - Achievement tracking
- `user_engagement_metrics` - Engagement scoring

## Dashboard Setup Instructions

### 1. Main Analytics Dashboard

Create a dashboard called "AI Wedding Generator - Overview" with these insights:

#### Total Generations Counter
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "generation_counter_incremented",
      "name": "generation_counter_incremented",
      "type": "events",
      "order": 0
    }
  ],
  "display": "BoldNumber",
  "breakdown": null,
  "interval": "day",
  "date_from": "-30d"
}
```

#### Success Rate Trend
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "generation_counter_incremented",
      "name": "generation_counter_incremented",
      "type": "events",
      "order": 0
    }
  ],
  "display": "ActionsLineGraph",
  "breakdown": null,
  "interval": "day",
  "date_from": "-7d",
  "properties": [
    {
      "key": "successRate",
      "operator": "gt",
      "value": 0,
      "type": "event"
    }
  ]
}
```

#### Photo Type Distribution
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "generation_counter_incremented",
      "name": "generation_counter_incremented",
      "type": "events",
      "order": 0
    }
  ],
  "display": "ActionsPie",
  "breakdown": "photoType",
  "interval": "day",
  "date_from": "-30d"
}
```

### 2. User Engagement Dashboard

Create a dashboard called "User Engagement Analytics":

#### Daily Active Users
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "$pageview",
      "name": "$pageview",
      "type": "events",
      "order": 0
    }
  ],
  "display": "ActionsLineGraph",
  "breakdown": null,
  "interval": "day",
  "date_from": "-30d"
}
```

#### Engagement Score Distribution
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "user_engagement_metrics",
      "name": "user_engagement_metrics",
      "type": "events",
      "order": 0
    }
  ],
  "display": "WorldMap",
  "breakdown": "engagementScore",
  "interval": "day",
  "date_from": "-7d"
}
```

#### Custom Prompt Usage
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "generation_counter_incremented",
      "name": "Custom Prompts",
      "type": "events",
      "order": 0
    }
  ],
  "display": "ActionsPie",
  "breakdown": "hasCustomPrompt",
  "interval": "day",
  "date_from": "-30d",
  "properties": [
    {
      "key": "hasCustomPrompt",
      "operator": "exact",
      "value": true,
      "type": "event"
    }
  ]
}
```

### 3. Performance Monitoring Dashboard

Create a dashboard called "Performance & Errors":

#### Generation Success Rate
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "generation_completed",
      "name": "Successful Generations",
      "type": "events",
      "order": 0
    },
    {
      "id": "generation_failed",
      "name": "Failed Generations",
      "type": "events",
      "order": 1
    }
  ],
  "display": "ActionsLineGraph",
  "breakdown": null,
  "interval": "hour",
  "date_from": "-24h"
}
```

#### Average Generation Time
```json
{
  "insight_type": "TRENDS",
  "events": [
    {
      "id": "generation_completed",
      "name": "generation_completed",
      "type": "events",
      "order": 0
    }
  ],
  "display": "ActionsLineGraph",
  "breakdown": null,
  "interval": "hour",
  "date_from": "-24h",
  "math": "avg",
  "math_property": "duration"
}
```

### 4. Conversion Funnel

Create a funnel insight called "User Journey":

```json
{
  "insight_type": "FUNNELS",
  "events": [
    {
      "id": "$pageview",
      "name": "Page View",
      "type": "events",
      "order": 0
    },
    {
      "id": "image_upload_started",
      "name": "Started Upload",
      "type": "events",
      "order": 1
    },
    {
      "id": "generation_started",
      "name": "Started Generation",
      "type": "events",
      "order": 2
    },
    {
      "id": "generation_completed",
      "name": "Completed Generation",
      "type": "events",
      "order": 3
    },
    {
      "id": "image_downloaded",
      "name": "Downloaded Image",
      "type": "events",
      "order": 4
    }
  ],
  "funnel_window_days": 1
}
```

## Key Metrics to Monitor

### Admin Analytics KPIs

1. **Total Generations**: Total counter value
2. **Daily Active Users**: Unique users per day
3. **Success Rate**: Percentage of successful generations
4. **Average Session Duration**: Time spent in app
5. **Conversion Rate**: Upload → Generation → Download
6. **Photo Type Preferences**: Single vs Couple vs Family
7. **Custom Prompt Usage**: Percentage using custom prompts
8. **Milestone Achievements**: Counter milestone tracking

### Performance Metrics

1. **Generation Duration**: Average time per generation
2. **Error Rate**: Failed generations percentage
3. **Upload Success Rate**: File upload completion rate
4. **API Response Time**: Gemini API performance
5. **User Engagement Score**: Calculated engagement metric

### Business Intelligence

1. **User Retention**: Return user rate
2. **Feature Adoption**: New feature usage
3. **Geographic Distribution**: User locations
4. **Device/Browser Analysis**: Technical insights
5. **Peak Usage Times**: Traffic patterns

## Alert Configuration

### Critical Alerts (Immediate notification)
- Generation success rate drops below 80%
- API error rate exceeds 5%
- Daily active users drop by 50%

### Warning Alerts (Daily digest)
- Generation duration increases by 100%
- Upload failure rate exceeds 10%
- Unusual traffic spikes or drops

### Information Alerts (Weekly digest)
- New milestone achievements
- Feature usage trends
- Performance improvements

## Query Examples

### Most Popular Styles
```sql
SELECT 
  styles,
  COUNT(*) as generation_count
FROM events 
WHERE event = 'generation_counter_incremented'
AND timestamp >= now() - interval 30 day
GROUP BY styles
ORDER BY generation_count DESC
```

### User Engagement Analysis
```sql
SELECT 
  AVG(engagementScore) as avg_engagement,
  photoType,
  COUNT(*) as sessions
FROM events 
WHERE event = 'user_engagement_metrics'
AND timestamp >= now() - interval 7 day
GROUP BY photoType
ORDER BY avg_engagement DESC
```

### Success Rate by Photo Type
```sql
SELECT 
  photoType,
  AVG(successRate) as avg_success_rate,
  COUNT(*) as total_generations
FROM events 
WHERE event = 'generation_counter_incremented'
AND timestamp >= now() - interval 30 day
GROUP BY photoType
ORDER BY avg_success_rate DESC
```

## Custom Properties Reference

### Event Properties Available

#### `generation_counter_incremented`
- `generationId`: Unique generation identifier
- `totalGenerations`: Running total count
- `dailyGenerations`: Daily count
- `successfulStyles`: Number of successful styles
- `totalStyles`: Total styles attempted
- `successRate`: Success percentage (0-1)
- `photoType`: 'single', 'couple', 'family'
- `familyMemberCount`: Number for family photos
- `customPrompt`: Custom prompt text
- `styles`: Array of style names
- `hasCustomPrompt`: Boolean flag
- `isFullySuccessful`: Boolean flag
- `userAgent`: Browser info
- `screenWidth/screenHeight`: Device info
- `language`: Browser language
- `timezone`: User timezone

#### `counter_milestone_reached`
- `milestone`: Milestone number (1, 10, 50, etc.)
- `totalGenerations`: Total count at achievement
- `achievedAt`: Timestamp of achievement

#### `user_engagement_metrics`
- `sessionDuration`: Time spent in session
- `generationsInSession`: Generations per session
- `timeToFirstGeneration`: Time to first action
- `averageTimeBetweenGenerations`: Average gap
- `engagementScore`: Calculated score (0-100)

## Setup Checklist

- [ ] PostHog project created and configured
- [ ] API key properly set in environment
- [ ] All dashboards created as specified
- [ ] Alerts configured for critical metrics
- [ ] Team access configured for admin users
- [ ] Data retention policies set
- [ ] Backup/export procedures established
- [ ] Documentation shared with stakeholders

## Troubleshooting

### Events Not Appearing
1. Check API key configuration
2. Verify network connectivity
3. Check browser console for errors
4. Validate event properties format

### Dashboard Not Loading
1. Verify insight queries are valid
2. Check date ranges aren't too restrictive
3. Confirm event names match exactly
4. Test with simplified queries first

### Performance Issues
1. Optimize query date ranges
2. Use appropriate intervals
3. Consider data sampling for large datasets
4. Monitor PostHog rate limits

## Next Steps

1. Set up automated reporting
2. Create custom cohorts for user segmentation
3. Implement A/B testing for feature flags
4. Set up data export for external analysis
5. Create custom events for business-specific metrics

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Maintainer**: Development Team