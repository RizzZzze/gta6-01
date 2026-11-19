// textures.js — all canvas textures for Equator Drive (fresh, session revision-2).
// Rules learned from the last build: road must NOT be striped; shop signs must
// read upright (no mirrored UV); night windows must glow warm.
import * as THREE from 'three';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function asphaltTexture(rng) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = rng.int(58, 98);
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    }
    // faint edge lines only — no stripes across the road
    g.fillStyle = 'rgba(230,230,220,0.55)';
    g.fillRect(6, 0, 3, h); g.fillRect(w - 9, 0, 3, h);
  });
}

export function pavementTexture(rng) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(0,0,0,${rng.range(0.02, 0.08)})`;
      g.fillRect(rng.range(0, w), rng.range(0, h), 3, 3);
    }
  });
}

export function grassTexture(rng) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4d8a3f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = rng.pick(['#5da24a', '#3f7a34', '#6fb055', '#47843a']);
      g.fillRect(rng.range(0, w), rng.range(0, h), 4, 4);
    }
  });
}

// Building facade: window grid. litRatio = fraction of windows glowing warm.
// Day: mostly dark glass, few lit. Night: most lit warm yellow.
export function facadeTexture(base, rng, litRatio, night) {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // subtle vertical panel shading
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, 0, 2, h);
    }
    const cols = 6, rows = 12;
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + 5, y = r * ch + 6, ww = cw - 10, hh = ch - 12;
        if (rng.chance(litRatio)) {
          g.fillStyle = night ? rng.pick(['#ffd97a', '#ffbe4d', '#ffe9a8', '#ffb347']) : '#ffe6a0';
          g.fillRect(x, y, ww, hh);
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, ww, 3);
        } else {
          g.fillStyle = night ? '#1c2433' : '#2b3a4d';
          g.fillRect(x, y, ww, hh);
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, ww, 4);
        }
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(x, y, ww, hh);
      }
    }
    // ground-floor shop band
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 42, w, 42);
  });
}

// Shop sign — text drawn upright, used on a plane facing the street.
export function signTexture(text, bg, fg, sub) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 56px Arial, sans-serif';
    g.fillText(text, w / 2, sub ? h / 2 - 16 : h / 2);
    if (sub) { g.font = 'bold 28px Arial, sans-serif'; g.fillText(sub, w / 2, h / 2 + 34); }
  });
}

// Neon sign: glowing text on transparent background.
export function neonTexture(text, color) {
  return canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 64px Arial, sans-serif';
    g.shadowColor = color; g.shadowBlur = 28;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 0; g.fillStyle = '#ffffff';
    g.font = 'bold 64px Arial, sans-serif';
    g.fillText(text, w / 2, h / 2);
  });
}

// Soft round light-pool decal for streetlights at night.
export function lightPoolTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,210,130,0.85)');
    grad.addColorStop(0.6, 'rgba(255,190,100,0.28)');
    grad.addColorStop(1, 'rgba(255,190,100,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

// Soft smoke puff sprite — many small, faint, dispersing (NOT big cotton balls).
export function smokeTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(235,235,235,0.55)');
    grad.addColorStop(0.5, 'rgba(225,225,225,0.22)');
    grad.addColorStop(1, 'rgba(225,225,225,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}
