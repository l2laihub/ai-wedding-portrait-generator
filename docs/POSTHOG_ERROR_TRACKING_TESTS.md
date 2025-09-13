# PostHog Error Tracking Test Scenarios

## Overview
This document provides comprehensive test scenarios for validating PostHog error tracking, ensuring robust error handling and proper fallback mechanisms.

## 1. Network-Related Error Scenarios

### Test 1.1: Complete Network Failure
**Scenario:** User loses internet connection during app usage

```javascript
const testNetworkFailure = async () => {
  // Setup
  await navigateToApp();
  await waitForAppReady();
  
  // Simulate network failure
  await setNetworkConditions('offline');
  
  // Try to send events
  posthog.capture('test_event', { data: 'test' });
  
  // Expected behavior
  const expectations = {
    eventQueued: true,        // Event should be queued locally
    noErrorThrown: true,      // Should not throw errors
    appFunctional: true,      // App should continue working
    retryOnReconnect: true    // Should retry when online
  };
  
  // Go back online
  await setNetworkConditions('online');
  
  // Verify retry behavior
  await waitForQueueFlush();
  
  return validateExpectations(expectations);
};
```

**Validation Checklist:**
- [ ] Events queued in local storage/memory
- [ ] No JavaScript errors in console
- [ ] App remains functional
- [ ] Automatic retry when connection restored
- [ ] No data loss

### Test 1.2: PostHog Service Unavailable (5xx Errors)
**Scenario:** PostHog API returns server errors

```javascript
const testServerErrors = async () => {
  // Mock server error responses
  mockNetworkResponses({
    'api/v1/capture': { status: 503, body: 'Service Unavailable' },
    'api/v1/batch': { status: 500, body: 'Internal Server Error' }
  });
  
  // Send events
  posthog.capture('server_error_test');
  
  // Expected behavior
  const expectations = {
    exponentialBackoff: true,  // Should implement backoff strategy
    maxRetries: 3,            // Should not retry infinitely
    eventualSuccess: false,    // Should eventually give up
    gracefulDegradation: true  // App should continue working
  };
  
  return validateExpectations(expectations);
};
```

**Validation Checklist:**
- [ ] Exponential backoff implemented
- [ ] Maximum retry limit respected
- [ ] Failed events logged appropriately
- [ ] App performance not affected
- [ ] User experience not degraded

### Test 1.3: Network Timeout
**Scenario:** PostHog requests timeout

```javascript
const testNetworkTimeout = async () => {
  // Simulate slow network with timeouts
  mockSlowNetwork({ timeout: 30000 }); // 30 second delay
  
  posthog.capture('timeout_test');
  
  // Wait for timeout
  await waitForTimeout();
  
  // Expected behavior
  const expectations = {
    requestCancelled: true,    // Should cancel after timeout
    retryScheduled: true,      // Should schedule retry
    noMemoryLeak: true,       // Should clean up resources
    userNotified: false       // Should not show error to user
  };
  
  return validateExpectations(expectations);
};
```

### Test 1.4: Rate Limiting (429 Errors)
**Scenario:** PostHog API rate limits requests

```javascript
const testRateLimiting = async () => {
  // Mock rate limiting response
  mockNetworkResponses({
    'api/v1/capture': { 
      status: 429, 
      headers: { 'Retry-After': '60' },
      body: 'Too Many Requests'
    }
  });
  
  // Send multiple events rapidly
  for (let i = 0; i < 100; i++) {
    posthog.capture('rate_limit_test', { index: i });
  }
  
  // Expected behavior
  const expectations = {
    respectRetryAfter: true,   // Should honor Retry-After header
    backoffStrategy: true,     // Should implement backoff
    eventPreservation: true,   // Should preserve all events
    noSpamming: true          // Should not spam the API
  };
  
  return validateExpectations(expectations);
};
```

## 2. Configuration Error Scenarios

### Test 2.1: Invalid API Key
**Scenario:** PostHog initialized with invalid API key

```javascript
const testInvalidAPIKey = async () => {
  // Initialize with invalid key
  posthog.init('invalid-key-123');
  
  // Try to send events
  posthog.capture('invalid_key_test');
  
  // Expected behavior
  const expectations = {
    authErrorHandled: true,    // Should handle 401 errors gracefully
    noRetryOnAuth: true,       // Should not retry auth failures
    errorLogged: true,         // Should log configuration error
    appFunctional: true        // App should continue working
  };
  
  return validateExpectations(expectations);
};
```

**Validation Checklist:**
- [ ] 401 errors handled gracefully
- [ ] No infinite retry loops
- [ ] Clear error messages in development
- [ ] Silent failure in production
- [ ] App remains functional

### Test 2.2: Malformed Configuration
**Scenario:** PostHog initialized with malformed config

```javascript
const testMalformedConfig = async () => {
  // Test various malformed configurations
  const malformedConfigs = [
    null,
    undefined,
    { api_host: 'not-a-url' },
    { persistence: 'invalid-storage-type' },
    { batch_size: -1 }
  ];
  
  for (const config of malformedConfigs) {
    try {
      posthog.init('valid-key', config);
      // Should handle gracefully or throw meaningful error
    } catch (error) {
      // Validate error handling
      validateConfigurationError(error, config);
    }
  }
};
```

### Test 2.3: Missing Environment Variables
**Scenario:** Required environment variables are missing

```javascript
const testMissingEnvVars = async () => {
  // Remove API key from environment
  delete process.env.POSTHOG_API_KEY;
  
  // Try to initialize
  try {
    posthog.init(process.env.POSTHOG_API_KEY);
  } catch (error) {
    // Should provide clear error message
    validateEnvironmentError(error);
  }
  
  // Expected behavior
  const expectations = {
    clearErrorMessage: true,   // Should explain missing config
    noTracking: true,         // Should disable tracking
    appFunctional: true,      // App should still work
    developmentWarning: true   // Should warn in development
  };
  
  return validateExpectations(expectations);
};
```

## 3. Data Validation Error Scenarios

### Test 3.1: Invalid Event Data
**Scenario:** Sending malformed event data to PostHog

```javascript
const testInvalidEventData = async () => {
  const invalidEvents = [
    // Circular references
    { circular: {} },
    // Functions (should be filtered out)
    { callback: () => {} },
    // Very large strings
    { bigData: 'x'.repeat(10000000) },
    // Invalid characters
    { badChars: '\x00\x01\x02' },
    // Undefined values
    { undefinedProp: undefined }
  ];
  
  invalidEvents[0].circular.self = invalidEvents[0];
  
  for (const eventData of invalidEvents) {
    try {
      posthog.capture('invalid_data_test', eventData);
      // Should sanitize or reject invalid data
    } catch (error) {
      validateDataError(error, eventData);
    }
  }
};
```

**Validation Checklist:**
- [ ] Circular references handled
- [ ] Functions filtered out
- [ ] Large data truncated
- [ ] Invalid characters escaped
- [ ] Undefined values handled

### Test 3.2: Oversized Payloads
**Scenario:** Event payload exceeds size limits

```javascript
const testOversizedPayloads = async () => {
  // Create oversized event
  const largeData = {
    hugeProp: 'x'.repeat(1000000), // 1MB string
    manyProps: {}
  };
  
  // Add many properties
  for (let i = 0; i < 10000; i++) {
    largeData.manyProps[`prop_${i}`] = `value_${i}`;
  }
  
  posthog.capture('oversized_test', largeData);
  
  // Expected behavior
  const expectations = {
    dataTruncated: true,      // Should truncate large data
    sizeWarning: true,        // Should warn about size
    requestSucceeds: true,    // Should still send truncated version
    performanceOK: true       // Should not impact performance
  };
  
  return validateExpectations(expectations);
};
```

### Test 3.3: Special Characters and Encoding
**Scenario:** Events contain special characters and Unicode

```javascript
const testSpecialCharacters = async () => {
  const specialChars = {
    unicode: '🎉🎊💖👰🤵',
    emoji: '😀😁😂🤣😃',
    accents: 'café résumé naïve',
    symbols: '&<>"\'\0\n\r\t',
    html: '<script>alert("test")</script>',
    sql: "'; DROP TABLE users; --"
  };
  
  posthog.capture('special_chars_test', specialChars);
  
  // Expected behavior
  const expectations = {
    properEncoding: true,     // Should encode properly
    noXSS: true,             // Should prevent XSS
    noSQLInjection: true,    // Should prevent SQL injection
    dataIntegrity: true      // Should preserve safe characters
  };
  
  return validateExpectations(expectations);
};
```

## 4. Browser Compatibility Error Scenarios

### Test 4.1: Unsupported Browsers
**Scenario:** App runs in browsers without modern features

```javascript
const testUnsupportedBrowsers = async () => {
  // Mock old browser environment
  mockOldBrowser({
    noLocalStorage: true,
    noFetch: true,
    noPromises: true,
    noJSON: false
  });
  
  // Try to initialize PostHog
  posthog.init('test-key');
  
  // Expected behavior
  const expectations = {
    gracefulFallback: true,   // Should fallback to alternatives
    noErrors: true,          // Should not throw errors
    reducedFunctionality: true, // May have reduced features
    appWorks: true           // Core app should still work
  };
  
  return validateExpectations(expectations);
};
```

**Validation Checklist:**
- [ ] localStorage fallback for cookies
- [ ] XMLHttpRequest fallback for fetch
- [ ] Promise polyfill or callback-based API
- [ ] JSON parsing fallback

### Test 4.2: Content Security Policy (CSP) Violations
**Scenario:** Strict CSP prevents PostHog functionality

```javascript
const testCSPViolations = async () => {
  // Set strict CSP headers
  setCSPHeaders({
    'connect-src': "'self'",           // Blocks PostHog API
    'script-src': "'self'",            // Blocks inline scripts
    'style-src': "'self'"              // Blocks inline styles
  });
  
  posthog.init('test-key');
  posthog.capture('csp_test');
  
  // Expected behavior
  const expectations = {
    cspErrorHandled: true,    // Should handle CSP violations
    alternativeMethod: true,  // Should try alternative approaches
    noConsoleErrors: false,   // CSP errors may appear in console
    appFunctional: true       // App should continue working
  };
  
  return validateExpectations(expectations);
};
```

### Test 4.3: Ad Blockers and Privacy Tools
**Scenario:** Browser has ad blockers or privacy tools enabled

```javascript
const testAdBlockers = async () => {
  // Mock ad blocker behavior
  mockAdBlocker({
    blockAnalytics: true,
    blockTracking: true,
    blockCookies: true
  });
  
  posthog.init('test-key');
  posthog.capture('adblock_test');
  
  // Expected behavior
  const expectations = {
    detectionMechanism: true, // Should detect ad blocker
    gracefulDegradation: true, // Should degrade gracefully
    respectPrivacy: true,     // Should respect user choice
    noErrors: true           // Should not throw errors
  };
  
  return validateExpectations(expectations);
};
```

## 5. Application-Specific Error Scenarios

### Test 5.1: Gemini API Failures
**Scenario:** AI service fails, affecting analytics

```javascript
const testGeminiAPIFailure = async () => {
  // Upload image
  await uploadTestImage();
  
  // Mock Gemini API failure
  mockGeminiAPI({ status: 500, body: 'Service Error' });
  
  // Trigger generation
  await clickGenerate();
  
  // Expected analytics behavior
  const expectations = {
    errorEventTracked: true,  // Should track the error
    errorDetailsIncluded: false, // Should not include sensitive details
    userFlowTracked: true,    // Should track user flow despite error
    noAnalyticsErrors: true   // Analytics should not fail
  };
  
  return validateExpectations(expectations);
};
```

### Test 5.2: Image Processing Errors
**Scenario:** Image upload or processing fails

```javascript
const testImageProcessingErrors = async () => {
  const errorScenarios = [
    { type: 'oversized', file: createLargeImageFile(50000000) }, // 50MB
    { type: 'invalid', file: createTextFile('not-an-image.txt') },
    { type: 'corrupted', file: createCorruptedImageFile() },
    { type: 'unsupported', file: createRAWImageFile() }
  ];
  
  for (const scenario of errorScenarios) {
    try {
      await uploadImage(scenario.file);
    } catch (error) {
      // Verify analytics tracking of errors
      validateErrorTracking(error, scenario.type);
    }
  }
};
```

## 6. Performance Under Error Conditions

### Test 6.1: Memory Leaks During Errors
**Scenario:** Repeated errors causing memory issues

```javascript
const testMemoryLeaksOnErrors = async () => {
  const initialMemory = performance.memory.usedJSHeapSize;
  
  // Generate many errors
  for (let i = 0; i < 1000; i++) {
    try {
      posthog.capture('error_test', { iteration: i });
      // Simulate network error
      throw new Error('Simulated network error');
    } catch (error) {
      // PostHog should handle this gracefully
    }
  }
  
  // Force garbage collection (if available)
  if (window.gc) window.gc();
  
  const finalMemory = performance.memory.usedJSHeapSize;
  const memoryIncrease = finalMemory - initialMemory;
  
  // Validate no significant memory leak
  const expectations = {
    memoryIncrease: memoryIncrease < 10000000, // Less than 10MB
    noEventAccumulation: true, // Should not accumulate failed events
    cleanupWorking: true       // Cleanup mechanisms working
  };
  
  return validateExpectations(expectations);
};
```

### Test 6.2: CPU Usage During Error Recovery
**Scenario:** Error recovery mechanisms don't consume excessive CPU

```javascript
const testCPUUsageDuringErrors = async () => {
  // Monitor CPU usage
  const cpuMonitor = new CPUUsageMonitor();
  cpuMonitor.start();
  
  // Simulate frequent errors
  const errorInterval = setInterval(() => {
    posthog.capture('cpu_error_test');
    // Simulate network error
    mockNetworkError();
  }, 100); // Every 100ms
  
  // Run for 10 seconds
  await sleep(10000);
  clearInterval(errorInterval);
  
  const cpuUsage = cpuMonitor.getAverageUsage();
  
  // CPU usage should remain reasonable
  const expectations = {
    averageCPU: cpuUsage < 50,  // Less than 50% CPU usage
    noCPUSpikes: true,          // No sustained high usage
    efficientRetry: true        // Retry mechanisms are efficient
  };
  
  return validateExpectations(expectations);
};
```

## 7. Edge Case Scenarios

### Test 7.1: App in Background/Inactive
**Scenario:** App becomes inactive during event processing

```javascript
const testBackgroundBehavior = async () => {
  // Send events
  posthog.capture('before_background');
  
  // Simulate app going to background
  document.dispatchEvent(new Event('visibilitychange'));
  Object.defineProperty(document, 'hidden', { value: true });
  
  // Try to send more events
  posthog.capture('during_background');
  
  // Bring app back to foreground
  Object.defineProperty(document, 'hidden', { value: false });
  document.dispatchEvent(new Event('visibilitychange'));
  
  posthog.capture('after_foreground');
  
  // Expected behavior
  const expectations = {
    pausedInBackground: true,  // Should pause/reduce activity
    queuedEvents: true,       // Should queue events
    resumedOnForeground: true, // Should resume on foreground
    noBatteryDrain: true      // Should be battery efficient
  };
  
  return validateExpectations(expectations);
};
```

### Test 7.2: Multiple Tab Scenarios
**Scenario:** Multiple tabs of the app open simultaneously

```javascript
const testMultipleTabsBehavior = async () => {
  // Open multiple tabs
  const tabs = await openMultipleTabs(3);
  
  // Send events from different tabs
  for (let i = 0; i < tabs.length; i++) {
    await tabs[i].executeScript(() => {
      posthog.capture('multi_tab_test', { tab: i });
    });
  }
  
  // Expected behavior
  const expectations = {
    distinctUsers: true,      // Should handle user identification
    noDataMixing: true,       // Should not mix data between tabs
    efficientBatching: true,  // Should batch efficiently
    noDuplication: true       // Should not duplicate events
  };
  
  return validateExpectations(expectations);
};
```

## 8. Error Recovery Testing

### Test 8.1: Service Recovery
**Scenario:** PostHog service comes back online after outage

```javascript
const testServiceRecovery = async () => {
  // Queue events during outage
  mockServiceOutage();
  
  const queuedEvents = [];
  for (let i = 0; i < 50; i++) {
    posthog.capture('queued_event', { index: i });
    queuedEvents.push(i);
  }
  
  // Service comes back online
  restoreService();
  
  // Wait for queue processing
  await waitForQueueFlush();
  
  // Verify all events were sent
  const expectations = {
    allEventsSent: true,      // All queued events sent
    correctOrder: true,       // Events sent in correct order
    noDuplicates: true,       // No duplicate events
    performanceOK: true       // Recovery doesn't impact performance
  };
  
  return validateExpectations(expectations);
};
```

## 9. Testing Utilities

### Error Simulation Helpers
```javascript
class ErrorSimulator {
  static simulateNetworkError(type) {
    const errorTypes = {
      timeout: () => new Error('Network timeout'),
      refused: () => new Error('Connection refused'),
      dns: () => new Error('DNS resolution failed')
    };
    
    return errorTypes[type] || errorTypes.timeout();
  }
  
  static mockServiceResponse(status, body) {
    // Mock network response
    return { status, body };
  }
  
  static corruptLocalStorage() {
    // Corrupt localStorage to test recovery
    localStorage.setItem('posthog', 'invalid-json{');
  }
}
```

### Validation Helpers
```javascript
class TestValidator {
  static validateEventQueue(expectedCount) {
    // Check if events are properly queued
    const queue = posthog.get_queue();
    return queue.length === expectedCount;
  }
  
  static validateNoConsoleErrors() {
    // Check console for errors
    const errors = console._errors || [];
    return errors.length === 0;
  }
  
  static validateMemoryUsage(threshold) {
    // Check memory usage is within threshold
    const usage = performance.memory.usedJSHeapSize;
    return usage < threshold;
  }
}
```

## 10. Test Execution Checklist

### Pre-Test Setup
- [ ] Clear browser cache and storage
- [ ] Reset PostHog configuration
- [ ] Prepare test data and mocks
- [ ] Set up monitoring tools

### During Testing
- [ ] Monitor browser console for errors
- [ ] Check network requests and responses
- [ ] Observe app behavior and performance
- [ ] Document any unexpected behavior

### Post-Test Validation
- [ ] Verify all test scenarios completed
- [ ] Check for memory leaks
- [ ] Validate error handling worked correctly
- [ ] Review performance impact
- [ ] Document issues and recommendations