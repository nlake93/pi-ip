'use strict';

const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const config       = require('./config');
const capabilities = require('./capabilities');

let mediamtxProcess    = null;
let cachedCapabilities = capabilities.UNKNOWN;

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

function loadSettings() {
  if (fs.existsSync(config.settingsFile)) {
    try {
      return JSON.parse(fs.readFileSync(config.settingsFile, 'utf8'));
    } catch {
      console.warn('[camera] settings.json corrupt, falling back to defaults');
    }
  }
  return JSON.parse(fs.readFileSync(config.cameraDefaultsFile, 'utf8'));
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(config.settingsFile), { recursive: true });
  fs.writeFileSync(config.settingsFile, JSON.stringify(settings, null, 2));
}

// ---------------------------------------------------------------------------
// MediaMTX config generation
// ---------------------------------------------------------------------------

function buildMediaMTXConfig(s) {
  const pathCfg = {
    source:              'rpiCamera',
    rpiCameraWidth:      s.width,
    rpiCameraHeight:     s.height,
    rpiCameraFPS:        s.fps,
    rpiCameraIDRPeriod:  s.idr,
    rpiCameraBitrate:    s.bitrate,
    rpiCameraProfile:    s.profile,
    rpiCameraLevel:      String(s.level),
    rpiCameraAfMode:     s.afMode,
    rpiCameraAfRange:    s.afRange,
    rpiCameraAfSpeed:    s.afSpeed,
    rpiCameraLensPosition: s.lensPosition,
    rpiCameraExposure:     s.exposureMode,
    rpiCameraAWB:          s.awbMode,
    rpiCameraBrightness:   s.brightness,
    rpiCameraContrast:     s.contrast,
    rpiCameraSaturation:   s.saturation,
    rpiCameraSharpness:    s.sharpness,
    rpiCameraEV:           s.exposureValue,
    rpiCameraHFlip:        s.hFlip,
    rpiCameraVFlip:        s.vFlip,
  };

  return {
    logLevel:       'info',
    logDestinations: ['stdout'],
    rtspAddress:    `:${config.rtspPort}`,
    hlsAddress:     `:${config.hlsPort}`,
    webrtcAddress:  `:${config.webrtcPort}`,
    api:            false,
    paths: { cam: pathCfg },
  };
}

function writeMediaMTXConfig(settings) {
  fs.mkdirSync(path.dirname(config.mediamtxConfig), { recursive: true });
  fs.writeFileSync(
    config.mediamtxConfig,
    yaml.dump(buildMediaMTXConfig(settings), { lineWidth: -1 }),
  );
}

// ---------------------------------------------------------------------------
// Process management
// ---------------------------------------------------------------------------

function spawnMediaMTX() {
  if (!fs.existsSync(config.mediamtxBin)) {
    console.warn(`[camera] MediaMTX binary not found at ${config.mediamtxBin} — stream not started`);
    console.warn('[camera] Run scripts/setup.sh on the Pi to install MediaMTX');
    return;
  }

  mediamtxProcess = spawn(config.mediamtxBin, [config.mediamtxConfig], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  mediamtxProcess.stdout.on('data', (d) => process.stdout.write(`[mediamtx] ${d}`));
  mediamtxProcess.stderr.on('data', (d) => process.stderr.write(`[mediamtx] ${d}`));

  mediamtxProcess.on('exit', (code, signal) => {
    mediamtxProcess = null;
    if (signal !== 'SIGTERM') {
      console.warn(`[camera] MediaMTX exited (code=${code}), restarting in 3 s…`);
      setTimeout(spawnMediaMTX, 3000);
    }
  });

  console.log('[camera] MediaMTX started (PID %d)', mediamtxProcess.pid);
}

async function killMediaMTX() {
  if (!mediamtxProcess) return;
  return new Promise((resolve) => {
    const proc = mediamtxProcess;
    mediamtxProcess = null;
    proc.removeAllListeners('exit');
    proc.once('exit', resolve);
    try {
      process.kill(-proc.pid, 'SIGTERM'); // kill mediamtx + its children (mtxrpicam)
    } catch {
      return resolve(); // already dead
    }
    setTimeout(resolve, 3000);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function start() {
  cachedCapabilities = await capabilities.detect();
  const settings = loadSettings();
  writeMediaMTXConfig(settings);
  spawnMediaMTX();
}

async function applySettings(newSettings) {
  saveSettings(newSettings);
  writeMediaMTXConfig(newSettings);
  await killMediaMTX();
  spawnMediaMTX();
}

function getSettings() {
  return loadSettings();
}

function isRunning() {
  return mediamtxProcess !== null;
}

function getCapabilities() {
  return cachedCapabilities;
}

module.exports = { start, applySettings, getSettings, saveSettings, isRunning, getCapabilities };
