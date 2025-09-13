# PostHog Integration Testing Guide

This guide provides step-by-step instructions to test and verify that the PostHog analytics integration is working correctly for tracking generation counter increments and admin analytics.

## Prerequisites

1. **PostHog Account**: Ensure you have a PostHog project set up
2. **API Key**: Valid PostHog API key (starts with `phc_`) in environment
3. **Development Environment**: Local app running with `npm run dev`

## Environment Setup Verification

### 1. Check Environment Configuration

Create or verify your `.env.local` file contains:
```bash
POSTHOG_API_KEY=phc_your_api_key_here
POSTHOG_API_HOST=https://app.posthog.com  # Optional, defaults to this
```

### 2. Verify Console Output

When starting the app, you should see:
```
Initializing PostHog analytics...
✅ PostHog analytics ready
```

If you see warnings:
- `⚠️ PostHog API key not found` - Add POSTHOG_API_KEY to .env.local
- `❌ Invalid PostHog API key format` - Check API key starts with "phc_"

## Testing Checklist

### Phase 1: Basic Integration Test

#### ✅ App Load Event
1. Open browser DevTools (F12) → Console tab
2. Load the application
3. **Expected**: See "PostHog analytics ready" message
4. **PostHog Event**: `app_loaded` should appear in PostHog Live Events

#### ✅ User Identification
1. Load the app (first time or clear localStorage)
2. Check localStorage for `wedai_user_id`
3. **PostHog Event**: `user_identified` with user properties

### Phase 2: Generation Counter Test

#### ✅ Counter Increment Tracking
1. Upload a test image (couple photo recommended)
2. Click "Generate Wedding Portraits"
3. Wait for generation to complete
4. **Expected Console Logs**:
   - "PostHog counter tracking" or similar success message
5. **PostHog Events Expected**:
   - `generation_started` with metadata
   - `generation_counter_incremented` with full properties
   - `generation_completed` with success/failure data
   - Multiple `style_generated` events (3 total)

#### ✅ Verify Counter Properties
Check that `generation_counter_incremented` event includes:
- `generationId`: Unique ID (format: gen_timestamp_random)
- `totalGenerations`: Running total count
- `dailyGenerations`: Daily count
- `successfulStyles`: Number (0-3)
- `totalStyles`: Should be 3
- `successRate`: Decimal between 0-1
- `photoType`: 'single', 'couple', or 'family'
- `styles`: Array of 3 wedding style names
- `hasCustomPrompt`: Boolean
- `isFullySuccessful`: Boolean
- `timestamp`: Current timestamp
- `userAgent`, `screenWidth`, `screenHeight`: Browser info

### Phase 3: Enhanced Features Test

#### ✅ Custom Prompt Tracking
1. Enter text in the "Custom prompt" field
2. Generate portraits
3. **PostHog Event**: `prompt_modified` when typing
4. **Enhanced Properties**: `generation_counter_incremented` should include:
   - `customPrompt`: The actual text
   - `hasCustomPrompt`: true
   - `customPromptLength`: Character count

#### ✅ Photo Type Variations
Test each photo type:

**Single Photo**:
1. Select "Single Person" photo type
2. Upload individual photo
3. Generate
4. **Verify**: `photoType: "single"` in events

**Family Photo**:
1. Select "Family" photo type  
2. Set family member count (e.g., 4)
3. Generate
4. **Verify**: `photoType: "family"`, `familyMemberCount: 4`

#### ✅ Milestone Tracking
1. Generate multiple portraits to trigger milestones
2. **Expected Events**: `counter_milestone_reached` at counts: 1, 10, 50, etc.
3. **Properties**: `milestone`, `totalGenerations`, `achievedAt`

### Phase 4: Error Handling Test

#### ✅ Network Errors
1. Disconnect internet during generation
2. **PostHog Event**: `generation_failed` with error details
3. Verify app continues working after reconnect

#### ✅ API Failures
1. Use invalid/expired Gemini API key
2. **PostHog Events**: 
   - `generation_failed` for overall failure
   - `style_generated` with `success: false` for each style

### Phase 5: Performance Tracking

#### ✅ Generation Duration
1. Complete successful generation
2. **Verify**: `generation_completed` event includes `duration` in milliseconds
3. **Verify**: Individual `style_generated` events have `duration`

#### ✅ User Engagement
1. Use app for extended session (multiple generations)
2. **PostHog Event**: `user_engagement_metrics` should be tracked
3. **Properties**: 
   - `sessionDuration`: Time in app
   - `generationsInSession`: Number of generations
   - `timeToFirstGeneration`: Time to first action
   - `engagementScore`: Calculated score (0-100)

## PostHog Dashboard Verification

### 1. Live Events Stream
1. In PostHog dashboard, go to **Events** → **Live Events**
2. Perform app actions while monitoring
3. **Expected**: Real-time events appearing as you use the app

### 2. Event Properties Inspection
1. Click on a `generation_counter_incremented` event
2. **Verify All Properties Present**:
   - Core: generationId, totalGenerations, photoType
   - Success: successfulStyles, totalStyles, successRate
   - Enhanced: styles array, custom prompt data
   - Context: user agent, screen info, timestamp

### 3. Data Consistency
1. Generate 5 test portraits
2. Query for `generation_counter_incremented` events
3. **Verify**:
   - Total count matches actual generations
   - Running totals increment correctly
   - No duplicate generationIds
   - All required properties present

## Troubleshooting

### Events Not Appearing in PostHog

**Check Console Errors**:
```javascript
// Open browser console and run:
posthog.capture('test_event', {test: true});
```

**Common Issues**:
1. **Invalid API Key**: Check format starts with "phc_"
2. **Network Blocks**: Check adblockers/corporate firewalls
3. **CORS Issues**: Verify PostHog domain is allowed
4. **Rate Limiting**: Check if too many events sent too quickly

### Incomplete Event Properties

**Debug Event Data**:
```javascript
// In browser console after generation:
console.log('Counter Service Metrics:', counterService.getMetrics());
console.log('PostHog Initialized:', posthogService.initialized);
```

**Common Issues**:
1. **Missing Properties**: Check service method implementations
2. **Type Mismatches**: Verify number vs string types
3. **Undefined Values**: Check for null/undefined property values

### Performance Issues

**Monitor Event Volume**:
```javascript
// Check rate limiting configuration
console.log('PostHog Config:', posthog.config);
```

**Rate Limit Settings**:
- Events burst limit: 10
- Events per second: 2
- These can be adjusted in posthogService.ts initialization

## Automated Testing Script

Create this test file for automated verification:

**File**: `test-posthog-integration.js`
```javascript
// Manual testing script - paste in browser console
async function testPostHogIntegration() {
  console.log('🧪 Testing PostHog Integration...');
  
  // Test 1: Service initialization
  if (typeof posthogService !== 'undefined') {
    console.log('✅ PostHog service available');
  } else {
    console.error('❌ PostHog service not found');
    return;
  }
  
  // Test 2: Event tracking
  posthogService.track('integration_test', {
    testId: `test_${Date.now()}`,
    userAgent: navigator.userAgent
  });
  console.log('✅ Test event sent');
  
  // Test 3: Counter service integration
  if (typeof counterService !== 'undefined') {
    const metrics = counterService.getMetrics();
    console.log('✅ Counter metrics:', metrics);
  }
  
  // Test 4: Milestone tracking
  posthogService.trackCounterMilestone(999, 999);
  console.log('✅ Milestone test event sent');
  
  console.log('🎉 Integration test complete - check PostHog Live Events');
}

// Run the test
testPostHogIntegration();
```

## Success Criteria

The PostHog integration is properly working when:

- ✅ All events appear in PostHog Live Events stream
- ✅ Event properties contain all expected metadata
- ✅ Counter increments track correctly with running totals
- ✅ Generation success/failure rates are accurate
- ✅ User engagement metrics are calculated properly
- ✅ Milestone achievements are tracked at correct thresholds
- ✅ Error handling works without breaking the app
- ✅ Performance tracking provides meaningful duration data
- ✅ Dashboard queries return expected results

## Production Deployment Checks

Before deploying to production:

1. **Environment Variables**: Ensure production PostHog key is set
2. **Rate Limiting**: Verify settings appropriate for expected traffic
3. **Data Retention**: Check PostHog plan limits and data retention
4. **Privacy Compliance**: Ensure tracking complies with privacy policy
5. **Performance Impact**: Monitor app performance with tracking enabled
6. **Dashboard Access**: Ensure admin users have PostHog dashboard access

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Maintainer**: Development Team