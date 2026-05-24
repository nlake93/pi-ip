'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const config = require('./config');

let cached = null;

/**
 * Load identity from disk, or generate a new one on first boot.
 * The UUID is the canonical identifier used by the hub — it survives IP changes.
 * Name defaults to the Pi's hostname and can be updated via the settings UI later.
 */
function ensure() {
  if (cached) return cached;

  if (fs.existsSync(config.identityFile)) {
    try {
      cached = JSON.parse(fs.readFileSync(config.identityFile, 'utf8'));
      console.log(`[identity] Loaded: "${cached.name}" (${cached.uuid})`);
      return cached;
    } catch {
      console.warn('[identity] identity.json corrupt — regenerating');
    }
  }

  cached = {
    uuid: crypto.randomUUID(),
    name: os.hostname(),
  };

  fs.mkdirSync(path.dirname(config.identityFile), { recursive: true });
  fs.writeFileSync(config.identityFile, JSON.stringify(cached, null, 2));
  console.log(`[identity] Generated: "${cached.name}" (${cached.uuid})`);
  return cached;
}

function get() {
  return cached;
}

module.exports = { ensure, get };
