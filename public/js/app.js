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
    function tryNative() {
      video.addEventListener('canplay', hidePlayerError, { once: true });
      video.addEventListener('error', () => {
        showPlayerError('Stream restarting…');
        video.removeAttribute('src');
        video.load();
        setTimeout(tryNative, 3000);
      }, { once: true });
      video.src = hlsUrl;
      video.load();
    }
    tryNative();
  } else if (window.Hls && Hls.isSupported()) {
    let retryTimer = null;

    function createHls() {
      const hls = new Hls({ lowLatencyMode: false });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { hidePlayerError(); video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          hls.destroy();
          showPlayerError('Stream restarting…');
          retryTimer = setTimeout(createHls, 3000);
        }
      });
      return hls;
    }

    createHls();
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

// Keep slider outputs in sync when the form is reset
const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
  settingsForm.addEventListener('reset', () => {
    // rAF so the browser has already restored default values before we read them
    requestAnimationFrame(() => {
      settingsForm.querySelectorAll('input[type="range"]').forEach((slider) => {
        const output = settingsForm.querySelector(`output[for="${slider.id}"]`);
        if (output) output.textContent = slider.value;
      });
      // Sync hidden width/height back from the resolution preset's reset value
      const res = settingsForm.querySelector('#resolution');
      if (res) {
        const [w, h] = res.value.split('x').map(Number);
        const wInput = settingsForm.querySelector('#width');
        const hInput = settingsForm.querySelector('#height');
        if (wInput) wInput.value = w;
        if (hInput) hInput.value = h;
      }
    });
  });
}

// ── Resolution preset → hidden width/height inputs ────────────────────────────
const resPicker = document.getElementById('resolution');
if (resPicker) {
  resPicker.addEventListener('change', () => {
    const [w, h] = resPicker.value.split('x').map(Number);
    document.getElementById('width').value  = w;
    document.getElementById('height').value = h;
  });
}
