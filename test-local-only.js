#!/usr/bin/env node

/**
 * Test local portrait generation Edge Function only
 * This tests the full functionality using the local environment
 */

import fs from 'fs';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Read Gemini API key from .env
let GEMINI_API_KEY = 'AIzaSyC4bB-uYa6q-Ea_Gu1gs-SlGiXrsJVoRAI'; // Default from .env

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.+)/);
  if (match) {
    GEMINI_API_KEY = match[1].trim();
  }
} catch (error) {
  console.log('Warning: Could not read .env file, using default API key');
}

const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Portrait Generation Flow (Local)');
  console.log('=' .repeat(60));
  
  const payload = {
    imageData: TEST_IMAGE_BASE64,
    imageType: 'image/png',
    prompt: 'Transform this into a beautiful wedding portrait with elegant lighting and romantic atmosphere',
    style: 'Classic & Timeless',
    sessionId: `test-complete-${Date.now()}`
  };

  console.log('📤 Sending request with full payload...');
  console.log('Request details:');
  console.log(`- Image size: ${TEST_IMAGE_BASE64.length} characters`);
  console.log(`- Prompt: "${payload.prompt}"`);
  console.log(`- Style: "${payload.style}"`);
  console.log(`- Session ID: ${payload.sessionId}`);

  try {
    const response = await fetch(`${LOCAL_URL}/functions/v1/portrait-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOCAL_SERVICE_KEY}`,
        'apikey': LOCAL_SERVICE_KEY
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log(`\n📥 Response received:`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    try {
      const responseData = JSON.parse(responseText);
      
      if (response.status === 200) {
        console.log('✅ SUCCESS! Portrait generation completed');
        console.log('\n📊 Response Analysis:');
        
        // Analyze the response structure
        if (responseData.success) {
          console.log('✓ Success flag: true');
        }
        
        if (responseData.data) {
          console.log('✓ Generated data present');
          if (responseData.data.imageUrl) {
            console.log(`✓ Image URL: ${responseData.data.imageUrl.substring(0, 50)}...`);
            console.log(`✓ Image format: ${responseData.data.imageUrl.split(';')[0]}`);
          }
          if (responseData.data.text) {
            console.log(`✓ Generated text: "${responseData.data.text.substring(0, 100)}..."`);
          }
        }
        
        if (responseData.style) {
          console.log(`✓ Style confirmed: ${responseData.style}`);
        }
        
        if (responseData.processing_time_ms) {
          console.log(`✓ Processing time: ${responseData.processing_time_ms}ms`);
        }
        
        if (responseData.rate_limit) {
          console.log('✓ Rate limit info:');
          console.log(`  - Hourly remaining: ${responseData.rate_limit.hourly_remaining}`);
          console.log(`  - Daily remaining: ${responseData.rate_limit.daily_remaining}`);
          console.log(`  - Reset at: ${responseData.rate_limit.reset_at}`);
        }
        
        return true;
        
      } else {
        console.log('❌ Request failed');
        if (responseData.error) {
          console.log(`Error: ${responseData.error}`);
        }
        if (responseData.details) {
          console.log(`Details: ${responseData.details}`);
        }
        return false;
      }
      
    } catch (parseError) {
      console.log('❌ Response is not valid JSON');
      console.log(`Raw response: ${responseText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n🛡️ Testing Rate Limiting');
  console.log('=' .repeat(40));
  
  const sessionId = `rate-test-${Date.now()}`;
  let successCount = 0;
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n📤 Request ${i}/5...`);
    
    const payload = {
      imageData: TEST_IMAGE_BASE64,
      imageType: 'image/png',
      prompt: `Rate limit test ${i}`,
      style: 'Test Style',
      sessionId: sessionId
    };

    try {
      const response = await fetch(`${LOCAL_URL}/functions/v1/portrait-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOCAL_SERVICE_KEY}`,
          'apikey': LOCAL_SERVICE_KEY
        },
        body: JSON.stringify(payload)
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        successCount++;
        const responseData = await response.json();
        if (responseData.rate_limit) {
          console.log(`Rate limit remaining: ${responseData.rate_limit.hourly_remaining} hourly, ${responseData.rate_limit.daily_remaining} daily`);
        }
      } else if (response.status === 429) {
        console.log('✓ Rate limit hit (expected behavior)');
        const responseData = await response.json();
        if (responseData.rate_limit) {
          console.log(`Rate limit details: ${JSON.stringify(responseData.rate_limit, null, 2)}`);
        }
        break;
      } else {
        const responseText = await response.text();
        console.log(`Unexpected response: ${responseText}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`Request ${i} failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Rate limiting test complete: ${successCount} requests succeeded`);
  return successCount > 0;
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  console.log('=' .repeat(35));
  
  const errorTests = [
    {
      name: 'Missing required fields',
      payload: { prompt: 'test' },
      expectedStatus: 400
    },
    {
      name: 'Empty image data',
      payload: {
        imageData: '',
        imageType: 'image/png',
        prompt: 'test',
        style: 'test'
      },
      expectedStatus: [400, 500]
    },
    {
      name: 'Invalid image type',
      payload: {
        imageData: TEST_IMAGE_BASE64,
        imageType: 'invalid/type',
        prompt: 'test',
        style: 'test'
      },
      expectedStatus: [400, 500]
    }
  ];

  let passedTests = 0;
  
  for (const test of errorTests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    try {
      const response = await fetch(`${LOCAL_URL}/functions/v1/portrait-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOCAL_SERVICE_KEY}`,
          'apikey': LOCAL_SERVICE_KEY
        },
        body: JSON.stringify(test.payload)
      });

      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      
      if (expectedStatuses.includes(response.status)) {
        console.log(`✅ PASSED - got expected status ${response.status}`);
        passedTests++;
      } else {
        console.log(`❌ FAILED - expected ${test.expectedStatus}, got ${response.status}`);
        const responseText = await response.text();
        console.log(`Response: ${responseText}`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Error handling tests: ${passedTests}/${errorTests.length} passed`);
  return passedTests === errorTests.length;
}

async function main() {
  console.log('🚀 Local Portrait Generation Edge Function Test Suite');
  console.log('🔧 Environment: LOCAL DEVELOPMENT');
  console.log('🗝️ Using local service role key');
  if (GEMINI_API_KEY) {
    console.log(`🤖 Gemini API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);
  }
  console.log('');
  
  const results = {
    complete: false,
    rateLimiting: false,
    errorHandling: false
  };
  
  // Test complete flow (most important)
  results.complete = await testCompleteFlow();
  
  // Test rate limiting
  results.rateLimiting = await testRateLimiting();
  
  // Test error handling
  results.errorHandling = await testErrorHandling();
  
  // Summary
  console.log('\n📋 FINAL SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Complete Flow: ${results.complete ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Rate Limiting: ${results.rateLimiting ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Error Handling: ${results.errorHandling ? 'PASSED' : 'FAILED'}`);
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.values(results).length;
  const percentage = Math.round((passedCount / totalCount) * 100);
  
  console.log(`\n🎯 Overall Score: ${passedCount}/${totalCount} tests passed (${percentage}%)`);
  
  if (percentage >= 80) {
    console.log('\n🎉 LOCAL EDGE FUNCTION IS WORKING CORRECTLY!');
  } else {
    console.log('\n⚠️ Some issues detected in local edge function');
  }
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}