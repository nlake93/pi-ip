'use strict';

const express = require('express');
const http    = require('http');
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
  const ip       = getLocalIP();
  const settings = camera.getSettings();
  const caps     = camera.getCapabilities();

  res.render('dashboard', {
    title:         'Dashboard — pi-ip',
    currentPage:   'dashboard',
    username:      req.session.username,
    streamRunning: camera.isRunning(),
    settings,
    capabilities:  caps,
    saved:         req.query.saved === '1',
    error:         req.query.error || null,
    rtspUrl:       `rtsp://${ip}:${config.rtspPort}/live`,
    webrtcUrl:     `http://${ip}:${config.webrtcPort}/live`,
  });
});

// Proxy WHEP signalling to MediaMTX so the browser stays on the same origin
router.post('/api/whep', requireAuth, (req, res) => {
  const sdp = req.body && req.body.sdp;
  if (!sdp) return res.status(400).json({ error: 'sdp required' });

  const buf = Buffer.from(sdp, 'utf8');
  const proxyReq = http.request({
    hostname: 'localhost',
    port:     config.webrtcPort,
    path:     '/live/whep',
    method:   'POST',
    headers:  { 'Content-Type': 'application/sdp', 'Content-Length': buf.length },
  }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      if (proxyRes.statusCode === 200 || proxyRes.statusCode === 201) {
        res.json({ sdp: data });
      } else {
        res.status(502).json({ error: `upstream ${proxyRes.statusCode}` });
      }
    });
  });
  proxyReq.on('error', () => res.status(502).json({ error: 'upstream unavailable' }));
  proxyReq.write(buf);
  proxyReq.end();
});

module.exports = router;
