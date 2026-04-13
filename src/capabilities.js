'use strict';

// Known Pi Camera sensor IDs → capability profiles.
// Detection runs `libcamera-hello --list-cameras` at startup and parses the
// sensor model string from lines like: "0 : imx708 [4608x2592] (...)"
const SENSORS = {
  ov5647: { name: 'Camera Module v1',       maxWidth: 2592,  maxHeight: 1944, hasAF: false },
  imx219: { name: 'Camera Module v2',       maxWidth: 3280,  maxHeight: 2464, hasAF: false },
  imx477: { name: 'Camera Module HQ',       maxWidth: 4056,  maxHeight: 3040, hasAF: false },
  imx708: { name: 'Camera Module 3',        maxWidth: 4608,  maxHeight: 2592, hasAF: true  },
  imx500: { name: 'Camera Module 3 AI',     maxWidth: 4056,  maxHeight: 3040, hasAF: true  },
  imx296: { name: 'Camera Module GS',       maxWidth: 1456,  maxHeight: 1088, hasAF: false },
  imx290: { name: 'Arducam Starlight',      maxWidth: 1920,  maxHeight: 1080, hasAF: false },
};

// Fallback used on non-Pi environments or when detection fails.
// hasAF: false hides focus controls; permissive resolution so nothing is blocked.
const UNKNOWN = {
  name:      'Unknown / not detected',
  maxWidth:  4608,
  maxHeight: 2592,
  hasAF:     false,
  detected:  false,
};

/**
 * Run libcamera-hello --list-cameras and return a capabilities object.
 * Resolves with UNKNOWN on any error so the app never crashes at startup.
 */
function detect() {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec('/usr/bin/libcamera-hello --list-cameras 2>&1', { timeout: 6000 }, (err, stdout) => {
      if (!stdout) {
        console.warn('[camera] libcamera-hello not available — capabilities unknown');
        return resolve(UNKNOWN);
      }
      if (err) {
        console.warn('[camera] libcamera-hello exited with error — attempting to parse output anyway');
      }

      // Line format: "0 : imx708 [4608x2592] (/base/...)"
      const match = stdout.match(/:\s+([a-zA-Z0-9_]+)\s+\[(\d+)x(\d+)\]/);
      if (!match) {
        console.warn('[camera] Could not parse camera list output:', stdout.trim());
        return resolve(UNKNOWN);
      }

      const sensor = match[1].toLowerCase();
      const profile = SENSORS[sensor];

      if (profile) {
        console.log(`[camera] Detected: ${profile.name} (${sensor})`);
        resolve({ ...profile, sensor, detected: true });
      } else {
        // Sensor is connected but not in our table — use its reported resolution
        console.warn(`[camera] Unknown sensor "${sensor}" — AF controls hidden`);
        resolve({
          name:      sensor,
          maxWidth:  parseInt(match[2], 10),
          maxHeight: parseInt(match[3], 10),
          hasAF:     false,
          sensor,
          detected:  true,
        });
      }
    });
  });
}

module.exports = { detect, UNKNOWN };
