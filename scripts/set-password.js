#!/usr/bin/env node
'use strict';

/**
 * Interactive CLI to set the pi-ip admin username and password.
 * Run with:  npm run set-password
 */

const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const crypto   = require('crypto');

require('dotenv').config();
const config = require('../src/config');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n  pi-ip — set admin credentials\n');

  const username = (await ask('  Username [admin]: ')).trim() || 'admin';

  let password = '';
  while (password.length < 8) {
    password = (await ask('  Password (min 8 chars): ')).trim();
    if (password.length < 8) console.log('  Password too short, try again.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const auth = { username, passwordHash };

  fs.mkdirSync(path.dirname(config.authFile), { recursive: true });
  fs.writeFileSync(config.authFile, JSON.stringify(auth, null, 2), { mode: 0o600 });

  console.log(`\n  Credentials saved to ${config.authFile}`);

  // Remind user to set SESSION_SECRET if still on default
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    const secret = crypto.randomBytes(48).toString('hex');
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8')
      .replace('change-me-in-production', secret);
    fs.writeFileSync(envPath, envContent);
    console.log('  Generated .env with a random SESSION_SECRET.');
  }

  console.log('  Done. Start the server with: npm start\n');
  rl.close();
}

main().catch((err) => {
  console.error('\n  Error:', err.message);
  rl.close();
  process.exit(1);
});
