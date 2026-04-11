'use strict';

const express = require('express');
const os      = require('os');

const requireAuth = require('../middleware/requireAuth');
const camera      = require('../camera');
const config      = require('../config');

const router = express.Router();

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

router.get('/', requireAuth, (req, res) => {
  const ip           = getLocalIP();
  const settings     = camera.getSettings();
  const caps         = camera.getCapabilities();

  res.render('dashboard', {
    title:      'Dashboard — pi-ip',
    currentPage: 'dashboard',
    username:   req.session.username,
    streamRunning: camera.isRunning(),
    settings,
    capabilities: caps,
    rtspUrl:    `rtsp://${ip}:${config.rtspPort}/cam`,
    hlsUrl:     `http://${ip}:${config.hlsPort}/cam/index.m3u8`,
    webrtcUrl:  `http://${ip}:${config.webrtcPort}/cam`,
  });
});

module.exports = router;
