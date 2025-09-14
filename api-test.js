#!/usr/bin/env node

/**
 * CellarSessions API Testing Script
 * 
 * This script tests all API endpoints to ensure they're working correctly.
 * Run with: node api-test.js <your-vercel-url>
 * Example: node api-test.js https://cellarsessions-api.vercel.app
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Sample base64 1x1 pixel image for testing
const sampleImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// Sample base64 audio data (minimal WAV header)
const sampleAudio = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testEndpoint(name, url, options = {}) {
  log(`\\n🧪 Testing ${name}...`, colors.blue);
  log(`   URL: ${url}`);
  
  try {
    const result = await makeRequest(url, options);
    
    if (result.status >= 200 && result.status < 300) {
      log(`   ✅ Success (${result.status})`, colors.green);
      if (options.verbose) {
        log(`   Response: ${JSON.stringify(result.data, null, 2)}`, colors.reset);
      }
      return true;
    } else {
      log(`   ❌ Failed (${result.status})`, colors.red);
      log(`   Response: ${JSON.stringify(result.data, null, 2)}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

async function runTests(baseUrl) {
  log('🚀 Starting CellarSessions API Tests\\n', colors.blue);
  log(`Base URL: ${baseUrl}\\n`);

  const results = [];

  // Test 1: Health Check
  results.push(await testEndpoint(
    'Health Check',
    `${baseUrl}/api/health`
  ));

  // Test 2: Wine Label Recognition
  results.push(await testEndpoint(
    'Wine Label Recognition',
    `${baseUrl}/api/ai/label-recognition`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { image: sampleImage }
    }
  ));

  // Test 3: Voice Transcription (will likely fail without valid audio)
  results.push(await testEndpoint(
    'Voice Transcription',
    `${baseUrl}/api/ai/voice-transcription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { audio: sampleAudio, language: 'en' }
    }
  ));

  // Test 4: Wine Search (GET)
  results.push(await testEndpoint(
    'Wine Search (GET)',
    `${baseUrl}/api/wine/search?query=cabernet&limit=5`
  ));

  // Test 5: Wine Search (POST)
  results.push(await testEndpoint(
    'Wine Search (POST)',
    `${baseUrl}/api/wine/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { query: 'chardonnay', limit: 3 }
    }
  ));

  // Test 6: Wine Recommendations
  results.push(await testEndpoint(
    'Wine Recommendations',
    `${baseUrl}/api/wine/recommendations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { user_id: 'test-user', limit: 5 }
    }
  ));

  // Test 7: CORS Preflight
  results.push(await testEndpoint(
    'CORS Preflight',
    `${baseUrl}/api/health`,
    {
      method: 'OPTIONS',
      headers: { 
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    }
  ));

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log('\\n' + '='.repeat(50), colors.blue);
  log(`📊 Test Summary: ${passed}/${total} tests passed`, colors.blue);
  
  if (passed === total) {
    log('🎉 All tests passed! Your API is ready to use.', colors.green);
  } else {
    log(`⚠️  ${total - passed} tests failed. Check the configuration and logs.`, colors.yellow);
  }
  
  log('='.repeat(50), colors.blue);
}

// Main execution
const baseUrl = process.argv[2];

if (!baseUrl) {
  log('❌ Please provide the base URL for testing', colors.red);
  log('Usage: node api-test.js <your-vercel-url>', colors.yellow);
  log('Example: node api-test.js https://cellarsessions-api.vercel.app', colors.yellow);
  process.exit(1);
}

// Validate URL format
try {
  new URL(baseUrl);
} catch (error) {
  log('❌ Invalid URL format', colors.red);
  log('Please provide a valid URL starting with http:// or https://', colors.yellow);
  process.exit(1);
}

// Run the tests
runTests(baseUrl).catch(error => {
  log(`❌ Test execution failed: ${error.message}`, colors.red);
  process.exit(1);
});