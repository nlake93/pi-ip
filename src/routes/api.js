'use strict';

const express = require('express');

const config   = require('../config');
const camera   = require('../camera');
const identity = require('../identity');
const { version } = require('../../package.json');

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

module.exports = router;
