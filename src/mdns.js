'use strict';

const fs           = require('fs');
const { execSync } = require('child_process');

const config  = require('./config');
const { version } = require('../package.json');

const AVAHI_SERVICE_PATH = '/etc/avahi/services/pi-ip.service';

/**
 * Build the Avahi service XML for this node.
 * TXT records carry the metadata the hub needs after discovery:
 *   uuid        — persistent camera identity (survives IP changes)
 *   name        — human-assigned camera name (e.g. "Front Door")
 *   rtspPort    — primary stream port
 *   webrtcPort  — low-latency browser stream port
 *   apiPort     — management API port
 *   version     — pi-ip software version
 */
function buildXML(identity) {
  return `<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">pi-ip — ${identity.name}</name>
  <service>
    <type>_pi-ip._tcp</type>
    <port>${config.rtspPort}</port>
    <txt-record>uuid=${identity.uuid}</txt-record>
    <txt-record>name=${identity.name}</txt-record>
    <txt-record>rtspPort=${config.rtspPort}</txt-record>
    <txt-record>webrtcPort=${config.webrtcPort}</txt-record>
    <txt-record>apiPort=${config.port}</txt-record>
    <txt-record>version=${version}</txt-record>
  </service>
</service-group>
`;
}

/**
 * Write the Avahi service file and signal avahi-daemon to re-read it.
 * Requires write access to /etc/avahi/services/ — setup.sh ensures this
 * by chowning the file to NODE_USER after initial creation.
 * The systemd unit grants runtime write access via ReadWritePaths.
 */
function apply(identity) {
  const xml = buildXML(identity);

  try {
    fs.writeFileSync(AVAHI_SERVICE_PATH, xml);
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'ENOENT') {
      console.warn('[mdns] Cannot write Avahi service file — run setup.sh on the Pi to configure mDNS');
    } else {
      console.warn('[mdns] Failed to write Avahi service file:', err.message);
    }
    return;
  }

  try {
    execSync('systemctl reload-or-restart avahi-daemon', { stdio: 'ignore' });
  } catch { /* not running under systemd (dev machine) */ }

  console.log(`[mdns] Broadcasting _pi-ip._tcp as "${identity.name}" (${identity.uuid})`);
}

module.exports = { buildXML, apply, AVAHI_SERVICE_PATH };
