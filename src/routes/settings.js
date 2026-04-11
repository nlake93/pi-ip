'use strict';

const express = require('express');

const requireAuth = require('../middleware/requireAuth');
const camera      = require('../camera');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const settings = camera.getSettings();
  const caps     = camera.getCapabilities();
  res.render('settings', {
    title:        'Settings — pi-ip',
    currentPage:  'settings',
    username:     req.session.username,
    settings,
    capabilities: caps,
    saved:  req.query.saved  === '1',
    error:  req.query.error  || null,
  });
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const b = req.body;

    const settings = {
      width:    parseInt(b.width,  10),
      height:   parseInt(b.height, 10),
      fps:      parseInt(b.fps,    10),
      idr:      parseInt(b.idr,    10),
      bitrate:  parseInt(b.bitrate, 10),
      profile:  b.profile,
      level:    b.level,

      afMode:        b.afMode,
      afRange:       b.afRange,
      afSpeed:       b.afSpeed,
      lensPosition:  parseFloat(b.lensPosition),

      exposureMode:  b.exposureMode,
      awbMode:       b.awbMode,
      brightness:    parseFloat(b.brightness),
      contrast:      parseFloat(b.contrast),
      saturation:    parseFloat(b.saturation),
      sharpness:     parseFloat(b.sharpness),
      exposureValue: parseFloat(b.exposureValue),

      hFlip:    b.hFlip === 'on',
      vFlip:    b.vFlip === 'on',
      rotation: parseInt(b.rotation, 10),

      textOverlayEnable: b.textOverlayEnable === 'on',
      textOverlay:       b.textOverlay || '%Y-%m-%d %H:%M:%S',
    };

    await camera.applySettings(settings);
    res.redirect('/settings?saved=1');
  } catch (err) {
    console.error('[settings] Failed to apply settings:', err);
    res.redirect('/settings?error=apply');
  }
});

module.exports = router;
