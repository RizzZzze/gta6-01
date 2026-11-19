// city.js — Equator City for Equator Drive (fresh, session revision-2).
// Grid city, real facades with lit windows, upright shop signs, neon at night,
// streetlight pools, trees, park + plaza, 9 districts, 7 story jobs.
import * as THREE from 'three';
import { asphaltTexture, pavementTexture, grassTexture, facadeTextures, signTexture, neonTexture, lightPoolTexture } from './textures.js';
import { buildVehicle } from './vehicles.js';

export const DISTRICTS = [
  { name: 'Pasar Kanal', cx: -60, cz: -60, color: '#e8a33d' },
  { name: 'Kota Tua', cx: 0, cz: -60, color: '#c96a4a' },
  { name: 'Marina Bay', cx: 60, cz: -60, color: '#3da8c9' },
  { name: 'Kampung Kancil', cx: -60, cz: 0, color: '#7ac74f' },
  { name: 'Plaza Merdeka', cx: 0, cz: 0, color: '#ffd23e' },
  { name: 'Distrik Neon', cx: 60, cz: 0, color: '#ff2e88' },
  { name: 'Bukit Hijau', cx: -60, cz: 60, color: '#4d8a3f' },
  { name: 'Kampus', cx: 0, cz: 60, color: '#7a5fd0' },
  { name: 'Pelabuhan', cx: 60, cz: 60, color: '#3d7ac9' },
];

export const JOBS = [
  { n: 1, name: 'Valet Shift at Plaza Merdeka', pay: '$120', district: 'Plaza Merdeka', status: 'DONE' },
  { n: 2, name: 'Deliver the Broombroom S1', pay: '$350', district: 'Kampung Kancil', status: 'ACTIVE' },
  { n: 3, name: 'Taxi Rush in Distrik Neon', pay: '$180', district: 'Distrik Neon', status: 'OPEN' },
  { n: 4, name: 'Angkot Route: Pasar Kanal', pay: '$95', district: 'Pasar Kanal', status: 'OPEN' },
  { n: 5, name: 'Midnight Run to Pelabuhan', pay: '$420', district: 'Pelabuhan', status: 'LOCKED' },
  { n: 6, name: 'Escape the Interceptor', pay: '$500', district: 'Marina Bay', status: 'LOCKED' },
  { n: 7, name: 'Grand Tour of Equator City', pay: '$250', district: 'Kota Tua', status: 'OPEN' },
];

const SHOPS = [
  { name: 'WARUNG KOPI', sub: 'KANCIL', bg: '#123f3a', fg: '#ffd23e' },
  { name: 'PASAR KANAL', sub: 'FRESH MARKET', bg: '#7a2a1a', fg: '#ffe9a8' },
  { name: 'TOKO BAJAJ', sub: 'SPARE PARTS', bg: '#1a3a6e', fg: '#ffffff' },
  { name: 'NEON BAR', sub: 'OPEN 24H', bg: '#2a0a2e', fg: '#ff5ec4' },
  { name: 'GARASI ARI', sub: 'RESPRAY • REPAIR', bg: '#222222', fg: '#ff2e88' },
  { name: 'BAKSO 88', sub: 'STREET FOOD', bg: '#8a2a2a', fg: '#ffe9a8' },
  { name: 'HOTEL EQUATOR', sub: 'ROOMS • ROOFTOP', bg: '#0e4a5a', fg: '#aee6ff' },
  { name: 'KANTOR POS', sub: 'PARCEL • MAIL', bg: '#5a4a0e', fg: '#fff3c4' },
];

const NEONS = ['NEON', 'BAR 24H', 'KARAOKE', 'RAMEN', 'DISCO', 'HOTEL'];

function building(scene, rng, night, x, z, w, d, h, base, registry) {
  const { map: tex, emissive } = facadeTextures(base, rng, night ? 0.55 : 0.14, night);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 14)));
  emissive.wrapS = THREE.RepeatWrapping; emissive.wrapT = THREE.RepeatWrapping;
  emissive.repeat.copy(tex.repeat);
  // R2 lesson: lit windows need a real emissive map, not just a bright texture.
  const side = new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: emissive, emissive: 0xffffff,
    emissiveIntensity: night ? 0.7 : 0.08, roughness: 0.85,
  });
  const roof = new THREE.MeshStandardMaterial({ color: 0x565660, roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
  m.position.set(x, h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if (registry) registry.push({ x, z, w, d, h });
  // rooftop box (AC / water tank) so roofs are not flat slabs
  if (rng.chance(0.7)) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 1.2, d * 0.25),
      new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.9 }));
    box.position.set(x + rng.range(-w * 0.2, w * 0.2), h + 0.6, z + rng.range(-d * 0.2, d * 0.2));
    scene.add(box);
  }
  return m;
}

function shopSign(scene, x, y, z, rotY, shop) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75),
    new THREE.MeshBasicMaterial({ map: signTexture(shop.name, shop.bg, shop.fg, shop.sub) }));
  p.position.set(x, y, z);
  p.rotation.y = rotY; // faces the street; text stays upright, never mirrored
  scene.add(p);
}

function streetlight(scene, x, z, night, poolTex) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.6 }));
  pole.position.y = 3; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x2a2f36 }));
  arm.position.set(0.7, 5.9, 0); g.add(arm);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc86a, emissiveIntensity: night ? 2.2 : 0.15 }));
  lamp.position.set(1.45, 5.8, 0); g.add(lamp);
  g.position.set(x, 0, z);
  scene.add(g);
  if (night) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x + 1.4, 0.06, z);
    scene.add(pool);
  }
}

function tree(scene, rng, x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 2.2 * s, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.95 }));
  trunk.position.y = 1.1 * s; g.add(trunk);
  const greens = [0x3f7a34, 0x4d8a3f, 0x5da24a];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1.0, 1.5) * s, 10, 8),
      new THREE.MeshStandardMaterial({ color: greens[i % 3], roughness: 0.9 }));
    f.position.set(rng.range(-0.6, 0.6) * s, (2.4 + i * 0.7) * s, rng.range(-0.6, 0.6) * s);
    f.castShadow = true; g.add(f);
  }
  g.position.set(x, 0, z);
  scene.add(g);
}

function pedestrian(scene, rng, x, z) {
  const g = new THREE.Group();
  const shirt = rng.pick([0xe84a4a, 0x3a6fd8, 0xffc21c, 0x7ac74f, 0xff7a1a, 0xffffff]);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 10),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 }));
  body.position.y = 1.0; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 }));
  head.position.y = 1.75; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.9 }));
  legs.position.y = 0.28; g.add(legs);
  g.position.set(x, 0, z);
  g.rotation.y = rng.range(0, Math.PI * 2);
  scene.add(g);
  return g;
}

export function buildCity(scene, rng, night) {
  const asphalt = asphaltTexture(rng);
  asphalt.wrapS = THREE.RepeatWrapping; asphalt.wrapT = THREE.RepeatWrapping;
  const pavement = pavementTexture(rng);
  pavement.wrapS = THREE.RepeatWrapping; pavement.wrapT = THREE.RepeatWrapping;
  const grass = grassTexture(rng);
  grass.wrapS = THREE.RepeatWrapping; grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(24, 24);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // Roads: grid at -90, -30, 30, 90 (width 12), both directions.
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 });
  const roadGeoH = new THREE.PlaneGeometry(260, 12);
  const roadGeoV = new THREE.PlaneGeometry(12, 260);
  for (const c of [-90, -30, 30, 90]) {
    const rh = new THREE.Mesh(roadGeoH, roadMat);
    rh.rotation.x = -Math.PI / 2; rh.position.set(0, 0.02, c); rh.receiveShadow = true; scene.add(rh);
    const rv = new THREE.Mesh(roadGeoV, roadMat);
    rv.rotation.x = -Math.PI / 2; rv.position.set(c, 0.02, 0); rv.receiveShadow = true; scene.add(rv);
    // dashed centre line — thin dashes, not stripes across the road
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c8 });
    for (let t = -120; t < 120; t += 8) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3), dashMat);
      d1.rotation.x = -Math.PI / 2; d1.position.set(t, 0.04, c); scene.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.35), dashMat);
      d2.rotation.x = -Math.PI / 2; d2.position.set(c, 0.04, t); scene.add(d2);
    }
  }

  // Sidewalks: pavement strips along every road.
  const walkMat = new THREE.MeshStandardMaterial({ map: pavement, roughness: 1 });
  for (const c of [-90, -30, 30, 90]) {
    for (const off of [-8.5, 8.5]) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(260, 5), walkMat);
      s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.03, c + off); scene.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 260), walkMat);
      s2.rotation.x = -Math.PI / 2; s2.position.set(c + off, 0.03, 0); scene.add(s2);
    }
  }

  // Blocks: buildings between roads. Block centres at -60, 0, 60.
  const bases = ['#b08a5a', '#8a7a6a', '#7a8a99', '#a87a6a', '#6a7a8a', '#9a8a7a', '#7a6a8a', '#8a9a7a'];
  const trafficSpots = [];
  const pedSpots = [];
  const parked = [];
  const buildings = [];
  let shopIdx = 0, neonIdx = 0;
  for (const bx of [-60, 0, 60]) {
    for (const bz of [-60, 0, 60]) {
      // Plaza Merdeka (0,0) stays open: fountain plaza, no buildings.
      if (bx === 0 && bz === 0) continue;
      // Bukit Hijau (-60,60): park block — grass + trees, no buildings.
      if (bx === -60 && bz === 60) {
        for (let i = 0; i < 10; i++) tree(scene, rng, bx + rng.range(-22, 22), bz + rng.range(-22, 22), rng.range(0.9, 1.4));
        continue;
      }
      const n = rng.int(3, 4);
      for (let i = 0; i < n; i++) {
        const w = rng.range(14, 22), d = rng.range(14, 22), h = rng.range(9, 30);
        const x = bx + rng.range(-18, 18), z = bz + rng.range(-18, 18);
        building(scene, rng, night, x, z, w, d, h, rng.pick(bases), buildings);
      }
      // One shop sign per block, on the face toward the nearest road (upright).
      const shop = SHOPS[shopIdx++ % SHOPS.length];
      const face = rng.pick(['N', 'S', 'E', 'W']);
      const sx = bx + (face === 'E' ? 24 : face === 'W' ? -24 : rng.range(-10, 10));
      const sz = bz + (face === 'S' ? 24 : face === 'N' ? -24 : rng.range(-10, 10));
      // South face looks toward +z; sign plane default faces +z, so S needs 0.
      // N face (toward -z) => PI, E (toward +x) => PI/2, W => -PI/2.
      const fixedRot = face === 'N' ? Math.PI : face === 'S' ? 0 : face === 'E' ? Math.PI / 2 : -Math.PI / 2;
      shopSign(scene, sx, 3.4, sz, fixedRot, shop);
      // Neon sign at night on some blocks (Distrik Neon always), at shop level
      // so it reads from the street — not floating high above the facade.
      if (night && (bx === 60 || rng.chance(0.4))) {
        const neon = NEONS[neonIdx++ % NEONS.length];
        const color = rng.pick(['#ff2e88', '#22e6ff', '#ffd23e', '#7aff5e']);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(8, 2),
          new THREE.MeshBasicMaterial({ map: neonTexture(neon, color), transparent: true }));
        p.position.set(bx + rng.range(-14, 14), rng.range(3.5, 5.5), bz + (rng.chance(0.5) ? 24.2 : -24.2));
        p.rotation.y = p.position.z > bz ? 0 : Math.PI;
        scene.add(p);
      }
      // Guaranteed neon on the avenue for the night shot: blade signs jutting
      // from the south facades, faces turned WEST (-x) toward the night camera
      // approaching down the avenue (R2 lesson: neon must face the camera —
      // a sign facing -z reads edge-on and skewed from this angle).
      if (night && bx === 60 && bz === 0) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2),
          new THREE.MeshBasicMaterial({ map: neonTexture('NEON', '#ff2e88'), transparent: true }));
        p.position.set(62, 4.6, -24.2);
        p.rotation.y = -Math.PI / 2;
        scene.add(p);
        const p2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 2),
          new THREE.MeshBasicMaterial({ map: neonTexture('BAR 24H', '#22e6ff'), transparent: true }));
        p2.position.set(74, 4.2, -24.2);
        p2.rotation.y = -Math.PI / 2;
        scene.add(p2);
      }
    }
  }

  // Deterministic shop signs for the cover shot, mounted on REAL building
  // south faces flanking the cover avenue (z = -30). Upright, facing the
  // camera (rotY 0 = faces +z) — never a -x/-z flip (R2 proved flips change
  // nothing; facing is what matters). Two DIFFERENT buildings, both inside
  // the cover frame (|x| <= 25); the sign on the wide face is shifted toward
  // the camera axis so it is fully in frame, not half-cut at the edge.
  const pickFace = (nearX, used) => {
    let best = null, bestScore = Infinity;
    for (const b of buildings) {
      if (used && b.x === used.x && b.z === used.z) continue;
      const face = b.z + b.d / 2; // south face, toward the avenue
      if (face > -24.5 || face < -50 || Math.abs(b.x) > 25) continue;
      const score = Math.abs(b.x - nearX) + Math.abs(face + 30) * 2;
      if (score < bestScore) { bestScore = score; best = { x: b.x, z: b.z, w: b.w, face }; }
    }
    return best;
  };
  const f1 = pickFace(-14, null);
  if (f1) shopSign(scene, Math.max(f1.x - 5, f1.x - f1.w / 2 + 3.6), 3.4, f1.face + 0.3, 0, SHOPS[0]);
  const f2 = pickFace(16, f1);
  if (f2) shopSign(scene, Math.max(f2.x - 5, f2.x - f2.w / 2 + 3.6), 3.4, f2.face + 0.3, 0, SHOPS[5]);

  // Plaza Merdeka fountain.
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.5, 1, 24),
    new THREE.MeshStandardMaterial({ color: 0x9a938a, roughness: 0.8 }));
  basin.position.set(0, 0.5, 0); scene.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a9ac9, roughness: 0.15, metalness: 0.4 }));
  water.position.set(0, 1.0, 0); scene.add(water);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8c98a, roughness: 0.4, metalness: 0.6 }));
  spire.position.set(0, 3.4, 0); scene.add(spire);

  // Streetlights along roads + parked cars + pedestrians.
  const poolTex = lightPoolTexture();
  for (const c of [-90, -30, 30, 90]) {
    for (let t = -110; t <= 110; t += 44) {
      streetlight(scene, t, c + 8.5, night, poolTex);
      streetlight(scene, c + 8.5, t, night, poolTex);
    }
  }
  const parkTypes = ['sedan', 'taxi', 'bajaj', 'pickup', 'angkot', 'sedan', 'taxi'];
  for (let i = 0; i < 14; i++) {
    const road = rng.pick([-90, -30, 30, 90]);
    const along = rng.range(-110, 110);
    const side = rng.chance(0.5) ? 1 : -1;
    const v = buildVehicle(parkTypes[i % parkTypes.length]);
    if (rng.chance(0.5)) { v.position.set(along, 0, road + side * 4.2); v.rotation.y = side > 0 ? 0 : Math.PI; }
    else { v.position.set(road + side * 4.2, 0, along); v.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
    scene.add(v);
    parked.push(v);
    trafficSpots.push({ x: v.position.x, z: v.position.z, rotY: v.rotation.y, type: v.userData.type });
  }
  for (let i = 0; i < 26; i++) {
    const road = rng.pick([-90, -30, 30, 90]);
    const along = rng.range(-110, 110);
    const side = rng.chance(0.5) ? 1 : -1;
    const x = rng.chance(0.5) ? along : road + side * 8.5;
    const z = rng.chance(0.5) ? along : road + side * 8.5;
    const p = pedestrian(scene, rng, x, z);
    pedSpots.push(p);
  }
  // Trees along sidewalks.
  for (const c of [-90, -30, 30, 90]) {
    for (let t = -100; t <= 100; t += 40) {
      tree(scene, rng, t + 12, c - 8.5, 0.9);
      tree(scene, rng, c - 8.5, t - 12, 0.9);
    }
  }
  return { trafficSpots, pedSpots, parked };
}
