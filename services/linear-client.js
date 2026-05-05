#!/usr/bin/env node
'use strict';

const https = require('https');

const LINEAR_API_URL = process.env.LINEAR_API_URL || 'https://api.linear.app/graphql';
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || '';

function linearRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    if (!LINEAR_API_KEY) {
      return resolve({ ok: false, error: 'missing_linear_api_key' });
    }

    const body = JSON.stringify({ query, variables });
    const url = new URL(LINEAR_API_URL);

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: true, status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'parse_error', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getViewer() {
  const query = `query { viewer { id name email } }`;
  return linearRequest(query);
}

if (require.main === module) {
  getViewer().then(console.log).catch(console.error);
}

module.exports = { linearRequest, getViewer };
