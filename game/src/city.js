// city.js — Builds Equator City: ground, roads, five districts, facades,
// landmarks and street props. All geometry is real meshes with window-grid
// facades, signage and varied heights, so buildings read as buildings at
// full size and at 300px wide. Exports colliders for spawn safety.
import * as THREE from 'three';
import { makeRng, WORLD_SEED } from './rng.js';

export const WORLD = { size: 480, half: 240, roadEvery: 60, roadWidth: 12 };
export const DISTRICTS = [
  { name: 'OLD CANAL', x0: -240, z0: -240, x1: -60, z1: -60, ground: '#b8a88a' },
  { name: 'DELTA TOWERS', x0: 60, z0: -240, x1: 240, z1: -60, ground: '#8fa3b5' },
  { name: 'VILA HILL', x0: -240, z0: 60, x1: -60, z1: 240, ground: '#7fae72' },
  { name: 'CRATE HARBOR', x0: 60, z0: 60, x1: 240, z1: 180, ground: '#9a8f7a' },
  { name: 'SANDY BEACH', x0: -240, z0: 180, x1: 240, z1: 240, ground: '#e8d28a' },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  return 'DOWNTOWN';
}

function groundTexture() {
  const S = 1024, c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const toPx = (v) => ((v + 240) / 480) * S;
  g.fillStyle = '#6f7d6a'; g.fillRect(0, 0, S, S);
  for (const d of DISTRICTS) {
    g.fillStyle = d.ground;
    g.fillRect(toPx(d.x0), toPx(d.z0), toPx(d.x1) - toPx(d.x0), toPx(d.z1) - toPx(d.z0));
  }
  // Canal water strip across Old Canal, with a bridge deck over it.
  g.fillStyle = '#2e7fae';
  g.fillRect(toPx(-240), toPx(-132), toPx(-60) - toPx(-240), toPx(-108) - toPx(-132));
  g.fillStyle = '#c9c2b2';
  g.fillRect(toPx(-156), toPx(-138), toPx(-144) - toPx(-156), toPx(-102) - toPx(-138));
  // Beach sand already painted; add a water edge at the south rim.
  g.fillStyle = '#2e7fae'; g.fillRect(0, toPx(228), S, S - toPx(228));
  // Roads: dark asphalt grid every 60 m, plus sidewalks.
  g.fillStyle = '#3a3f45';
  for (let v = -180; v <= 180; v += 60) {
    g.fillRect(toPx(v - 6), 0, toPx(v + 6) - toPx(v - 6), S);
    g.fillRect(0, toPx(v - 6), S, toPx(v + 6) - toPx(v - 6));
  }
  g.strokeStyle = '#e8c832'; g.lineWidth = 2; g.setLineDash([7, 19]);
  for (let v = -180; v <= 180; v += 60) {
    g.beginPath(); g.moveTo(toPx(v), 0); g.lineTo(toPx(v), S); g.stroke();
    g.beginPath(); g.moveTo(0, toPx(v)); g.lineTo(S, toPx(v)); g.stroke();
  }
  g.setLineDash([]);
  // Downtown plaza at the centre.
  g.fillStyle = '#a8b0b8';
  g.fillRect(toPx(-48), toPx(-48), toPx(48) - toPx(-48), toPx(48) - toPx(-48));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function facadeTexture(base, win, lit) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 10);
  for (let y = 18; y < 248; y += 22) {
    for (let x = 10; x < 118; x += 26) {
      g.fillStyle = win; g.fillRect(x, y, 16, 13);
      if (lit) { g.fillStyle = 'rgba(255,220,120,0.85)'; g.fillRect(x + 2, y + 2, 12, 9); }
    }
  }
  // Ground-floor shopfront band.
  g.fillStyle = '#20242a'; g.fillRect(0, 228, 128, 28);
  g.fillStyle = '#ffd75e'; g.font = 'bold 13px sans-serif';
  g.fillText('SHOP', 8, 247);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const FACADE_SETS = {};
function facadeMat(base, win, lit) {
  const key = base + win + lit;
  if (!FACADE_SETS[key]) {
    FACADE_SETS[key] = new THREE.MeshStandardMaterial({
      map: facadeTexture(base, win, lit), roughness: 0.85, metalness: 0.05,
    });
  }
  return FACADE_SETS[key];
}

function box(w, h, d, mat, x, y, z, group) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildCity(scene) {
  const rng = makeRng(WORLD_SEED);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 480),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c313a, roughness: 0.9 });
  // Signage bands were removed (solid color bands read as floating bars on
  // the facades); the palette stays so the seeded draw below keeps the
  // stream — and every prop / parked car after it — byte-identical.
  const signMats = ['#ff2e88', '#2e9bff', '#ffb02e', '#7dffb0', '#ff5d5d'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 })
  );
  const districtStyle = {
    'OLD CANAL': { h: [10, 22], bases: ['#c98f5f', '#b5764a', '#d9a06a'], win: '#274b63', lit: false },
    'DELTA TOWERS': { h: [34, 72], bases: ['#5f7d9a', '#7d9ab5', '#4a6a86'], win: '#bfe3ff', lit: false },
    'VILA HILL': { h: [7, 13], bases: ['#e8dcc0', '#d9c9a8', '#f0e6d2'], win: '#3a5a3a', lit: false },
    'CRATE HARBOR': { h: [8, 16], bases: ['#8a7a68', '#7a6a58', '#96876f'], win: '#2a2a2a', lit: false },
    'SANDY BEACH': { h: [8, 18], bases: ['#f0e0b8', '#e0c890', '#ffffff'], win: '#2e7fae', lit: false },
    'DOWNTOWN': { h: [18, 40], bases: ['#6a7a8a', '#8a6a5a', '#5a6a7a'], win: '#cfe8ff', lit: true },
  };

  // One building (or a pair) per block; blocks are the 48 m squares between roads.
  const blockCenters = [];
  for (let bx = -180; bx <= 120; bx += 60) {
    for (let bz = -180; bz <= 120; bz += 60) blockCenters.push([bx + 30, bz + 30]);
  }
  for (const [cx, cz] of blockCenters) {
    const dName = districtAt(cx, cz);
    const st = districtStyle[dName];
    // Skip the plaza centre, the canal strip and the beach ferris wheel plot.
    if (Math.abs(cx) < 60 && Math.abs(cz) < 60) continue;
    if (dName === 'OLD CANAL' && cz > -150 && cz < -90) continue;
    if (dName === 'SANDY BEACH' && cx > -30 && cx < 30) continue;
    const n = dName === 'DELTA TOWERS' || dName === 'DOWNTOWN' ? 1 : rng.int(1, 2);
    for (let i = 0; i < n; i++) {
      const ox = n === 1 ? 0 : (i === 0 ? -11 : 11);
      const oz = n === 1 ? 0 : (i === 0 ? -11 : 11);
      const w = rng.range(16, 24), d = rng.range(16, 24);
      const h = rng.range(st.h[0], st.h[1]);
      const base = rng.pick(st.bases);
      const m = box(w, h, d, facadeMat(base, st.win, st.lit), cx + ox, h / 2, cz + oz, group);
      box(w + 1.2, 1, d + 1.2, roofMat, cx + ox, h + 0.5, cz + oz, group);
      // Roof plant / AC box so the roofline is not a flat slab from above.
      box(rng.range(3, 6), 1.6, rng.range(3, 6), roofMat, cx + ox + 4, h + 1.8, cz + oz - 3, group);
      rng.pick(signMats); // stream-preserving draw; no band mesh is built
      colliders.push({ x: cx + ox, z: cz + oz, hw: w / 2 + 0.5, hd: d / 2 + 0.5 });
    }
  }

  // Vila Hill mound + villas read as houses with pitched roofs.
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(55, 14, 24),
    new THREE.MeshStandardMaterial({ color: 0x6a9a58, roughness: 1 })
  );
  hill.position.set(-150, 7, 150); hill.receiveShadow = true;
  group.add(hill);
  colliders.push({ x: -150, z: 150, hw: 40, hd: 40 });

  buildLandmarks(group, colliders, rng);
  buildProps(group, colliders, rng);
  scene.add(group);
  return { colliders, group };
}

function buildLandmarks(group, colliders, rng) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a94a0, roughness: 0.5, metalness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.6 });
  // Elevated circular monorail ring around downtown plaza.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(52, 1.1, 8, 64), steel);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, 14, 0);
  ring.castShadow = true; group.add(ring);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const px = Math.cos(a) * 52, pz = Math.sin(a) * 52;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 14, 8), steel);
    p.position.set(px, 7, pz); p.castShadow = true; group.add(p);
  }
  const train = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 3.4),
    new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.4, metalness: 0.3 }));
  train.position.set(52, 16.2, 0); train.castShadow = true; group.add(train);
  const trainWin = new THREE.Mesh(new THREE.BoxGeometry(11, 1.1, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.15, metalness: 0.4 }));
  trainWin.position.set(52, 16.6, 0); group.add(trainWin);

  // Ferris wheel on the beach (fixed angle: deterministic).
  const fw = new THREE.Group();
  fw.position.set(0, 26, 210);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(20, 0.8, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0xffd75e, emissive: 0xffd75e, emissiveIntensity: 0.35 }));
  fw.add(rim);
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 6), steel);
    sp.rotation.z = (i * Math.PI) / 8; fw.add(sp);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshStandardMaterial({ color: ['#ff2e88', '#2e9bff', '#ffb02e'][i % 3], roughness: 0.5 }));
    const a = (i * Math.PI) / 4;
    cab.position.set(Math.cos(a) * 20, Math.sin(a) * 20, 0); fw.add(cab);
  }
  group.add(fw);
  const legA = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.6, 28, 8), steel);
  legA.position.set(-8, 12, 210); legA.rotation.z = 0.3; group.add(legA);
  const legB = legA.clone(); legB.position.set(8, 12, 210); legB.rotation.z = -0.3; group.add(legB);

  // Cable-stayed bridge over the canal.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.7 }));
  deck.position.set(-150, 4, -120); deck.castShadow = true; group.add(deck);
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(2.5, 26, 2.5), white);
  pylon.position.set(-150, 15, -120); pylon.castShadow = true; group.add(pylon);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 });
  for (const dz of [-20, -10, 10, 20]) {
    const len = Math.hypot(14, Math.abs(dz) + 6);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, len, 5), cableMat);
    cab.position.set(-150, 15, -120 + dz / 2);
    cab.rotation.x = Math.atan2(Math.abs(dz), 14) * (dz > 0 ? -1 : 1);
    group.add(cab);
  }
  colliders.push({ x: -150, z: -120, hw: 1.5, hd: 1.5 });

  // Harbor cranes + container rows.
  const contColors = [0xd95f2e, 0x2e7fd9, 0x3fae5a, 0xd9b02e, 0x9a4ad9];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 5; i++) {
      const x = 100 + i * 22, z = 96 + r * 20;
      const h = r === 2 && i % 2 === 0 ? 5.2 : 2.6;
      const cont = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 2.6),
        new THREE.MeshStandardMaterial({ color: contColors[(r + i) % 5], roughness: 0.8 }));
      cont.position.set(x, h / 2 + (h > 3 ? 2.6 : 0), z);
      cont.castShadow = true; group.add(cont);
      // Ribs so a container is not a flat slab.
      for (let k = -2; k <= 2; k++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 2.7),
          new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 }));
        rib.material.transparent = true; rib.material.opacity = 0.18;
        rib.position.set(x + k * 2.4, h / 2 + (h > 3 ? 2.6 : 0), z);
        group.add(rib);
      }
      colliders.push({ x, z, hw: 6.5, hd: 1.8 });
    }
  }
  for (const cx of [110, 190]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), steel);
    tower.position.set(cx, 17, 150); tower.castShadow = true; group.add(tower);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 2), steel);
    jib.position.set(cx + 8, 32, 150); group.add(jib);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.6 }));
    hook.position.set(cx + 20, 26, 150); group.add(hook);
    colliders.push({ x: cx, z: 150, hw: 2.5, hd: 2.5 });
  }
}

function buildProps(group, colliders, rng) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.5 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 1 });
  // Street lamps along the road grid (every other intersection, both sides).
  for (let v = -180; v <= 180; v += 60) {
    for (const u of [-180, -60, 60, 180]) {
      for (const [x, z] of [[v + 8, u + 8], [u + 8, v + 8]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 7, 6), poleMat);
        pole.position.set(x, 3.5, z); group.add(pole);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.5), lampMat);
        head.position.set(x, 7.1, z); group.add(head);
      }
    }
  }
  // Palm trees on the beach strip, leafy trees on Vila Hill.
  for (let i = 0; i < 26; i++) {
    const x = rng.range(-220, 220), z = rng.range(186, 224);
    if (Math.abs(x) < 30) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 6, 6), trunkMat);
    trunk.position.set(x, 3, z); trunk.rotation.z = rng.range(-0.12, 0.12); group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 7), leafMat);
    crown.position.set(x, 7.2, z); group.add(crown);
  }
  for (let i = 0; i < 18; i++) {
    const x = rng.range(-230, -80), z = rng.range(80, 220);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3.4, 6), trunkMat);
    trunk.position.set(x, 1.7, z); group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), leafMat);
    crown.position.set(x, 4.6, z); crown.castShadow = true; group.add(crown);
  }
  // Market stalls in Old Canal.
  const stallCols = [0xff2e88, 0xffb02e, 0x2e9bff, 0x7dffb0];
  for (let i = 0; i < 8; i++) {
    const x = -210 + i * 18, z = -168;
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }));
    base.position.set(x, 0.6, z); base.castShadow = true; group.add(base);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 4),
      new THREE.MeshStandardMaterial({ color: stallCols[i % 4], roughness: 0.8 }));
    awn.position.set(x, 2.6, z); awn.rotation.x = 0.12; group.add(awn);
    colliders.push({ x, z, hw: 3, hd: 2 });
  }
  // Traffic barriers near the harbor gate.
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xff5d2e, emissive: 0xff5d2e, emissiveIntensity: 0.25 }));
    b.position.set(80 + i * 4, 0.5, 66); group.add(b);
  }
}
