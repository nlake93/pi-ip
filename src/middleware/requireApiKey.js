'use strict';

const fs     = require('fs');
const config = require('../config');

/**
 * Middleware that requires a valid API key in the Authorization header.
 * The hub sends:  Authorization: Bearer <apiKey>
 *
 * The key is stored in config/auth.json alongside the web UI credentials.
 * Generate or rotate it with:  npm run api-key
 */
module.exports = function requireApiKey(req, res, next) {
  let auth;
  try {
    auth = JSON.parse(fs.readFileSync(config.authFile, 'utf8'));
  } catch {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  if (!auth.apiKey) {
    return res.status(503).json({ error: 'API key not set — run: npm run api-key' });
  }

  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== auth.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
