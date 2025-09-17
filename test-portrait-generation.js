#!/usr/bin/env node

/**
 * Comprehensive test suite for the portrait-generation Edge Function
 * Tests deployed function functionality, rate limiting, error handling, and response format
 */

import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  // Production Supabase URL from .env
  PRODUCTION_URL: 'https://ptgmobxrvptiahundusu.supabase.co',
  LOCAL_URL: 'http://127.0.0.1:54321',
  
  // Test timeouts
  TIMEOUT_MS: 30000,
  
  // Rate limit test parameters
  RATE_LIMIT_TESTS: {
    anonymous: { expected_hourly: 3, expected_daily: 3 },
    authenticated: { expected_hourly: 30, expected_daily: 100 },
    premium: { expected_hourly: 100, expected_daily: 500 }
  }
};

// Generate a simple test image in base64 format (1x1 pixel PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const TEST_IMAGE_TYPE = 'image/png';

// Test prompts and styles
const TEST_PROMPTS = [
  'Transform this into a beautiful wedding portrait with elegant lighting',
  'Create a romantic wedding photo with soft, dreamy atmosphere',
  'Generate a professional wedding portrait with classic composition'
];

const TEST_STYLES = [
  'Classic & Timeless',
  'Rustic Barn',
  'Bohemian Beach'
];

class PortraitGenerationTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    if (type === 'error') {
      this.errors.push({ timestamp, message });
    }
  }

  async makeRequest(url, payload, options = {}) {
    const requestUrl = `${url}/functions/v1/portrait-generation`;
    
    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeout || TEST_CONFIG.TIMEOUT_MS)
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { rawResponse: responseText };
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        url: requestUrl
      };
    } catch (error) {
      return {
        error: error.message,
        url: requestUrl,
        type: error.name
      };
    }
  }

  async testBasicFunctionality(baseUrl, environment = 'unknown') {
    this.log(`Testing basic functionality for ${environment} environment: ${baseUrl}`);
    
    const testPayload = {
      imageData: TEST_IMAGE_BASE64,
      imageType: TEST_IMAGE_TYPE,
      prompt: TEST_PROMPTS[0],
      style: TEST_STYLES[0],
      sessionId: `test-session-${Date.now()}`
    };

    const result = await this.makeRequest(baseUrl, testPayload);
    
    if (result.error) {
      this.log(`❌ Basic functionality test failed: ${result.error}`, 'error');
      return false;
    }

    this.log(`✓ Response status: ${result.status} ${result.statusText}`);
    this.log(`✓ Response headers: ${JSON.stringify(result.headers, null, 2)}`);
    
    if (result.status === 200) {
      this.log(`✅ Basic functionality test PASSED for ${environment}`);
      this.log(`✓ Response data structure: ${JSON.stringify(Object.keys(result.data || {}))}`);
      
      // Validate response format
      if (result.data && typeof result.data === 'object') {
        const expectedFields = ['success', 'data', 'style', 'processing_time_ms', 'rate_limit'];
        const missingFields = expectedFields.filter(field => !(field in result.data));
        
        if (missingFields.length === 0) {
          this.log(`✅ Response format validation PASSED - all expected fields present`);
        } else {
          this.log(`⚠️ Response format validation WARNING - missing fields: ${missingFields.join(', ')}`);
        }
      }
      
      return true;
    } else {
      this.log(`❌ Basic functionality test FAILED with status ${result.status}`, 'error');
      this.log(`Error details: ${JSON.stringify(result.data, null, 2)}`);
      return false;
    }
  }

  async testRateLimiting(baseUrl, environment = 'unknown') {
    this.log(`Testing rate limiting for ${environment} environment`);
    
    const sessionId = `rate-limit-test-${Date.now()}`;
    let successCount = 0;
    let rateLimitHit = false;
    
    // Make multiple requests quickly to test rate limiting
    for (let i = 0; i < 5; i++) {
      this.log(`Making rate limit test request ${i + 1}/5`);
      
      const testPayload = {
        imageData: TEST_IMAGE_BASE64,
        imageType: TEST_IMAGE_TYPE,
        prompt: `Rate limit test request ${i + 1}`,
        style: TEST_STYLES[i % TEST_STYLES.length],
        sessionId: sessionId
      };

      const result = await this.makeRequest(baseUrl, testPayload);
      
      if (result.status === 200) {
        successCount++;
        this.log(`✓ Request ${i + 1} succeeded`);
        
        // Log rate limit information if available
        if (result.data && result.data.rate_limit) {
          this.log(`✓ Rate limit info: hourly_remaining=${result.data.rate_limit.hourly_remaining}, daily_remaining=${result.data.rate_limit.daily_remaining}`);
        }
      } else if (result.status === 429) {
        this.log(`✓ Rate limit hit on request ${i + 1} (expected behavior)`);
        rateLimitHit = true;
        
        if (result.data && result.data.rate_limit) {
          this.log(`✓ Rate limit details: ${JSON.stringify(result.data.rate_limit, null, 2)}`);
        }
        break;
      } else {
        this.log(`⚠️ Unexpected response on request ${i + 1}: ${result.status} - ${JSON.stringify(result.data)}`, 'error');
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (successCount > 0) {
      this.log(`✅ Rate limiting test PASSED - ${successCount} requests succeeded before limit`);
      if (rateLimitHit) {
        this.log(`✅ Rate limiting properly enforced after ${successCount} requests`);
      }
      return true;
    } else {
      this.log(`❌ Rate limiting test FAILED - no requests succeeded`, 'error');
      return false;
    }
  }

  async testErrorHandling(baseUrl, environment = 'unknown') {
    this.log(`Testing error handling for ${environment} environment`);
    
    const errorTests = [
      {
        name: 'Missing required fields',
        payload: { prompt: 'test' }, // Missing imageData, imageType, style
        expectedStatus: 400
      },
      {
        name: 'Invalid image data',
        payload: {
          imageData: 'invalid-base64-data',
          imageType: TEST_IMAGE_TYPE,
          prompt: TEST_PROMPTS[0],
          style: TEST_STYLES[0]
        },
        expectedStatus: [400, 500] // Could be either depending on where validation fails
      },
      {
        name: 'Empty prompt',
        payload: {
          imageData: TEST_IMAGE_BASE64,
          imageType: TEST_IMAGE_TYPE,
          prompt: '',
          style: TEST_STYLES[0]
        },
        expectedStatus: [400, 500]
      },
      {
        name: 'Invalid API key',
        payload: {
          imageData: TEST_IMAGE_BASE64,
          imageType: TEST_IMAGE_TYPE,
          prompt: TEST_PROMPTS[0],
          style: TEST_STYLES[0],
          apiKey: 'invalid-api-key'
        },
        expectedStatus: 401
      }
    ];

    let passedTests = 0;
    
    for (const test of errorTests) {
      this.log(`Running error test: ${test.name}`);
      
      const result = await this.makeRequest(baseUrl, test.payload);
      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      
      if (expectedStatuses.includes(result.status)) {
        this.log(`✅ Error test "${test.name}" PASSED - got expected status ${result.status}`);
        passedTests++;
      } else {
        this.log(`❌ Error test "${test.name}" FAILED - expected status ${test.expectedStatus}, got ${result.status}`, 'error');
        this.log(`Response: ${JSON.stringify(result.data, null, 2)}`);
      }
    }
    
    const allPassed = passedTests === errorTests.length;
    this.log(`${allPassed ? '✅' : '❌'} Error handling tests: ${passedTests}/${errorTests.length} passed`);
    return allPassed;
  }

  async testCORS(baseUrl, environment = 'unknown') {
    this.log(`Testing CORS headers for ${environment} environment`);
    
    // Test OPTIONS request
    const requestUrl = `${baseUrl}/functions/v1/portrait-generation`;
    
    try {
      const optionsResponse = await fetch(requestUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': optionsResponse.headers.get('access-control-allow-headers')
      };
      
      this.log(`✓ CORS preflight response status: ${optionsResponse.status}`);
      this.log(`✓ CORS headers: ${JSON.stringify(corsHeaders, null, 2)}`);
      
      if (optionsResponse.status === 200 && corsHeaders['access-control-allow-origin']) {
        this.log(`✅ CORS test PASSED for ${environment}`);
        return true;
      } else {
        this.log(`❌ CORS test FAILED for ${environment}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ CORS test ERROR for ${environment}: ${error.message}`, 'error');
      return false;
    }
  }

  async testResponseFormat(baseUrl, environment = 'unknown') {
    this.log(`Testing response format validation for ${environment} environment`);
    
    const testPayload = {
      imageData: TEST_IMAGE_BASE64,
      imageType: TEST_IMAGE_TYPE,
      prompt: TEST_PROMPTS[1],
      style: TEST_STYLES[1],
      userId: 'test-user-123',
      sessionId: `format-test-${Date.now()}`
    };

    const result = await this.makeRequest(baseUrl, testPayload);
    
    if (result.status !== 200) {
      this.log(`⚠️ Response format test skipped - request failed with status ${result.status}`);
      return false;
    }

    const data = result.data;
    const validationResults = [];

    // Check required fields
    const requiredFields = ['success', 'data', 'style', 'processing_time_ms', 'rate_limit'];
    requiredFields.forEach(field => {
      if (field in data) {
        validationResults.push(`✅ Has required field: ${field}`);
      } else {
        validationResults.push(`❌ Missing required field: ${field}`);
      }
    });

    // Check data structure
    if (data.data && typeof data.data === 'object') {
      const dataFields = ['imageUrl', 'text'];
      dataFields.forEach(field => {
        if (field in data.data) {
          validationResults.push(`✅ Data has field: ${field}`);
        } else {
          validationResults.push(`⚠️ Data missing field: ${field}`);
        }
      });
    }

    // Check rate limit structure
    if (data.rate_limit && typeof data.rate_limit === 'object') {
      const rateLimitFields = ['hourly_remaining', 'daily_remaining', 'reset_at'];
      rateLimitFields.forEach(field => {
        if (field in data.rate_limit) {
          validationResults.push(`✅ Rate limit has field: ${field}`);
        } else {
          validationResults.push(`⚠️ Rate limit missing field: ${field}`);
        }
      });
    }

    validationResults.forEach(result => this.log(result));

    const passed = validationResults.filter(r => r.startsWith('✅')).length;
    const total = validationResults.length;
    
    this.log(`${passed >= total * 0.8 ? '✅' : '❌'} Response format validation: ${passed}/${total} checks passed`);
    return passed >= total * 0.8;
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive portrait generation Edge Function tests');
    this.log('=' .repeat(70));
    
    const environments = [
      { name: 'Production', url: TEST_CONFIG.PRODUCTION_URL },
      { name: 'Local', url: TEST_CONFIG.LOCAL_URL }
    ];
    
    const results = {};
    
    for (const env of environments) {
      this.log(`\n🧪 Testing ${env.name} environment: ${env.url}`);
      this.log('-'.repeat(50));
      
      const envResults = {
        basic: false,
        rateLimiting: false,
        errorHandling: false,
        cors: false,
        responseFormat: false
      };
      
      // Test basic functionality
      envResults.basic = await this.testBasicFunctionality(env.url, env.name);
      
      // Test rate limiting (only if basic functionality works)
      if (envResults.basic) {
        envResults.rateLimiting = await this.testRateLimiting(env.url, env.name);
        envResults.responseFormat = await this.testResponseFormat(env.url, env.name);
      } else {
        this.log(`⚠️ Skipping rate limiting test due to basic functionality failure`);
        this.log(`⚠️ Skipping response format test due to basic functionality failure`);
      }
      
      // Test error handling
      envResults.errorHandling = await this.testErrorHandling(env.url, env.name);
      
      // Test CORS
      envResults.cors = await this.testCORS(env.url, env.name);
      
      results[env.name] = envResults;
    }
    
    // Print summary
    this.log('\n📊 TEST SUMMARY');
    this.log('=' .repeat(70));
    
    for (const [envName, envResults] of Object.entries(results)) {
      this.log(`\n${envName} Environment:`);
      for (const [testName, passed] of Object.entries(envResults)) {
        const icon = passed ? '✅' : '❌';
        this.log(`  ${icon} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
      }
      
      const passedCount = Object.values(envResults).filter(Boolean).length;
      const totalCount = Object.values(envResults).length;
      const percentage = Math.round((passedCount / totalCount) * 100);
      
      this.log(`  📈 Overall: ${passedCount}/${totalCount} tests passed (${percentage}%)`);
    }
    
    if (this.errors.length > 0) {
      this.log('\n🚨 ERRORS ENCOUNTERED:');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. [${error.timestamp}] ${error.message}`);
      });
    }
    
    this.log('\n🏁 Testing complete!');
    
    return results;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PortraitGenerationTester();
  tester.runAllTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

export default PortraitGenerationTester;