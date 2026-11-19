// vehicles.js — real-geometry vehicles for Equator Drive (fresh, session revision-2).
// No plain boxes: every vehicle has body + cabin + glass + wheels + lights + type details.
import * as THREE from 'three';
import { signTexture } from './textures.js';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, ...opts });
}
function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function wheel(r, wdt) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, wdt, 18),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.55, r * 0.55, wdt + 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.3, metalness: 0.8 })
  );
  hub.rotation.z = Math.PI / 2;
  g.add(tire, hub);
  return g;
}
function addWheels(g, positions, r, wdt) {
  for (const [x, y, z] of positions) {
    const w = wheel(r, wdt);
    w.position.set(x, y, z);
    g.add(w);
  }
}
function headlights(g, z, y, spread, color = 0xfff2c0) {
  const m = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: color, emissiveIntensity: 1.6 });
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), m);
    l.position.set(s * spread, y, z);
    g.add(l);
  }
}
function taillights(g, z, y, spread) {
  const m = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xff2222, emissiveIntensity: 1.2 });
  for (const s of [-1, 1]) {
    const l = box(0.28, 0.12, 0.06, m, s * spread, y, z);
    g.add(l);
  }
}
function glassCabin(g, w, h, d, x, y, z) {
  const glass = new THREE.MeshStandardMaterial({ color: 0x182634, roughness: 0.15, metalness: 0.6 });
  g.add(box(w, h, d, glass, x, y, z));
}

export const VEHICLE_STATS = {
  hero: { name: 'Broombroom S1', cls: 'FAST / FUN', top: 62, accel: 26, grip: 0.92 },
  bajaj: { name: 'Bajaj Kancil', cls: 'NIMBLE', top: 34, accel: 18, grip: 0.8 },
  angkot: { name: 'Angkot 07', cls: 'HEAVY', top: 30, accel: 12, grip: 0.7 },
  pickup: { name: 'Pickup Bak', cls: 'HEAVY', top: 40, accel: 15, grip: 0.75 },
  sedan: { name: 'Sedan Kota', cls: 'BALANCED', top: 44, accel: 18, grip: 0.85 },
  taxi: { name: 'Taksi Equator', cls: 'BALANCED', top: 44, accel: 18, grip: 0.85 },
  police: { name: 'Polisi Sedan', cls: 'PURSUIT', top: 50, accel: 22, grip: 0.88 },
  interceptor: { name: 'Interceptor', cls: 'PURSUIT', top: 58, accel: 25, grip: 0.9 },
};

export function buildVehicle(type) {
  const g = new THREE.Group();
  g.userData.type = type;
  g.userData.stats = VEHICLE_STATS[type];

  if (type === 'hero') {
    // Broombroom S1 — open-frame electric buggy. Bright teal body, MAGENTA accents,
    // big off-road wheels, round headlights, visible roll cage + seats + rear motor.
    const body = mat(0x18b8a8);
    const magenta = mat(0xff2e88, { emissive: 0xff2e88, emissiveIntensity: 0.25 });
    g.add(box(1.9, 0.35, 3.4, body, 0, 0.55, 0));            // low chassis
    g.add(box(1.7, 0.28, 1.1, body, 0, 0.62, -1.25));        // rear deck, teal — reads as hero from behind
    g.add(box(1.5, 0.5, 1.0, mat(0x0d3f3a), 0, 0.85, 0.35)); // nose + dash block
    // magenta side stripes so the hero reads magenta/teal from every angle
    g.add(box(0.06, 0.14, 3.0, magenta, -0.98, 0.72, 0));
    g.add(box(0.06, 0.14, 3.0, magenta, 0.98, 0.72, 0));
    // roll cage: 4 tubes
    const tube = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.7 });
    for (const [x, z] of [[-0.8, 0.9], [0.8, 0.9], [-0.8, -0.9], [0.8, -0.9]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), tube);
      t.position.set(x, 1.1, z); g.add(t);
    }
    g.add(box(1.7, 0.07, 1.9, tube, 0, 1.55, 0));            // cage roof bar
    // seats
    g.add(box(0.6, 0.5, 0.6, mat(0x1a1a22), -0.42, 0.95, 0.1));
    g.add(box(0.6, 0.5, 0.6, mat(0x1a1a22), 0.42, 0.95, 0.1));
    // rear motor block + spoiler
    g.add(box(0.9, 0.5, 0.5, mat(0x30303a), 0, 0.95, -1.45));
    g.add(box(1.8, 0.06, 0.45, magenta, 0, 1.25, -1.6));
    // magenta fender flares over big wheels
    for (const [x, z] of [[-0.95, 1.15], [0.95, 1.15], [-0.95, -1.15], [0.95, -1.15]])
      g.add(box(0.3, 0.12, 0.9, magenta, x, 0.95, z));
    addWheels(g, [[-1.0, 0.42, 1.15], [1.0, 0.42, 1.15], [-1.0, 0.42, -1.15], [1.0, 0.42, -1.15]], 0.42, 0.34);
    headlights(g, 1.72, 0.85, 0.55);
    taillights(g, -1.73, 0.85, 0.6);
    return g;
  }

  if (type === 'bajaj') {
    // 3-wheel auto-rickshaw: yellow body, black cabin, single front wheel.
    const yellow = mat(0xffc21c);
    g.add(box(1.3, 0.5, 1.9, yellow, 0, 0.55, 0));
    glassCabin(g, 1.15, 0.55, 1.2, 0, 1.05, -0.1);
    g.add(box(1.34, 0.12, 1.95, mat(0x181818), 0, 1.38, -0.1)); // roof
    g.add(box(0.5, 0.4, 0.3, yellow, 0, 0.6, 1.05));           // nose
    addWheels(g, [[0, 0.3, 1.15], [-0.62, 0.3, -0.75], [0.62, 0.3, -0.75]], 0.3, 0.2);
    headlights(g, 1.2, 0.7, 0.2);
    taillights(g, -0.98, 0.7, 0.4);
    return g;
  }

  if (type === 'angkot') {
    // Colorful minibus: teal body, orange stripe, long window band, roof sign.
    const teal = mat(0x0e8a7a);
    g.add(box(1.9, 1.1, 3.8, teal, 0, 0.85, 0));
    g.add(box(1.92, 0.3, 3.82, mat(0xff7a1a), 0, 0.55, 0));   // orange stripe
    glassCabin(g, 1.7, 0.6, 3.2, 0, 1.45, 0);                // window band
    g.add(box(1.95, 0.12, 3.9, mat(0x123f3a), 0, 1.85, 0));   // roof
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3),
      new THREE.MeshBasicMaterial({ map: signTexture('ANGKOT 07', '#123f3a', '#ffd23e') }));
    sign.position.set(0, 2.0, 1.96); g.add(sign);
    addWheels(g, [[-0.95, 0.38, 1.25], [0.95, 0.38, 1.25], [-0.95, 0.38, -1.25], [0.95, 0.38, -1.25]], 0.38, 0.28);
    headlights(g, 1.92, 0.8, 0.6);
    taillights(g, -1.92, 0.8, 0.6);
    return g;
  }

  if (type === 'pickup') {
    const red = mat(0xb03024);
    g.add(box(1.85, 0.6, 4.2, red, 0, 0.7, 0));
    glassCabin(g, 1.6, 0.6, 1.2, 0, 1.25, 0.7);              // cab
    g.add(box(1.85, 0.5, 1.9, mat(0x2a2a2a), 0, 0.85, -1.1)); // bed (dark liner)
    g.add(box(1.9, 0.12, 2.0, red, 0, 1.15, -1.1));          // bed rails top
    // spare tyre in bed
    const spare = wheel(0.36, 0.22); spare.position.set(0, 1.05, -1.1); spare.rotation.x = Math.PI / 2; g.add(spare);
    addWheels(g, [[-0.92, 0.4, 1.35], [0.92, 0.4, 1.35], [-0.92, 0.4, -1.35], [0.92, 0.4, -1.35]], 0.4, 0.3);
    headlights(g, 2.12, 0.75, 0.6);
    taillights(g, -2.12, 0.75, 0.6);
    return g;
  }

  // sedan / taxi / police / interceptor share a sedan base, differ in livery.
  const liveries = {
    sedan: { body: 0x3a6fd8, roof: 0x2c55a8 },
    taxi: { body: 0xffc21c, roof: 0xffc21c },
    police: { body: 0xf2f2f2, roof: 0xf2f2f2 },
    interceptor: { body: 0x14141c, roof: 0x14141c },
  };
  const liv = liveries[type];
  g.add(box(1.85, 0.55, 4.4, mat(liv.body), 0, 0.62, 0));     // body
  g.add(box(1.7, 0.5, 2.2, mat(liv.roof), 0, 1.05, -0.2));    // roof line
  glassCabin(g, 1.6, 0.5, 2.0, 0, 1.12, -0.2);               // glasshouse
  g.add(box(1.8, 0.18, 0.9, mat(liv.body), 0, 0.78, 1.85));   // hood
  g.add(box(1.8, 0.18, 0.8, mat(liv.body), 0, 0.78, -1.85));  // trunk
  if (type === 'police') {
    g.add(box(1.86, 0.3, 1.6, mat(0x141414), 0, 0.62, 0));    // black doors band
    const bar = new THREE.Group();
    bar.add(box(0.5, 0.12, 0.24, new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }), -0.35, 0, 0));
    bar.add(box(0.5, 0.12, 0.24, new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 2 }), 0.35, 0, 0));
    bar.position.set(0, 1.38, -0.2); g.add(bar);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.26),
      new THREE.MeshBasicMaterial({ map: signTexture('TAXI', '#181818', '#ffd23e') }));
    sign.position.set(0, 1.42, -0.2); g.add(sign);
    g.add(box(0.9, 0.1, 0.3, mat(0x181818), 0, 1.32, -0.2));
  }
  if (type === 'interceptor') {
    g.add(box(1.8, 0.07, 0.5, mat(0x000000), 0, 1.15, -2.05)); // spoiler
    const bar = new THREE.Group();
    bar.add(box(0.4, 0.1, 0.2, new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }), -0.3, 0, 0));
    bar.add(box(0.4, 0.1, 0.2, new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 2 }), 0.3, 0, 0));
    bar.position.set(0, 1.34, -0.2); g.add(bar);
  }
  addWheels(g, [[-0.92, 0.38, 1.4], [0.92, 0.38, 1.4], [-0.92, 0.38, -1.4], [0.92, 0.38, -1.4]], 0.38, 0.28);
  headlights(g, 2.22, 0.7, 0.6);
  taillights(g, -2.22, 0.7, 0.6);
  return g;
}
