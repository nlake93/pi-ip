'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const express     = require('express');
const requireAuth = require('../middleware/requireAuth');
const config      = require('../config');

const router = express.Router();

function readAuth() {
  try {
    return JSON.parse(fs.readFileSync(config.authFile, 'utf8'));
  } catch {
    return {};
  }
}

function writeAuth(auth) {
  fs.mkdirSync(path.dirname(config.authFile), { recursive: true });
  fs.writeFileSync(config.authFile, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

/**
 * GET /apikey
 * Returns whether a key exists and an 8-char preview.
 */
router.get('/', requireAuth, (req, res) => {
  const auth = readAuth();
  res.json({ hasKey: !!auth.apiKey });
});

/**
 * POST /apikey
 * Generates a new API key, saves it, and returns the full key once.
 */
router.post('/', requireAuth, (req, res) => {
  const auth   = readAuth();
  const newKey = crypto.randomBytes(32).toString('hex');
  auth.apiKey  = newKey;
  writeAuth(auth);
  res.json({ key: newKey });
});

module.exports = router;
