'use strict';

const express = require('express');

const requireAuth = require('../middleware/requireAuth');
const camera      = require('../camera');
const { validate } = require('../lib/validateSettings');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const caps = camera.getCapabilities();
    const result = validate(req.body, caps);
    if (result.error) return res.redirect('/?error=apply');

    await camera.applySettings(result.settings);
    res.redirect('/?saved=1');
  } catch (err) {
    console.error('[settings] Failed to apply settings:', err);
    res.redirect('/?error=apply');
  }
});

module.exports = router;
