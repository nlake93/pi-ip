'use strict';

const express      = require('express');
const { execSync } = require('child_process');
const path         = require('path');

const config        = require('../config');
const camera        = require('../camera');
const identity      = require('../identity');
const requireApiKey = require('../middleware/requireApiKey');
const { validate }  = require('../lib/validateSettings');
const { version }   = require('../../package.json');

const APP_DIR = path.resolve(__dirname, '../..');

const router = express.Router();

/**
 * GET /api/status
 *
 * Unauthenticated endpoint for hub health monitoring.
 * Returns stream state, camera sensor info, current settings, and identity.
 */
router.get('/status', (req, res) => {
  const id   = identity.get();
  const caps = camera.getCapabilities();
  const settings = camera.getSettings();

  res.json({
    uuid:    id.uuid,
    name:    id.name,
    version,
    uptime:  Math.floor(process.uptime()),
    stream: {
      running:    camera.isRunning(),
      rtspPort:   config.rtspPort,
      webrtcPort: config.webrtcPort,
      path:       '/live',
    },
    camera: {
      sensor:   caps.sensor   || null,
      name:     caps.name,
      detected: caps.detected !== false,
    },
    settings: {
      width:   settings.width,
      height:  settings.height,
      fps:     settings.fps,
      bitrate: settings.bitrate,
    },
  });
});

/**
 * POST /api/settings
 *
 * Authenticated (Bearer API key) endpoint for the hub to push camera settings.
 * Accepts a full settings JSON body, validates all fields, and applies them.
 */
router.post('/settings', requireApiKey, async (req, res) => {
  try {
    const caps   = camera.getCapabilities();
    const result = validate(req.body, caps);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await camera.applySettings(result.settings);
    res.json({ ok: true, settings: result.settings });
  } catch (err) {
    console.error('[api] Failed to apply settings:', err);
    res.status(500).json({ error: 'Failed to apply settings' });
  }
});

/**
 * POST /api/update
 *
 * API key authenticated OTA update for hub-initiated upgrades.
 * Pulls latest code, reinstalls dependencies, then exits so systemd restarts.
 */
router.post('/update', requireApiKey, (req, res) => {
  try {
    execSync('git pull --ff-only',           { cwd: APP_DIR, stdio: 'pipe', timeout: 30000 });
    execSync('npm install --omit=dev',       { cwd: APP_DIR, stdio: 'pipe', timeout: 120000 });
    res.json({ ok: true });
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    console.error('[api] OTA update failed:', err.message);
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});

module.exports = router;
