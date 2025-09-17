#!/usr/bin/env node

/**
 * Debug script to isolate portrait generation function issues
 */

const PRODUCTION_URL = 'https://ptgmobxrvptiahundusu.supabase.co';
const LOCAL_URL = 'http://127.0.0.1:54321';

const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testBasicConnect(url) {
  console.log(`\n🔍 Testing connection to: ${url}`);
  
  try {
    const response = await fetch(`${url}/functions/v1/portrait-generation`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    
    console.log(`✓ OPTIONS request: ${response.status} ${response.statusText}`);
    console.log(`✓ CORS headers present: ${response.headers.get('access-control-allow-origin') ? 'Yes' : 'No'}`);
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function testMinimalPayload(url) {
  console.log(`\n🧪 Testing minimal payload to: ${url}`);
  
  const payload = {
    imageData: TEST_IMAGE_BASE64,
    imageType: 'image/png',
    prompt: 'Test prompt',
    style: 'Test Style',
    sessionId: `debug-${Date.now()}`
  };
  
  try {
    const response = await fetch(`${url}/functions/v1/portrait-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    console.log(`✓ Response status: ${response.status} ${response.statusText}`);
    console.log(`✓ Response body: ${responseText}`);
    
    try {
      const json = JSON.parse(responseText);
      if (json.error) {
        console.log(`❌ Error from function: ${json.error}`);
        if (json.details) {
          console.log(`❌ Error details: ${json.details}`);
        }
      }
    } catch (parseError) {
      console.log(`⚠️ Response is not JSON: ${responseText}`);
    }
    
    return response.status;
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return null;
  }
}

async function testWithAuth(url) {
  console.log(`\n🔑 Testing with service role auth to: ${url}`);
  
  // Get service role key from environment
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z21vYnhydnB0aWFodW5kdXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyMzA2MywiZXhwIjoyMDczMzk5MDYzfQ.7Yg9e__QhWdPvLT-aaq1prMwfOtDIigW2n-hZLRmHCQ';
  
  const payload = {
    imageData: TEST_IMAGE_BASE64,
    imageType: 'image/png',
    prompt: 'Test prompt with auth',
    style: 'Test Style',
    sessionId: `debug-auth-${Date.now()}`
  };
  
  try {
    const response = await fetch(`${url}/functions/v1/portrait-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    console.log(`✓ Response status: ${response.status} ${response.statusText}`);
    console.log(`✓ Response body: ${responseText}`);
    
    return response.status;
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Debug Portrait Generation Function');
  console.log('=' .repeat(50));
  
  // Test production
  console.log('\n📡 PRODUCTION ENVIRONMENT');
  await testBasicConnect(PRODUCTION_URL);
  await testMinimalPayload(PRODUCTION_URL);
  await testWithAuth(PRODUCTION_URL);
  
  // Test local
  console.log('\n💻 LOCAL ENVIRONMENT');
  await testBasicConnect(LOCAL_URL);
  await testMinimalPayload(LOCAL_URL);
  await testWithAuth(LOCAL_URL);
  
  console.log('\n🏁 Debug complete!');
}

main().catch(console.error);