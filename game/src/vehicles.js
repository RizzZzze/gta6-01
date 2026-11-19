// vehicles.js — Real car geometry (body + cabin + glass + wheels + lights +
// bumpers), three handling classes plus the hero buggy, arcade driving with
// handbrake drift, damage, and spawn points that always have clear space
// around them (a parked car against a wall soft-locked a previous build).
import * as THREE from 'three';
import { makeRng, WORLD_SEED } from './rng.js';

export const VEHICLE_DEFS = {
  sedan:    { label: 'SEDAN', cls: 'balanced', topSpeed: 34, accel: 16, color: 0x3a6fd9, seats: 4 },
  taxi:     { label: 'TAXI', cls: 'balanced', topSpeed: 32, accel: 15, color: 0xffc21c, seats: 4 },
  police:   { label: 'POLICE CRUISER', cls: 'balanced', topSpeed: 38, accel: 18, color: 0xf2f2f2, seats: 4 },
  interceptor: { label: 'INTERCEPTOR', cls: 'balanced', topSpeed: 44, accel: 21, color: 0x1a1d24, seats: 4 },
  pickup:   { label: 'PICKUP', cls: 'heavy', topSpeed: 30, accel: 12, color: 0xb0432e, seats: 3 },
  angkot:   { label: 'ANGKOT', cls: 'heavy', topSpeed: 26, accel: 10, color: 0x2fae5a, seats: 8 },
  bajaj:    { label: 'BAJAJ', cls: 'nimble', topSpeed: 24, accel: 14, color: 0x19b8a6, seats: 3 },
  buggy:    { label: 'BROOMBROOM S1', cls: 'fast', topSpeed: 48, accel: 24, color: 0xff2e88, seats: 2 },
};

function mat(color, rough = 0.35, metal = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
const GLASS = new THREE.MeshStandardMaterial({ color: 0x1a2f45, roughness: 0.12, metalness: 0.7 });
const TIRE = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });
const HUB = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.35, metalness: 0.8 });
const LIGHT_FRONT = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffedb0, emissiveIntensity: 0.9 });
const LIGHT_REAR = new THREE.MeshStandardMaterial({ color: 0xff2a22, emissive: 0xff2a22, emissiveIntensity: 0.7 });

function addBox(group, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true;
  group.add(m); return m;
}
function addWheel(group, x, y, z, r) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 14), TIRE);
  tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.36, 10), HUB);
  hub.rotation.z = Math.PI / 2; g.add(hub);
  g.position.set(x, y, z);
  group.add(g); return g;
}

// Builds a car that reads as a car: lower body, cabin with glass, roof,
// wheels, bumpers, headlights and taillights. Length ~4.4 m, width ~1.9 m.
export function makeCarMesh(type, colorOverride) {
  const def = VEHICLE_DEFS[type];
  const color = colorOverride !== undefined ? colorOverride : def.color;
  const g = new THREE.Group();
  g.name = 'car-' + type;
  const body = mat(color);
  const wheels = [];
  if (type === 'bajaj') {
    addBox(g, 1.5, 0.55, 2.6, body, 0, 0.62, 0);
    addBox(g, 1.35, 0.75, 1.5, GLASS, 0, 1.25, -0.2);
    addBox(g, 1.45, 0.12, 1.6, mat(0x222831, 0.7, 0.2), 0, 1.68, -0.2);
    addBox(g, 1.5, 0.18, 0.3, mat(0x222831), 0, 0.45, 1.35);
    addBox(g, 0.5, 0.3, 0.2, LIGHT_FRONT, -0.45, 0.75, 1.32);
    addBox(g, 0.5, 0.3, 0.2, LIGHT_FRONT, 0.45, 0.75, 1.32);
    wheels.push(addWheel(g, 0, 0.36, 1.05, 0.36));
    wheels.push(addWheel(g, -0.68, 0.36, -0.95, 0.36));
    wheels.push(addWheel(g, 0.68, 0.36, -0.95, 0.36));
    return { group: g, wheels, frontWheels: [wheels[0]], length: 2.6, width: 1.5 };
  }
  if (type === 'buggy') {
    // Open-frame electric buggy: exposed chassis, roll cage, big wheels.
    addBox(g, 1.7, 0.3, 3.6, mat(0x1c1f26, 0.5, 0.6), 0, 0.55, 0);
    addBox(g, 1.5, 0.5, 1.9, body, 0, 0.85, 0.2);
    addBox(g, 1.3, 0.45, 1.0, mat(0x222831, 0.6, 0.2), 0, 1.2, -0.4);
    const cage = mat(0xff2e88, 0.4, 0.6);
    for (const sx of [-0.7, 0.7]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), cage);
      bar.position.set(sx, 1.5, -0.5); bar.rotation.x = 0.35; g.add(bar);
      const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), cage);
      bar2.position.set(sx, 1.5, 0.5); bar2.rotation.x = -0.3; g.add(bar2);
    }
    addBox(g, 1.5, 0.1, 1.4, cage, 0, 2.15, 0);
    addBox(g, 1.7, 0.16, 0.5, LIGHT_FRONT, 0, 0.8, 1.82);
    addBox(g, 1.6, 0.14, 0.2, LIGHT_REAR, 0, 0.85, -1.82);
    addBox(g, 1.2, 0.5, 0.25, mat(0x111318), 0, 0.6, -1.85);
    wheels.push(addWheel(g, -0.85, 0.5, 1.25, 0.5));
    wheels.push(addWheel(g, 0.85, 0.5, 1.25, 0.5));
    wheels.push(addWheel(g, -0.85, 0.5, -1.25, 0.5));
    wheels.push(addWheel(g, 0.85, 0.5, -1.25, 0.5));
    return { group: g, wheels, frontWheels: [wheels[0], wheels[1]], length: 3.6, width: 1.7 };
  }
  const isVan = type === 'angkot';
  const L = isVan ? 4.6 : 4.4, W = isVan ? 2.0 : 1.9;
  addBox(g, W, 0.62, L, body, 0, 0.62, 0);
  // Cabin + glass band + roof.
  const cabL = isVan ? 3.6 : 2.3, cabZ = isVan ? 0.1 : -0.25;
  addBox(g, W - 0.22, 0.55, cabL, GLASS, 0, 1.18, cabZ);
  addBox(g, W - 0.1, 0.1, cabL + 0.1, body, 0, 1.5, cabZ);
  if (type === 'pickup') {
    addBox(g, W - 0.3, 0.5, 1.4, body, 0, 1.05, -1.3);
    addBox(g, W - 0.5, 0.1, 1.3, mat(0x222831, 0.7, 0.2), 0, 1.32, -1.3);
    addBox(g, W - 0.24, 0.45, 1.5, mat(0x2a2e35, 0.8, 0.3), 0, 0.95, 1.35);
  }
  if (type === 'angkot') {
    // Colorful side stripe + big side windows.
    addBox(g, 0.08, 0.5, 3.4, mat(0xffc21c, 0.5, 0.2), -W / 2 - 0.02, 0.95, 0);
    addBox(g, 0.08, 0.5, 3.4, mat(0xff2e88, 0.5, 0.2), W / 2 + 0.02, 0.95, 0);
    addBox(g, W - 0.3, 0.4, 0.5, mat(0xffffff, 0.5, 0.1), 0, 1.62, 1.9);
  }
  if (type === 'taxi') {
    addBox(g, W - 0.4, 0.22, 0.5, mat(0x111318, 0.5, 0.3), 0, 1.62, cabZ);
    addBox(g, 0.9, 0.18, 0.4, LIGHT_FRONT, 0, 1.72, cabZ);
  }
  if (type === 'police' || type === 'interceptor') {
    addBox(g, W, 0.3, L, mat(0x14161c, 0.5, 0.4), 0, 0.45, 0);
    addBox(g, 1.1, 0.28, 0.5, new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.2 }), -0.4, 1.62, cabZ);
    addBox(g, 1.1, 0.28, 0.5, new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.2 }), 0.4, 1.62, cabZ);
    if (type === 'police') addBox(g, W - 0.3, 0.5, 0.6, mat(0xffffff, 0.5, 0.1), 0, 1.0, 0);
  }
  // Bumpers, headlights, taillights, grille.
  addBox(g, W + 0.06, 0.22, 0.28, mat(0x222831, 0.6, 0.4), 0, 0.42, L / 2 + 0.05);
  addBox(g, W + 0.06, 0.22, 0.28, mat(0x222831, 0.6, 0.4), 0, 0.42, -L / 2 - 0.05);
  addBox(g, 0.55, 0.22, 0.1, LIGHT_FRONT, -W / 2 + 0.35, 0.78, L / 2 + 0.08);
  addBox(g, 0.55, 0.22, 0.1, LIGHT_FRONT, W / 2 - 0.35, 0.78, L / 2 + 0.08);
  addBox(g, 0.55, 0.2, 0.1, LIGHT_REAR, -W / 2 + 0.35, 0.78, -L / 2 - 0.08);
  addBox(g, 0.55, 0.2, 0.1, LIGHT_REAR, W / 2 - 0.35, 0.78, -L / 2 - 0.08);
  addBox(g, 0.9, 0.18, 0.08, mat(0x111318, 0.5, 0.6), 0, 0.72, L / 2 + 0.08);
  const wr = isVan ? 0.42 : 0.38;
  wheels.push(addWheel(g, -W / 2 + 0.05, wr, L / 2 - 0.85, wr));
  wheels.push(addWheel(g, W / 2 - 0.05, wr, L / 2 - 0.85, wr));
  wheels.push(addWheel(g, -W / 2 + 0.05, wr, -L / 2 + 0.85, wr));
  wheels.push(addWheel(g, W / 2 - 0.05, wr, -L / 2 + 0.85, wr));
  return { group: g, wheels, frontWheels: [wheels[0], wheels[1]], length: L, width: W };
}

// --- Driving model -------------------------------------------------------
export class Vehicle {
  constructor(type, colorOverride, x, z, heading) {
    this.type = type;
    this.def = VEHICLE_DEFS[type];
    const built = makeCarMesh(type, colorOverride);
    this.mesh = built.group;
    this.wheels = built.wheels;
    this.frontWheels = built.frontWheels;
    this.length = built.length;
    this.width = built.width;
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.condition = 100;
    this.drifting = false;
    this.driftScore = 0;
    this.smokeTimer = 0;
    this.ai = null; // {kind:'traffic'|'police', ...} when AI-driven
    this.stolen = false;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
  }
  get label() { return this.def.label; }

  // Circle vs building AABB push-out. Returns true when a push happened.
  resolveColliders(colliders) {
    const r = Math.max(this.length, this.width) / 2 - 0.3;
    let pushed = false;
    for (const c of colliders) {
      const nx = Math.max(c.x - c.hw, Math.min(this.x, c.x + c.hw));
      const nz = Math.max(c.z - c.hd, Math.min(this.z, c.z + c.hd));
      const dx = this.x - nx, dz = this.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.001;
        const push = (r - d);
        this.x += (dx / d) * push;
        this.z += (dz / d) * push;
        this.speed *= 0.4;
        pushed = true;
      }
    }
    return pushed;
  }

  drive(input, dt, colliders, onDrift) {
    const def = this.def;
    const forward = input.forward ? 1 : 0;
    const back = input.back ? 1 : 0;
    if (forward) this.speed += def.accel * dt;
    else if (back) this.speed -= def.accel * 0.8 * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    const grip = input.handbrake ? 0.35 : 1;
    const topSpeed = this.topSpeedOverride || def.topSpeed;
    this.speed = Math.max(-topSpeed * 0.45, Math.min(topSpeed, this.speed));
    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const speedFactor = Math.min(1, Math.abs(this.speed) / 12);
    this.heading += this.steer * 1.9 * speedFactor * Math.sign(this.speed || 1) * dt * grip;
    const slip = input.handbrake && Math.abs(this.speed) > 8;
    this.drifting = slip;
    if (slip) {
      // Lateral slide while drifting, plus score.
      const lat = Math.sin(this.heading) * 0 + 1;
      this.x += Math.cos(this.heading + Math.PI / 2) * this.steer * 2.2 * dt * lat;
      this.z -= Math.sin(this.heading + Math.PI / 2) * this.steer * 2.2 * dt * lat;
      this.driftScore += Math.abs(this.speed) * dt * 4;
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0 && onDrift) { onDrift(this); this.smokeTimer = 0.09; }
    }
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    // World bounds: soft wall at the rim.
    this.x = Math.max(-234, Math.min(234, this.x));
    this.z = Math.max(-234, Math.min(234, this.z));
    const hitWall = this.resolveColliders(colliders);
    if (hitWall && Math.abs(this.speed) > 6) this.damage(2);
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const spin = (this.speed * dt) / 0.38;
    for (const w of this.wheels) w.rotation.x += spin;
    for (const w of this.frontWheels) w.rotation.y = this.steer * 0.42;
  }

  damage(amount) {
    this.condition = Math.max(0, this.condition - amount);
    if (this.condition < 35) this.speed = Math.min(this.speed, 12);
  }
  repair() { this.condition = 100; }
}

// --- Spawning ------------------------------------------------------------
// A spawn is only valid when the circle around it is clear of every
// collider and of every other vehicle: parked cars never touch a wall.
export function clearAround(x, z, radius, colliders, vehicles) {
  for (const c of colliders) {
    const nx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
    const nz = Math.max(c.z - c.hd, Math.min(z, c.z + c.hd));
    const dx = x - nx, dz = z - nz;
    if (dx * dx + dz * dz < radius * radius) return false;
  }
  for (const v of vehicles || []) {
    const dx = x - v.x, dz = z - v.z;
    if (dx * dx + dz * dz < (radius + 2) * (radius + 2)) return false;
  }
  return true;
}

// Parked cars sit on road lanes (multiples of 60, offset 3.5 m to the side),
// never inside a block, so a player can always drive out of the spawn.
export function parkedSpawnPoints(rng, colliders, count) {
  const points = [];
  const lanes = [-180, -120, -60, 0, 60, 120, 180];
  let guard = 0;
  while (points.length < count && guard++ < 400) {
    const along = rng.pick(lanes);
    const across = rng.range(-210, 210);
    const vertical = rng.chance(0.5);
    const x = vertical ? along + 3.5 : across;
    const z = vertical ? across : along + 3.5;
    const heading = vertical ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    if (clearAround(x, z, 4.2, colliders, points)) points.push({ x, z, heading });
  }
  return points;
}
export function randomRoadPoint(rng) {
  const lanes = [-180, -120, -60, 0, 60, 120, 180];
  const vertical = rng.chance(0.5);
  const along = rng.pick(lanes);
  const across = rng.range(-210, 210);
  return vertical
    ? { x: along, z: across, heading: rng.chance(0.5) ? 0 : Math.PI }
    : { x: across, z: along, heading: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
}
