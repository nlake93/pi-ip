# pi-ip

A self-contained IP camera appliance for the **Raspberry Pi Zero 2W** (or any Pi with a CSI camera module). Provides:

- 🎥 **RTSP stream** — compatible with VLC, Home Assistant, Frigate, Blue Iris, and most NVR software
- 🌐 **HLS stream** — plays in any browser, Apple TV, iOS
- ⚡ **WebRTC stream** — ultra-low latency in a browser, served by MediaMTX
- 🔒 **Password-protected web UI** — adjust all camera settings live
- 🔄 **Auto-restart** — systemd keeps the stream running; settings changes restart MediaMTX automatically

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

### 2. Enable the camera interface

```bash
sudo raspi-config
# Interface Options → Camera → Enable
```

Or add to `/boot/firmware/config.txt`:
```
camera_auto_detect=1
```

### 3. Clone and run setup

```bash
git clone https://github.com/YOUR_USER/pi-ip.git
cd pi-ip
bash scripts/setup.sh
```

The setup script:
1. Installs `libcamera-apps` and Node.js via apt
2. Downloads the MediaMTX `arm64` binary to `/usr/local/bin/mediamtx`
3. Installs Node.js dependencies (`npm install`)
4. Prompts you to create admin credentials
5. Installs and starts a systemd service

---

## Accessing the camera

Once setup is complete, replace `PI_IP` with your Pi's IP address (shown at the end of setup):

| Interface | URL |
|-----------|-----|
| Web UI    | `http://PI_IP:8080` |
| RTSP      | `rtsp://PI_IP:8554/cam` |
| HLS       | `http://PI_IP:8888/cam/index.m3u8` |
| WebRTC    | `http://PI_IP:8889/cam` |

---

## Configuration

All runtime configuration lives in a `.env` file in the project root. Copy the example and edit:

```bash
cp .env.example .env
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
│   ├── middleware/
│   │   └── requireAuth.js     # Session auth guard
│   └── routes/
│       ├── auth.js            # /login, /logout
│       ├── index.js           # / dashboard
│       └── settings.js        # /settings
├── views/                     # EJS templates
├── public/                    # Static CSS + JS
├── config/
│   ├── camera-defaults.json   # Default camera settings (shipped)
│   ├── settings.json          # Active settings (runtime, gitignored)
│   ├── auth.json              # Hashed credentials (runtime, gitignored)
│   └── mediamtx.yml           # Generated MediaMTX config (runtime, gitignored)
├── scripts/
│   ├── setup.sh               # One-shot Pi setup script
│   └── set-password.js        # Interactive credential setter
└── systemd/
    └── pi-ip.service          # systemd unit template
```
