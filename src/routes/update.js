'use strict';

const express      = require('express');
const { execSync } = require('child_process');
const path         = require('path');

const requireAuth   = require('../middleware/requireAuth');

const router  = express.Router();
const APP_DIR = path.resolve(__dirname, '../..');

function gitExec(cmd) {
  return execSync(cmd, { cwd: APP_DIR, stdio: 'pipe', timeout: 30000 }).toString().trim();
}

/**
 * GET /update/check
 * Session-authenticated. Queries the remote without writing to disk, then
 * compares HEAD to the remote branch tip.
 * Returns { upToDate, current, latest }.
 */
router.get('/check', requireAuth, (req, res) => {
  try {
    const current = gitExec('git rev-parse HEAD');
    const branch  = gitExec('git rev-parse --abbrev-ref HEAD');
    const lsLine  = gitExec(`git ls-remote origin refs/heads/${branch}`);
    const latest  = lsLine.split(/\s+/)[0];
    res.json({ upToDate: current === latest, current, latest });
  } catch (err) {
    res.status(500).json({ error: 'Update check failed', detail: err.message });
  }
});

/**
 * POST /update
 * Session-authenticated. Pulls latest code, runs npm install, then exits so
 * systemd (Restart=always) restarts the service with the new code.
 */
router.post('/', requireAuth, (req, res) => {
  try {
    gitExec('git pull --ff-only');
    execSync('npm install --omit=dev --cache /tmp/npm-cache', { cwd: APP_DIR, stdio: 'pipe', timeout: 120000 });
    res.json({ ok: true });
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    console.error('[update] OTA update failed:', err.message);
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});

module.exports = router;
