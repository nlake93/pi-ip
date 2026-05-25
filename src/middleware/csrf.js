'use strict';

const crypto = require('crypto');

// Generate a CSRF token per session and expose it to all views.
function csrfToken(req, _res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomUUID();
  }
  next();
}

// Verify the token on state-changing requests. Exempt JSON API routes
// (same-origin fetch calls that don't use form submission) and all
// /api/* and /apikey routes (Bearer-authenticated, not session-based).
function csrfVerify(req, res, next) {
  if (req.method !== 'POST') return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/apikey')) return next();
  if (req.is('application/json')) return next();

  const token = req.body && req.body._csrf;
  if (token && token === req.session.csrfToken) return next();

  res.status(403).render('error', { title: 'Error — pi-ip', message: 'Invalid or missing CSRF token.' });
}

module.exports = { csrfToken, csrfVerify };
