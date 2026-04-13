'use strict';

const express = require('express');

const requireAuth = require('../middleware/requireAuth');
const camera      = require('../camera');

const router = express.Router();

// ── Allowed values ────────────────────────────────────────────────────────────

const VALID_RESOLUTIONS = [
  [1920, 1080], [1280, 720], [1024, 768], [800, 600], [640, 480],
];
const VALID_FPS      = [10, 15, 24, 25, 30, 50, 60];
const VALID_BITRATES = [500000, 1000000, 2000000, 4000000, 6000000, 8000000];
const VALID_PROFILES = ['baseline', 'main', 'high'];
const VALID_LEVELS   = ['4', '4.1', '4.2'];
const VALID_AF_MODES   = ['auto', 'manual', 'continuous'];
const VALID_AF_RANGES  = ['normal', 'macro', 'full'];
const VALID_AF_SPEEDS  = ['normal', 'fast'];
const VALID_EXPOSURE   = ['normal', 'short', 'long', 'custom'];
const VALID_AWB        = ['auto', 'incandescent', 'tungsten', 'fluorescent', 'indoor', 'daylight', 'cloudy'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function oneOf(value, allowed) {
  return allowed.includes(value) ? value : null;
}

function clampFloat(raw, min, max) {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return null;
  return Math.min(Math.max(n, min), max);
}

function clampInt(raw, min, max) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(Math.max(n, min), max);
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/', requireAuth, async (req, res) => {
  try {
    const b    = req.body;
    const caps = camera.getCapabilities();

    // Validate resolution against both presets and camera capabilities
    const w = parseInt(b.width, 10);
    const h = parseInt(b.height, 10);
    const validRes = VALID_RESOLUTIONS.find(
      ([rw, rh]) => rw === w && rh === h && rw <= caps.maxWidth && rh <= caps.maxHeight,
    );
    if (!validRes) return res.redirect('/?error=apply');

    const fps     = oneOf(parseInt(b.fps, 10), VALID_FPS);
    const bitrate = oneOf(parseInt(b.bitrate, 10), VALID_BITRATES);
    const profile = oneOf(b.profile, VALID_PROFILES);
    const level   = oneOf(b.level, VALID_LEVELS);
    const idr     = clampInt(b.idr, 1, 300);

    const afMode       = oneOf(b.afMode, VALID_AF_MODES);
    const afRange      = oneOf(b.afRange, VALID_AF_RANGES);
    const afSpeed      = oneOf(b.afSpeed, VALID_AF_SPEEDS);
    const lensPosition = clampFloat(b.lensPosition, 0, 10);

    const exposureMode  = oneOf(b.exposureMode, VALID_EXPOSURE);
    const awbMode       = oneOf(b.awbMode, VALID_AWB);
    const brightness    = clampFloat(b.brightness, -1, 1);
    const contrast      = clampFloat(b.contrast, 0, 4);
    const saturation    = clampFloat(b.saturation, 0, 4);
    const sharpness     = clampFloat(b.sharpness, 0, 4);
    const exposureValue = clampFloat(b.exposureValue, -8, 8);

    // Reject if any field failed validation
    const allFields = [
      fps, bitrate, profile, level, idr,
      afMode, afRange, afSpeed, lensPosition,
      exposureMode, awbMode, brightness, contrast, saturation, sharpness, exposureValue,
    ];
    if (allFields.some((v) => v === null)) return res.redirect('/?error=apply');

    const settings = {
      width: validRes[0], height: validRes[1],
      fps, idr, bitrate, profile, level,
      afMode, afRange, afSpeed, lensPosition,
      exposureMode, awbMode, brightness, contrast, saturation, sharpness, exposureValue,
      hFlip: b.hFlip === 'on',
      vFlip: b.vFlip === 'on',
    };

    await camera.applySettings(settings);
    res.redirect('/?saved=1');
  } catch (err) {
    console.error('[settings] Failed to apply settings:', err);
    res.redirect('/?error=apply');
  }
});

module.exports = router;
