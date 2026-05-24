#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# pi-ip setup script for Raspberry Pi Zero 2W — Raspberry Pi OS Trixie (arm64)
# Run as your normal user (sudo access required for installs).
# Usage: bash scripts/setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MEDIAMTX_VERSION="1.9.3"
MEDIAMTX_ARCH="arm64v8"
MEDIAMTX_TARBALL="mediamtx_v${MEDIAMTX_VERSION}_linux_${MEDIAMTX_ARCH}.tar.gz"
MEDIAMTX_URL="https://github.com/bluenviron/mediamtx/releases/download/v${MEDIAMTX_VERSION}/${MEDIAMTX_TARBALL}"
MEDIAMTX_BIN="/usr/local/bin/mediamtx"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SRC="${APP_DIR}/systemd/pi-ip.service"
SERVICE_DST="/etc/systemd/system/pi-ip.service"
NODE_USER="$(whoami)"

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║     pi-ip setup (Zero 2W)        ║"
echo "  ╚══════════════════════════════════╝"
echo "  App directory : ${APP_DIR}"
echo "  Running as    : ${NODE_USER}"
echo ""

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/8] Installing system packages…"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
  libcamera-apps \
  nodejs \
  npm \
  avahi-daemon

# ── 2. MediaMTX ───────────────────────────────────────────────────────────────
echo "[2/8] Installing MediaMTX v${MEDIAMTX_VERSION} (arm64)…"
TMP_DIR="$(mktemp -d)"
curl -fsSL "${MEDIAMTX_URL}" -o "${TMP_DIR}/${MEDIAMTX_TARBALL}"
tar -xzf "${TMP_DIR}/${MEDIAMTX_TARBALL}" -C "${TMP_DIR}"
sudo install -m 755 "${TMP_DIR}/mediamtx" "${MEDIAMTX_BIN}"
rm -rf "${TMP_DIR}"
echo "  MediaMTX installed at ${MEDIAMTX_BIN}"

# ── 3. Node dependencies ──────────────────────────────────────────────────────
echo "[3/8] Installing Node.js dependencies…"
cd "${APP_DIR}"
npm install --omit=dev

# ── 4. Environment file ───────────────────────────────────────────────────────
echo "[4/8] Configuring environment…"
if [ ! -f "${APP_DIR}/.env" ]; then
  SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")"
  sed "s|SESSION_SECRET=change-me-in-production|SESSION_SECRET=${SECRET}|" \
    "${APP_DIR}/.env.example" > "${APP_DIR}/.env"
  echo "  Generated .env with a random SESSION_SECRET"
else
  echo "  .env already exists — skipping"
fi

# ── 5. Camera interface ───────────────────────────────────────────────────────
echo "[5/8] Enabling camera interface…"
BOOT_CONFIG="/boot/firmware/config.txt"
if grep -q "camera_auto_detect" "${BOOT_CONFIG}" 2>/dev/null; then
  echo "  camera_auto_detect already set — skipping"
else
  echo "camera_auto_detect=1" | sudo tee -a "${BOOT_CONFIG}" > /dev/null
  echo "  Added camera_auto_detect=1 to ${BOOT_CONFIG}"
fi

# ── 6. Device identity + mDNS ─────────────────────────────────────────────────
echo "[6/8] Setting up device identity and mDNS…"
node scripts/setup-mdns.js | sudo tee /etc/avahi/services/pi-ip.service > /dev/null
sudo chown "${NODE_USER}" /etc/avahi/services/pi-ip.service
sudo systemctl enable --now avahi-daemon
sudo systemctl restart avahi-daemon
echo "  mDNS: broadcasting _pi-ip._tcp on the local network"

# ── 7. Credentials ────────────────────────────────────────────────────────────
echo "[7/8] Setting admin credentials…"
npm run set-password

echo ""
echo "  Generating API key for hub integration…"
npm run api-key

# ── 8. systemd service ────────────────────────────────────────────────────────
echo "[8/8] Installing systemd service…"

# Patch the WorkingDirectory and ExecStart in a temporary copy so the service
# points at the actual app directory regardless of where it was cloned.
TMP_SERVICE="$(mktemp)"
sed \
  -e "s|__APP_DIR__|${APP_DIR}|g" \
  -e "s|__NODE_USER__|${NODE_USER}|g" \
  "${SERVICE_SRC}" > "${TMP_SERVICE}"

sudo install -m 644 "${TMP_SERVICE}" "${SERVICE_DST}"
rm -f "${TMP_SERVICE}"

sudo systemctl daemon-reload
sudo systemctl enable pi-ip.service

echo ""
echo "  ✓ Setup complete!"
echo "  Web UI  →  http://$(hostname -I | awk '{print $1}'):8080  (after reboot)"
echo "  RTSP    →  rtsp://$(hostname -I | awk '{print $1}'):8554/live"
echo ""
echo "  Manage the service:"
echo "    sudo systemctl status  pi-ip"
echo "    sudo systemctl restart pi-ip"
echo "    sudo journalctl -u pi-ip -f"
echo ""

read -r -p "  A reboot is required to enable the camera. Reboot now? [Y/n] " REBOOT
if [[ "${REBOOT}" =~ ^[Nn] ]]; then
  echo "  Run 'sudo reboot' when ready."
else
  sudo reboot
fi
