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
echo "[1/5] Installing system packages…"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
  libcamera-apps \
  nodejs \
  npm

# ── 2. MediaMTX ───────────────────────────────────────────────────────────────
echo "[2/5] Installing MediaMTX v${MEDIAMTX_VERSION} (arm64)…"
TMP_DIR="$(mktemp -d)"
curl -fsSL "${MEDIAMTX_URL}" -o "${TMP_DIR}/${MEDIAMTX_TARBALL}"
tar -xzf "${TMP_DIR}/${MEDIAMTX_TARBALL}" -C "${TMP_DIR}"
sudo install -m 755 "${TMP_DIR}/mediamtx" "${MEDIAMTX_BIN}"
rm -rf "${TMP_DIR}"
echo "  MediaMTX installed at ${MEDIAMTX_BIN}"

# ── 3. Node dependencies ──────────────────────────────────────────────────────
echo "[3/5] Installing Node.js dependencies…"
cd "${APP_DIR}"
npm install --omit=dev

# ── 4. Credentials ────────────────────────────────────────────────────────────
echo "[4/5] Setting admin credentials…"
npm run set-password

# ── 5. systemd service ────────────────────────────────────────────────────────
echo "[5/5] Installing systemd service…"

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
sudo systemctl restart pi-ip.service

echo ""
echo "  ✓ pi-ip is running!"
echo "  Web UI  →  http://$(hostname -I | awk '{print $1}'):8080"
echo "  RTSP    →  rtsp://$(hostname -I | awk '{print $1}'):8554/live"
echo ""
echo "  Manage the service:"
echo "    sudo systemctl status  pi-ip"
echo "    sudo systemctl restart pi-ip"
echo "    sudo journalctl -u pi-ip -f"
echo ""
