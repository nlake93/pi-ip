'use strict';

// ── HLS live preview ──────────────────────────────────────────────────────────
(function initPlayer() {
  const video       = document.getElementById('livePlayer');
  const placeholder = document.getElementById('videoPlaceholder');
  const hlsUrl      = window.PI_IP_HLS_URL;

  if (!video || !hlsUrl) return;

  function hidePlayerError() {
    if (placeholder) placeholder.style.display = 'none';
    video.style.display = 'block';
  }

  function showPlayerError(msg) {
    video.style.display = 'none';
    if (placeholder) {
      placeholder.style.display = 'flex';
      const p = placeholder.querySelector('p');
      if (p) p.textContent = msg || 'Stream unavailable';
    }
  }

  // Prefer native HLS (Safari / iOS); fall back to hls.js
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsUrl;
    video.addEventListener('canplay', hidePlayerError);
    video.addEventListener('error', () => showPlayerError('Stream unavailable'));
    video.play().catch(() => {});
  } else if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: false });
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => { hidePlayerError(); video.play().catch(() => {}); });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) showPlayerError('Stream unavailable');
    });
  } else {
    showPlayerError('HLS not supported in this browser');
  }
}());

// ── Copy-to-clipboard buttons ─────────────────────────────────────────────────
document.querySelectorAll('.btn-copy').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    navigator.clipboard.writeText(target.textContent.trim()).then(() => {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1500);
    });
  });
});

// ── Range slider live value display ──────────────────────────────────────────
document.querySelectorAll('input[type="range"]').forEach((slider) => {
  const output = document.querySelector(`output[for="${slider.id}"]`);
  if (!output) return;
  slider.addEventListener('input', () => { output.textContent = slider.value; });
});

// ── Resolution preset → hidden width/height inputs ────────────────────────────
const resPicker = document.getElementById('resolution');
if (resPicker) {
  resPicker.addEventListener('change', () => {
    const [w, h] = resPicker.value.split('x').map(Number);
    document.getElementById('width').value  = w;
    document.getElementById('height').value = h;
  });
}

// ── Text overlay toggle ───────────────────────────────────────────────────────
const overlayToggle = document.getElementById('textOverlayEnable');
const overlayGroup  = document.getElementById('textOverlayGroup');
if (overlayToggle && overlayGroup) {
  function syncOverlay() {
    overlayGroup.style.opacity        = overlayToggle.checked ? '1' : '0.4';
    overlayGroup.style.pointerEvents  = overlayToggle.checked ? '' : 'none';
  }
  overlayToggle.addEventListener('change', syncOverlay);
  syncOverlay();
}
