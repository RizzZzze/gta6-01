// vehicles.js — real vehicle bodies for Equator Drive (no plain boxes).
// Every car is an assembly: body + cabin glass + wheels with hubs + lights + bumpers + type details.
import * as THREE from '../vendor/three.module.min.js';

function mat(color, rough = 0.45, metal = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function glassMat() {
  return new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.12, metalness: 0.9, transparent: true, opacity: 0.72 });
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z); mesh.castShadow = true;
  return mesh;
}
function wheelSet(group, positions, radius, width) {
  const tire = mat(0x14161a, 0.95, 0.05);
  const hub = mat(0xd8dde2, 0.3, 0.85);
  for (const [x, y, z] of positions) {
    const w = cyl(radius, radius, width, tire, x, y, z, 18);
    w.rotation.z = Math.PI / 2;
    const h = cyl(radius * 0.55, radius * 0.55, width + 0.02, hub, x, y, z, 12);
    h.rotation.z = Math.PI / 2;
    group.add(w, h);
  }
}
function lights(group, frontZ, rearZ, w) {
  const head = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe89a, emissiveIntensity: 1.6 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xcc0000, emissiveIntensity: 1.2 });
  group.add(box(0.34, 0.16, 0.06, head, -w / 2 + 0.3, 0.62, frontZ));
  group.add(box(0.34, 0.16, 0.06, head, w / 2 - 0.3, 0.62, frontZ));
  group.add(box(0.3, 0.14, 0.06, tail, -w / 2 + 0.3, 0.62, rearZ));
  group.add(box(0.3, 0.14, 0.06, tail, w / 2 - 0.3, 0.62, rearZ));
  // grille + bumpers
  group.add(box(w - 0.5, 0.18, 0.08, mat(0x22252a, 0.6, 0.4), 0, 0.45, frontZ + 0.02));
  group.add(box(w + 0.06, 0.16, 0.1, mat(0x9aa0a8, 0.35, 0.8), 0, 0.32, frontZ + 0.03));
  group.add(box(w + 0.06, 0.16, 0.1, mat(0x9aa0a8, 0.35, 0.8), 0, 0.32, rearZ - 0.03));
}

export function buildVehicle(type, colorHex) {
  const g = new THREE.Group();
  const body = mat(colorHex, 0.38, 0.6);
  const dark = mat(0x1c1e22, 0.7, 0.3);
  const glass = glassMat();
  let L = 4.2, W = 1.9; // length (z), width (x)
  if (type === 'sedan' || type === 'taxi') {
    L = 4.4; W = 1.9;
    g.add(box(W, 0.62, L, body, 0, 0.62, 0));
    const cabin = box(W - 0.28, 0.55, L * 0.48, glass, 0, 1.18, -0.2); g.add(cabin);
    g.add(box(W - 0.2, 0.1, L * 0.5, body, 0, 1.48, -0.2)); // roof
    g.add(box(W - 0.34, 0.5, 0.1, dark, 0, 1.18, L * 0.22)); // windshield frame
    wheelSet(g, [[-W / 2 + 0.12, 0.36, 1.35], [W / 2 - 0.12, 0.36, 1.35], [-W / 2 + 0.12, 0.36, -1.35], [W / 2 - 0.12, 0.36, -1.35]], 0.36, 0.26);
    lights(g, L / 2 + 0.02, -L / 2 - 0.02, W);
    if (type === 'taxi') {
      g.add(box(0.9, 0.18, 0.4, mat(0xffc400, 0.4, 0.3), 0, 1.62, -0.2));
      g.add(box(W + 0.02, 0.22, L * 0.7, mat(0xffc400, 0.5, 0.3), 0, 0.78, 0));
    }
  } else if (type === 'pickup') {
    L = 4.8; W = 2.0;
    g.add(box(W, 0.66, L, body, 0, 0.64, 0));
    g.add(box(W - 0.3, 0.6, 1.5, glass, 0, 1.24, 1.15));
    g.add(box(W - 0.22, 0.1, 1.5, body, 0, 1.56, 1.15));
    // open bed with rails + crates
    g.add(box(W - 0.16, 0.34, 0.08, dark, 0, 1.12, -1.7));
    g.add(box(0.08, 0.34, 2.2, dark, -W / 2 + 0.06, 1.12, -0.9));
    g.add(box(0.08, 0.34, 2.2, dark, W / 2 - 0.06, 1.12, -0.9));
    g.add(box(0.7, 0.5, 0.7, mat(0x8a6b3f, 0.9, 0.0), -0.4, 1.22, -1.0));
    g.add(box(0.6, 0.4, 0.6, mat(0x5f7d4a, 0.9, 0.0), 0.45, 1.17, -1.15));
    wheelSet(g, [[-W / 2 + 0.12, 0.4, 1.5], [W / 2 - 0.12, 0.4, 1.5], [-W / 2 + 0.12, 0.4, -1.5], [W / 2 - 0.12, 0.4, -1.5]], 0.4, 0.3);
    lights(g, L / 2 + 0.02, -L / 2 - 0.02, W);
    g.add(box(W - 0.6, 0.3, 0.1, mat(0xd8dde2, 0.3, 0.8), 0, 0.9, L / 2 + 0.01)); // bull bar
  } else if (type === 'angkot') {
    L = 4.6; W = 2.0;
    g.add(box(W, 1.5, L, body, 0, 1.05, 0));
    g.add(box(W - 0.2, 0.9, L - 0.9, glass, 0, 1.55, -0.1));
    g.add(box(W - 0.1, 0.14, L, body, 0, 2.06, 0)); // roof
    // rainbow stripe + side windows frames
    const stripes = [0xff5a5f, 0xffb400, 0x19b8a6, 0x7c5cff];
    stripes.forEach((c, i) => g.add(box(0.06, 0.22, L - 0.4, mat(c, 0.5, 0.3), -W / 2 - 0.01, 0.95 + i * 0.02, 0)));
    g.add(box(1.1, 0.24, 0.5, mat(0xffffff, 0.5, 0.2), 0, 2.2, 0.6));
    wheelSet(g, [[-W / 2 + 0.12, 0.38, 1.45], [W / 2 - 0.12, 0.38, 1.45], [-W / 2 + 0.12, 0.38, -1.45], [W / 2 - 0.12, 0.38, -1.45]], 0.38, 0.28);
    lights(g, L / 2 + 0.02, -L / 2 - 0.02, W);
  } else if (type === 'bajaj') {
    L = 2.7; W = 1.35;
    g.add(box(W, 0.5, L, body, 0, 0.55, 0));
    // rounded canopy: half-cylinder shell + windshield
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, L * 0.62, 16, 1, false, 0, Math.PI), mat(colorHex, 0.5, 0.4));
    canopy.rotation.z = Math.PI / 2; canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 0.95, -0.25); canopy.castShadow = true; g.add(canopy);
    g.add(box(W - 0.3, 0.55, 0.08, glass, 0, 1.0, 0.95));
    g.add(box(0.5, 0.3, 0.3, mat(0xffe89a, 0.4, 0.2), 0, 0.62, L / 2 + 0.05)); // headlamp pod
    g.add(box(W + 0.04, 0.12, 0.3, dark, 0, 0.32, -L / 2));
    wheelSet(g, [[0, 0.3, 1.05], [-W / 2 + 0.08, 0.3, -0.9], [W / 2 - 0.08, 0.3, -0.9]], 0.3, 0.22);
    g.userData.threeWheeler = true;
  } else if (type === 'police') {
    L = 4.5; W = 1.95;
    g.add(box(W, 0.62, L, mat(0xf2f2f2, 0.38, 0.6), 0, 0.62, 0));
    g.add(box(W, 0.62, L * 0.45, mat(0x14161a, 0.5, 0.5), 0, 0.62, -0.7)); // black rear doors
    g.add(box(W - 0.28, 0.55, L * 0.48, glass, 0, 1.18, -0.2));
    g.add(box(W - 0.2, 0.1, L * 0.5, mat(0xf2f2f2, 0.4, 0.6), 0, 1.48, -0.2));
    wheelSet(g, [[-W / 2 + 0.12, 0.36, 1.35], [W / 2 - 0.12, 0.36, 1.35], [-W / 2 + 0.12, 0.36, -1.35], [W / 2 - 0.12, 0.36, -1.35]], 0.36, 0.26);
    lights(g, L / 2 + 0.02, -L / 2 - 0.02, W);
    // light bar: red + blue beacons
    const red = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2.2 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0022ff, emissiveIntensity: 2.2 });
    const barR = box(0.5, 0.16, 0.3, red, -0.32, 1.6, -0.2); barR.name = 'beaconR';
    const barB = box(0.5, 0.16, 0.3, blue, 0.32, 1.6, -0.2); barB.name = 'beaconB';
    g.add(barR, barB);
    g.add(box(W - 0.4, 0.3, 0.06, mat(0xffffff, 0.5, 0.2), 0, 0.9, L / 2 + 0.01));
  } else { // broombroom — open-frame electric buggy, hero car
    L = 4.3; W = 2.1;
    const frame = mat(0x1a1c20, 0.5, 0.7);
    const accent = mat(0xff2e88, 0.35, 0.6);
    // low floor pan + nose
    g.add(box(W - 0.5, 0.3, L, mat(0x22252c, 0.5, 0.6), 0, 0.5, 0));
    g.add(box(W - 0.7, 0.42, 1.1, accent, 0, 0.72, 1.55)); // magenta nose cone
    g.add(box(0.5, 0.16, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccf2ff, emissiveIntensity: 2 }), -0.6, 0.72, 2.12));
    g.add(box(0.5, 0.16, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccf2ff, emissiveIntensity: 2 }), 0.6, 0.72, 2.12));
    // roll cage tubes
    const tube = (x1, y1, z1, x2, y2, z2) => {
      const dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
      const len = dir.length();
      const m = cyl(0.06, 0.06, len, frame, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, 8);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      g.add(m);
    };
    tube(-0.8, 0.6, 1.2, -0.8, 1.55, 0.1); tube(0.8, 0.6, 1.2, 0.8, 1.55, 0.1);
    tube(-0.8, 0.6, -1.2, -0.8, 1.5, -0.6); tube(0.8, 0.6, -1.2, 0.8, 1.5, -0.6);
    tube(-0.8, 1.55, 0.1, -0.8, 1.5, -0.6); tube(0.8, 1.55, 0.1, 0.8, 1.5, -0.6);
    tube(-0.8, 1.55, 0.1, 0.8, 1.55, 0.1);
    // seats + steering + battery pack
    g.add(box(0.62, 0.5, 0.55, mat(0x222831, 0.85, 0.1), -0.42, 0.95, -0.35));
    g.add(box(0.62, 0.5, 0.55, mat(0x222831, 0.85, 0.1), 0.42, 0.95, -0.35));
    g.add(box(0.62, 0.7, 0.12, mat(0x222831, 0.85, 0.1), -0.42, 1.25, -0.62));
    g.add(box(0.62, 0.7, 0.12, mat(0x222831, 0.85, 0.1), 0.42, 1.25, -0.62));
    g.add(box(1.2, 0.22, 0.9, accent, 0, 0.68, 0.7)); // battery / dash block
    const wheel = cyl(0.16, 0.16, 0.06, dark, -0.42, 1.15, 0.45, 12); wheel.rotation.x = Math.PI / 2.4; g.add(wheel);
    // big off-road wheels with chunky tread
    wheelSet(g, [[-W / 2 + 0.05, 0.52, 1.35], [W / 2 - 0.05, 0.52, 1.35], [-W / 2 + 0.05, 0.52, -1.35], [W / 2 - 0.05, 0.52, -1.35]], 0.52, 0.42);
    // magenta side pods so the hero reads from every angle, not just the nose
    g.add(box(0.16, 0.3, 2.4, accent, -1.02, 0.78, 0.2));
    g.add(box(0.16, 0.3, 2.4, accent, 1.02, 0.78, 0.2));
    g.add(box(1.5, 0.1, 0.5, accent, 0, 0.62, -1.9)); // magenta rear deck
    // rear wing + light bar
    g.add(box(1.7, 0.08, 0.4, accent, 0, 1.45, -1.95));
    g.add(box(0.12, 0.5, 0.3, frame, -0.7, 1.2, -1.95)); g.add(box(0.12, 0.5, 0.3, frame, 0.7, 1.2, -1.95));
    g.add(box(1.4, 0.14, 0.08, new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 1.4 }), 0, 0.7, -L / 2 - 0.02));
    g.userData.hero = true;
  }
  g.userData.length = L; g.userData.width = W; g.userData.type = type;
  return g;
}

export function buildPerson(shirt, pants, skin = 0xc98e6b) {
  const g = new THREE.Group();
  const s = mat(shirt, 0.85, 0.0), p = mat(pants, 0.9, 0.0), sk = mat(skin, 0.8, 0.0);
  const torso = box(0.5, 0.62, 0.28, s, 0, 1.08, 0); torso.name = 'torso';
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), sk);
  head.position.set(0, 1.58, 0); head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 10, 0, Math.PI * 2, 0, 1.4), mat(0x1a1210, 0.95, 0));
  hair.position.set(0, 1.62, -0.02); g.add(hair);
  const legL = box(0.19, 0.72, 0.2, p, -0.14, 0.36, 0); legL.name = 'legL';
  const legR = box(0.19, 0.72, 0.2, p, 0.14, 0.36, 0); legR.name = 'legR';
  const armL = box(0.14, 0.58, 0.15, s, -0.33, 1.08, 0); armL.name = 'armL';
  const armR = box(0.14, 0.58, 0.15, s, 0.33, 1.08, 0); armR.name = 'armR';
  g.add(torso, legL, legR, armL, armR);
  g.userData.parts = { legL, legR, armL, armR, torso };
  return g;
}

export function buildAri() {
  const g = buildPerson(0x0e7d74, 0x22303c);
  // teal valet jacket trim + cap + name presence
  const cap = cyl(0.22, 0.23, 0.1, mat(0x0e7d74, 0.8, 0.1), 0, 1.76, 0, 14);
  g.add(cap);
  g.add(box(0.24, 0.04, 0.22, mat(0x0e7d74, 0.8, 0.1), 0, 1.74, 0.2));
  g.add(box(0.52, 0.08, 0.3, mat(0xffc400, 0.6, 0.2), 0, 1.28, 0));
  return g;
}
