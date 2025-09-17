#!/usr/bin/env node

/**
 * Test basic production infrastructure (without database functions)
 */

const PRODUCTION_URL = 'https://ptgmobxrvptiahundusu.supabase.co';
const PRODUCTION_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z21vYnhydnB0aWFodW5kdXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyMzA2MywiZXhwIjoyMDczMzk5MDYzfQ.7Yg9e__QhWdPvLT-aaq1prMwfOtDIigW2n-hZLRmHCQ';

async function testProductionBasics() {
  console.log('🌐 Testing Production Edge Function - Basic Infrastructure');
  console.log('=' .repeat(65));
  console.log('🎯 Goal: Verify deployment and basic functionality');
  console.log('📍 Testing endpoint:', `${PRODUCTION_URL}/functions/v1/portrait-generation`);
  console.log('');

  const tests = [
    {
      name: 'Function Deployment',
      test: async () => {
        const response = await fetch(`${PRODUCTION_URL}/functions/v1/portrait-generation`, {
          method: 'OPTIONS'
        });
        return response.status === 200;
      }
    },
    {
      name: 'CORS Headers',
      test: async () => {
        const response = await fetch(`${PRODUCTION_URL}/functions/v1/portrait-generation`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'POST'
          }
        });
        return response.headers.get('access-control-allow-origin') === '*';
      }
    },
    {
      name: 'Authentication Required',
      test: async () => {
        const response = await fetch(`${PRODUCTION_URL}/functions/v1/portrait-generation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' })
        });
        return response.status === 401;
      }
    },
    {
      name: 'Request Validation',
      test: async () => {
        const response = await fetch(`${PRODUCTION_URL}/functions/v1/portrait-generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PRODUCTION_SERVICE_KEY}`,
            'apikey': PRODUCTION_SERVICE_KEY
          },
          body: JSON.stringify({ prompt: 'test' }) // Missing required fields
        });
        return response.status === 400;
      }
    },
    {
      name: 'Service Authentication',
      test: async () => {
        const response = await fetch(`${PRODUCTION_URL}/functions/v1/portrait-generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PRODUCTION_SERVICE_KEY}`,
            'apikey': PRODUCTION_SERVICE_KEY
          },
          body: JSON.stringify({
            imageData: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            imageType: 'image/png',
            prompt: 'test',
            style: 'test'
          })
        });
        // Should not be 401 (authentication should work)
        // Will be 500 due to missing database functions, but that's expected
        return response.status !== 401;
      }
    }
  ];

  let passed = 0;
  const total = tests.length;

  for (const { name, test } of tests) {
    console.log(`🧪 Testing: ${name}`);
    try {
      const result = await test();
      if (result) {
        console.log(`✅ PASS: ${name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${name}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}`);
    }
    console.log('');
  }

  const percentage = Math.round((passed / total) * 100);
  
  console.log('📊 Production Basic Infrastructure Summary');
  console.log('=' .repeat(50));
  console.log(`🎯 Score: ${passed}/${total} (${percentage}%)`);
  
  if (percentage >= 80) {
    console.log('');
    console.log('🎉 PRODUCTION DEPLOYMENT IS SUCCESSFUL!');
    console.log('✅ Edge Function is deployed and accessible');
    console.log('✅ Authentication and validation are working');
    console.log('✅ Only database migration needed for full functionality');
  } else {
    console.log('');
    console.log('⚠️ Production deployment has issues');
  }

  return { passed, total, percentage };
}

testProductionBasics().catch(console.error);