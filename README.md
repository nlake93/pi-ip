# pi-ip

A self-contained IP camera appliance for the **Raspberry Pi Zero 2W** (or any Pi with a CSI camera module). Designed to be a lightweight, reliable camera node that can operate standalone or as part of a multi-camera home CCTV system managed by a central hub.

- 🎥 **RTSP stream** — compatible with VLC, Home Assistant, Frigate, Blue Iris, and most NVR software
- 🌐 **HLS stream** — plays in any browser, Apple TV, iOS
- ⚡ **WebRTC stream** — ultra-low latency in a browser, served by MediaMTX
- 🔒 **Password-protected web UI** — adjust all camera settings live
- 🔄 **Auto-restart** — systemd keeps the stream running; settings changes restart MediaMTX automatically
- 📡 **mDNS advertisement** — broadcasts `_pi-ip._tcp` via Avahi so the hub can auto-discover cameras

Encoding is handled by the Pi Camera's **hardware H.264 encoder** via MediaMTX's native `rpiCamera` source — the CPU stays mostly free.

---

## Hardware

| Component | Notes |
|-----------|-------|
| Raspberry Pi Zero 2W | aarch64, 512 MB RAM |
| Pi Camera Module (any gen) | Connected via the CSI-2 ribbon cable — use the **Zero-sized ribbon adapter** that ships with most camera kits |
| microSD ≥ 16 GB | Class 10 / A1 or better |
| Power | Official Pi Zero power supply (5 V / 2.5 A) |

> **Note:** The Pi Zero 2W has a **mini CSI-2 port** (15-pin, 22-pin pitch), which is smaller than the full-size Pi's connector. Make sure you have the correct ribbon cable for your camera module.

---

## Quick start

### 1. Flash Raspberry Pi OS

Download and flash **Raspberry Pi OS Trixie (64-bit, Lite)** using [Raspberry Pi Imager](https://www.raspberrypi.com/software/). Enable SSH and configure your Wi-Fi credentials in the imager before writing.

### 2. Clone and run setup

```bash
git clone https://github.com/YOUR_USER/pi-ip.git
cd pi-ip
bash scripts/setup.sh
```

The setup script:
1. Installs `libcamera-apps`, Node.js, and `avahi-daemon` via apt
2. Downloads the MediaMTX `arm64` binary to `/usr/local/bin/mediamtx`
3. Installs Node.js dependencies (`npm install`)
4. Generates a `.env` file with a random `SESSION_SECRET`
5. Enables the camera interface (`camera_auto_detect=1` in `/boot/firmware/config.txt`)
6. Generates a persistent device UUID and starts broadcasting via mDNS (`_pi-ip._tcp`)
7. Prompts you to create admin credentials
8. Installs the systemd service (enabled for autostart)
9. Prompts to reboot — the camera requires a reboot to activate

---

## Accessing the camera

Once setup is complete, replace `PI_IP` with your Pi's IP address (shown at the end of setup):

| Interface | URL |
|-----------|-----|
| Web UI    | `http://PI_IP:8080` |
| RTSP      | `rtsp://PI_IP:8554/live` |
| HLS       | `http://PI_IP:8888/live/index.m3u8` |
| WebRTC    | `http://PI_IP:8889/live` |

---

## Configuration

All runtime configuration lives in a `.env` file in the project root. `setup.sh` generates this automatically with a random `SESSION_SECRET`. To customise, edit it directly:

```bash
nano .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Web UI port |
| `RTSP_PORT` | `8554` | RTSP port |
| `HLS_PORT` | `8888` | HLS port |
| `WEBRTC_PORT` | `8889` | WebRTC port |
| `SESSION_SECRET` | *(random, auto-generated)* | Cookie signing secret |
| `MEDIAMTX_BIN` | `/usr/local/bin/mediamtx` | Path to the MediaMTX binary |
| `IDENTITY_FILE` | `config/identity.json` | Path to the device identity file |

Camera settings (resolution, bitrate, exposure, etc.) are managed through the web UI and persisted to `config/settings.json`.

### Changing the admin password

```bash
npm run set-password
sudo systemctl restart pi-ip
```

---

## Performance notes (Zero 2W)

- **Default resolution is 720p / 2 Mbps** — a good balance for the Zero 2W's 512 MB RAM and 2.4 GHz Wi-Fi ceiling (~8 Mbps reliable).
- 1080p is possible but increases memory pressure; keep bitrate ≤ 6 Mbps on Wi-Fi.
- The H.264 encoder runs on the VideoCore GPU — CPU load is low even at 1080p30.
- Node.js heap is capped at 96 MB via `--max-old-space-size=96` in the systemd unit.

---

## Service management

```bash
sudo systemctl status  pi-ip
sudo systemctl restart pi-ip
sudo systemctl stop    pi-ip
sudo journalctl -u pi-ip -f   # live logs
```

---

## Project structure

```
pi-ip/
├── server.js                  # Express server entrypoint
├── src/
│   ├── config.js              # Environment / path config
│   ├── camera.js              # MediaMTX process + config management
│   ├── capabilities.js        # Camera sensor detection (libcamera)
│   ├── identity.js            # Persistent device UUID + name
│   ├── mdns.js                # Avahi service file generation (mDNS)
│   ├── lib/
│   │   └── validateSettings.js  # Shared settings validation (web UI + API)
│   ├── middleware/
│   │   ├── requireAuth.js     # Session auth guard
│   │   ├── requireApiKey.js   # Bearer API key guard (hub endpoints)
│   │   └── csrf.js            # CSRF token middleware
│   └── routes/
│       ├── auth.js            # /login, /logout
│       ├── index.js           # / dashboard
│       ├── settings.js        # /settings
│       ├── api.js             # /api/status, /api/settings (hub endpoints)
├── views/                     # EJS templates
├── public/                    # Static CSS + JS
├── config/
│   ├── camera-defaults.json   # Default camera settings (shipped)
│   ├── settings.json          # Active settings (runtime, gitignored)
│   ├── auth.json              # Hashed credentials (runtime, gitignored)
│   ├── identity.json          # Device UUID + name (runtime, gitignored)
│   └── mediamtx.yml           # Generated MediaMTX config (runtime, gitignored)
├── scripts/
│   ├── setup.sh               # One-shot Pi setup script
│   ├── setup-mdns.js          # Generates identity + prints Avahi XML (used by setup.sh)
│   ├── set-password.js        # Interactive credential setter
│   └── generate-api-key.js   # Generates hub API key, saves to auth.json
└── systemd/
    └── pi-ip.service          # systemd unit template
```

---

## Roadmap

pi-ip is evolving from a standalone camera UI into a managed camera node for a multi-camera home CCTV system. The hub application will serve as the central control point, with each Pi acting as a lightweight, headless camera source.

### Hub Integration

- ✅ **JSON API for settings** — `POST /api/settings` authenticated with a Bearer API key, allowing the hub to push camera settings remotely.
- ✅ **Status API** — `GET /api/status` returning stream health, uptime, resolution, sensor info, and firmware version as JSON. Enables the hub to monitor all cameras at a glance.
- ✅ **mDNS advertisement** — Each camera broadcasts `_pi-ip._tcp` via Avahi/Bonjour so the hub can auto-discover cameras without manual IP configuration.
- ✅ **Persistent camera identity** — A unique UUID is generated on first boot, stored in `config/identity.json`. Allows the hub to reliably track cameras even if their IP address changes due to DHCP.
- **Headless mode** — Option to disable the local web UI entirely, letting the hub be the single management interface for all cameras.

### Reliability

- **Stream watchdog** — Periodically probe the RTSP port to detect zombie states where MediaMTX is alive but the stream is dead, and trigger an automatic restart.
- **Network recovery** — Detect Wi-Fi reconnection events and restart the stream if needed, ensuring 24/7 operation without manual intervention.

### Deployment

- **OTA updates** — Allow the hub to push firmware/software updates to all cameras at once, avoiding the need to SSH into each Pi individually. Could be a simple `POST /api/update` that triggers a git pull and service restart.
