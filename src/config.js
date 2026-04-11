'use strict';

const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

module.exports = {
  port:         parseInt(process.env.PORT        || '8080', 10),
  rtspPort:     parseInt(process.env.RTSP_PORT   || '8554', 10),
  hlsPort:      parseInt(process.env.HLS_PORT    || '8888', 10),
  webrtcPort:   parseInt(process.env.WEBRTC_PORT || '8889', 10),

  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',

  mediamtxBin:    process.env.MEDIAMTX_BIN    || '/usr/local/bin/mediamtx',
  mediamtxConfig: process.env.MEDIAMTX_CONFIG || path.join(projectRoot, 'config', 'mediamtx.yml'),
  settingsFile:   process.env.SETTINGS_FILE   || path.join(projectRoot, 'config', 'settings.json'),
  authFile:       process.env.AUTH_FILE        || path.join(projectRoot, 'config', 'auth.json'),

  cameraDefaultsFile: path.join(projectRoot, 'config', 'camera-defaults.json'),
};
