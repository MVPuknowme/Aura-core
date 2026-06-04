#!/usr/bin/env node

/**
 * Skygrid Protocol API Endpoint Verification Script
 * Monitors health of critical API endpoints
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const ENDPOINTS = [
  {
    name: 'Health Check',
    url: 'https://api.skygrid-protocol.net/health.json',
    critical: true
  },
  {
    name: 'Highway Status',
    url: 'https://api.skygrid-protocol.net/api/highway/status',
    critical: true
  },
  {
    name: 'Stripe Device Link',
    url: 'https://api.skygrid-protocol.net/api/stripe/device-link',
    critical: false
  }
];

const TIMEOUT = 5000; // 5 second timeout
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Check a single endpoint
 */
function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      resolve({
        ...endpoint,
        status: 'TIMEOUT',
        statusCode: null,
        responseTime: TIMEOUT,
        timestamp: new Date().toISOString(),
        success: false,
        error: 'Request timeout'
      });
    }, TIMEOUT);

    https.head(endpoint.url, (res) => {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 300;

      resolve({
        ...endpoint,
        status: success ? 'OK' : 'FAILED',
        statusCode: res.statusCode,
        responseTime,
        timestamp: new Date().toISOString(),
        success,
        error: success ? null : `HTTP ${res.statusCode}`
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      resolve({
        ...endpoint,
        status: 'ERROR',
        statusCode: null,
        responseTime,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });
    });
  });
}

/**
 * Format output for console
 */
function formatConsoleOutput(results) {
  console.log('\n' + '='.repeat(70));
  console.log('SKYGRID PROTOCOL API VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const table = results.map((result) => ({
    Endpoint: result.name,
    Status: result.success ? '✅ OK' : '❌ FAILED',
    'HTTP Code': result.statusCode || 'N/A',
    'Response Time': `${result.responseTime}ms`,
    Error: result.error || '-'
  }));

  console.table(table);

  const allSuccess = results.every(r => r.success || !r.critical);
  const criticalFailed = results.filter(r => r.critical && !r.success);

  console.log('\n' + '='.repeat(70));
  if (criticalFailed.length > 0) {
    console.log(`⚠️  CRITICAL FAILURES: ${criticalFailed.length}`);
    criticalFailed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  } else if (allSuccess) {
    console.log('✅ ALL ENDPOINTS HEALTHY');
  } else {
    console.log('⚠️  SOME NON-CRITICAL ENDPOINTS UNAVAILABLE');
  }
  console.log('='.repeat(70) + '\n');

  return allSuccess;
}

/**
 * Save results to log file
 */
function saveResults(results) {
  const logFile = path.join(LOG_DIR, `api-verification-${Date.now()}.json`);
  const summary = {
    timestamp: new Date().toISOString(),
    allHealthy: results.every(r => r.success),
    results
  };

  fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));
  console.log(`📝 Results saved to: ${logFile}`);
}

/**
 * Main verification routine
 */
async function verify() {
  console.log('🔍 Verifying Skygrid Protocol API endpoints...\n');

  const results = await Promise.all(
    ENDPOINTS.map(endpoint => checkEndpoint(endpoint))
  );

  const allHealthy = formatConsoleOutput(results);
  saveResults(results);

  process.exit(allHealthy ? 0 : 1);
}

// Run verification
verify().catch((error) => {
  console.error('Verification script error:', error);
  process.exit(1);
});
