'use strict';

// ── WebRTC live preview (WHEP) ────────────────────────────────────────────────
(function initPlayer() {
  const video       = document.getElementById('livePlayer');
  const placeholder = document.getElementById('videoPlaceholder');

  if (!video) return;

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

  let pc = null;

  async function startWebRTC() {
    if (pc) { pc.close(); pc = null; }

    try {
      pc = new RTCPeerConnection();

      pc.ontrack = (e) => {
        video.srcObject = e.streams[0];
        video.play().catch(() => {});
        hidePlayerError();
      };

      pc.oniceconnectionstatechange = () => {
        if (!pc) return;
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          showPlayerError('Stream restarting…');
          pc.close();
          pc = null;
          setTimeout(startWebRTC, 3000);
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering (local network: typically < 200 ms)
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const onStateChange = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', onStateChange);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', onStateChange);
        setTimeout(resolve, 3000); // fallback
      });

      const resp = await fetch('/api/whep', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sdp: pc.localDescription.sdp }),
      });

      if (!resp.ok) throw new Error(`WHEP ${resp.status}`);

      const { sdp } = await resp.json();
      await pc.setRemoteDescription({ type: 'answer', sdp });

    } catch {
      showPlayerError('Stream unavailable');
      if (pc) { pc.close(); pc = null; }
      setTimeout(startWebRTC, 5000);
    }
  }

  startWebRTC();
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

