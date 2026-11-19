// textures.js — canvas-generated facades, roads and signs for Equator Drive.
// Real painted facades (window grids, shopfronts, signage) so no building is a plain box.
import { pick, rangeInt } from './rng.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function facadeTexture(rng, base, floors, style) {
  const W = 256, H = 256;
  const [c, g] = canvas(W, H);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // subtle vertical grime + panel lines
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(0,0,0,' + (0.02 + rng() * 0.05).toFixed(3) + ')';
    g.fillRect(Math.floor(rng() * W), 0, 2 + Math.floor(rng() * 6), H);
  }
  const cols = style === 'tower' ? 6 : 5;
  const rows = Math.max(3, Math.min(9, floors));
  const cw = W / cols, ch = (H - 46) / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + 6, y = 10 + r * ch + 5;
      const lit = rng() < 0.28;
      g.fillStyle = '#20242c'; g.fillRect(x - 2, y - 2, cw - 8, ch - 10);
      g.fillStyle = lit ? '#ffe9a8' : (rng() < 0.5 ? '#9fd8e8' : '#5f7d9a');
      g.fillRect(x, y, cw - 12, ch - 14);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, cw - 12, 3);
      // balcony rail on some windows
      if (rng() < 0.3) { g.fillStyle = '#2c2f36'; g.fillRect(x, y + ch - 16, cw - 12, 3); }
    }
  }
  // ground floor: shopfront with awning + sign band
  g.fillStyle = '#1d2126'; g.fillRect(0, H - 46, W, 46);
  const shopColors = ['#ff5a5f', '#ffb400', '#19b8a6', '#7c5cff', '#ff7ab8'];
  const shop = pick(rng, shopColors);
  g.fillStyle = shop; g.fillRect(0, H - 46, W, 14);
  g.fillStyle = '#fff'; g.font = 'bold 13px Arial'; g.textAlign = 'center';
  const names = ['KOPI KANCIL', 'WARUNG 24', 'BENGKEL BROOM', 'PASAR PAGI', 'TOKO HP', 'BAKSO 88', 'LAUNDRY', 'FOTO COPY'];
  g.fillText(pick(rng, names), W / 2, H - 35);
  g.fillStyle = '#cfe8ef';
  for (let i = 0; i < 3; i++) g.fillRect(14 + i * 82, H - 30, 68, 26);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 3; i++) g.fillRect(14 + i * 82, H - 30, 68, 4);
  // awning stripes
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : shop;
    g.fillRect(i * 32, H - 46, 32, 6);
  }
  return c;
}

export function roadTexture(rng) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#33363d'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = 'rgba(255,255,255,' + (rng() * 0.04).toFixed(3) + ')';
    g.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 2, 2);
  }
  g.fillStyle = '#f5c542';
  g.fillRect(124, 0, 4, 256);
  g.fillStyle = '#e8e8e8';
  for (let y = 0; y < 256; y += 64) { g.fillRect(60, y, 4, 32); g.fillRect(192, y, 4, 32); }
  return c;
}

export function plazaTexture(rng) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#b8a88a'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
  g.fillStyle = '#19b8a6'; g.beginPath(); g.arc(128, 128, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8fd8ce'; g.beginPath(); g.arc(128, 128, 22, 0, Math.PI * 2); g.fill();
  return c;
}

export function billboardTexture(rng, lines, bg, fg) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg; g.font = 'bold 44px Arial'; g.textAlign = 'center';
  lines.forEach((t, i) => g.fillText(t, 256, 92 + i * 56));
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#ff5a5f'; g.fillRect(30, 200, 120, 30);
  g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.fillText('EQUATOR', 90, 221);
  return c;
}

export function signTexture(text, bg, fg) {
  const [c, g] = canvas(256, 64);
  g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
  g.fillStyle = fg; g.font = 'bold 26px Arial'; g.textAlign = 'center';
  g.fillText(text, 128, 41);
  return c;
}

export function grassTexture(rng) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#58a34c'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = rng() < 0.5 ? '#4c9243' : '#68b45c';
    g.fillRect(Math.floor(rng() * 128), Math.floor(rng() * 128), 3, 3);
  }
  return c;
}
