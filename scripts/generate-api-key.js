#!/usr/bin/env node
'use strict';

/**
 * Generates a new API key and saves it to config/auth.json.
 * Run with:  npm run api-key
 *
 * The hub uses this key to authenticate POST /api/settings requests:
 *   Authorization: Bearer <apiKey>
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

require('dotenv').config();
const config = require('../src/config');

let auth = {};
if (fs.existsSync(config.authFile)) {
  try {
    auth = JSON.parse(fs.readFileSync(config.authFile, 'utf8'));
  } catch {
    console.warn('  Warning: could not parse existing auth.json — will overwrite API key only');
  }
}

auth.apiKey = crypto.randomBytes(32).toString('hex');

fs.mkdirSync(path.dirname(config.authFile), { recursive: true });
fs.writeFileSync(config.authFile, JSON.stringify(auth, null, 2), { mode: 0o600 });

console.log('\n  pi-ip — API key generated\n');
console.log(`  API key: ${auth.apiKey}\n`);
console.log('  Store this in your hub configuration.');
console.log('  To rotate, run: npm run api-key\n');
