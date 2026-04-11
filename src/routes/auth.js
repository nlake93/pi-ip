'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const fs      = require('fs');

const config = require('../config');

const router = express.Router();

function loadAuth() {
  if (!fs.existsSync(config.authFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(config.authFile, 'utf8'));
  } catch {
    return null;
  }
}

router.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  const auth = loadAuth();
  res.render('login', {
    title:      'Login — pi-ip',
    needsSetup: !auth,
    error:      req.query.error || null,
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const auth = loadAuth();

  if (!auth) {
    return res.redirect('/login?error=setup');
  }

  const usernameOk = username === auth.username;
  const passwordOk = usernameOk && await bcrypt.compare(password, auth.passwordHash);

  if (!usernameOk || !passwordOk) {
    return res.redirect('/login?error=invalid');
  }

  req.session.authenticated = true;
  req.session.username = username;
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
