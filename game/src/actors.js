// actors.js — Pedestrians, traffic AI, police AI with named units, the
// wanted system, on-foot combat and drift smoke. All movement is seeded.
import * as THREE from 'three';
import { makeRng, WORLD_SEED } from './rng.js';
import { Vehicle, randomRoadPoint, clearAround } from './vehicles.js';

export const POLICE_CALLSIGNS = ['ALBATROSS', 'FRIGATEBIRD', 'TERN', 'CORMORANT', 'PELICAN'];
export const WANTED_TIERS = [
  { stars: 0, label: 'No units assigned.', units: [] },
  { stars: 1, label: 'Patrol', units: ['police'] },
  { stars: 2, label: 'Interceptor', units: ['police', 'interceptor'] },
  { stars: 3, label: 'Roadblock', units: ['police', 'interceptor', 'police'] },
];

const PED_COLORS = [0xd94f4f, 0x4f7dd9, 0x4fd97a, 0xd9b04f, 0x9a4fd9, 0xe8e8e8, 0x2a2a2a, 0xff8ac2];
export function makePedestrianMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: rng.pick(PED_COLORS), roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: [0xe8b98a, 0xc98a5a, 0x8a5a34][rng.int(0, 2)], roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.85, 8), shirt);
  body.position.y = 0.95; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.62; head.castShadow = true; g.add(head);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.95 });
  for (const sx of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 6), legMat);
    leg.position.set(sx, 0.28, 0); g.add(leg);
  }
  return g;
}

export class Pedestrian {
  constructor(scene, rng, x, z) {
    this.mesh = makePedestrianMesh(rng);
    this.x = x; this.z = z;
    this.heading = rng.range(0, Math.PI * 2);
    this.speed = rng.range(0.8, 1.6);
    this.walkPhase = rng.range(0, Math.PI * 2);
    this.targetX = x; this.targetZ = z;
    this.pickTarget(rng);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.rng = rng;
  }
  pickTarget(rng) {
    // Walk along sidewalks: pick a nearby road lane and a point on it.
    const lanes = [-180, -120, -60, 0, 60, 120, 180];
    const lane = rng.pick(lanes);
    if (rng.chance(0.5)) { this.targetX = lane + 8; this.targetZ = rng.range(-210, 210); }
    else { this.targetX = rng.range(-210, 210); this.targetZ = lane + 8; }
  }
  update(dt) {
    const dx = this.targetX - this.x, dz = this.targetZ - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.5) { this.pickTarget(this.rng); return; }
    this.heading = Math.atan2(dx, dz);
    this.x += (dx / d) * this.speed * dt;
    this.z += (dz / d) * this.speed * dt;
    this.walkPhase += dt * 7;
    this.mesh.position.set(this.x, Math.abs(Math.sin(this.walkPhase)) * 0.05, this.z);
    this.mesh.rotation.y = this.heading;
  }
}

// Traffic cars follow road lanes and turn at intersections, seeded.
export class TrafficCar {
  constructor(scene, type, color, rng) {
    const p = randomRoadPoint(rng);
    this.vehicle = new Vehicle(type, color, p.x, p.z, p.heading);
    this.vehicle.ai = { kind: 'traffic' };
    this.rng = rng;
    this.turnAt = rng.range(30, 90);
    this.traveled = 0;
    scene.add(this.vehicle.mesh);
  }
  update(dt, colliders, vehicles) {
    const v = this.vehicle;
    this.traveled += Math.abs(v.speed) * dt;
    if (this.traveled > this.turnAt) {
      this.traveled = 0;
      this.turnAt = v.rng ? 60 : this.rng.range(40, 110);
      // Turn left or right at the next intersection (snap to a lane).
      v.heading += (this.rng.chance(0.5) ? 1 : -1) * Math.PI / 2;
      v.x = Math.round(v.x / 60) * 60;
      v.z = Math.round(v.z / 60) * 60;
    }
    v.drive({ forward: true, back: false, left: false, right: false, handbrake: false }, dt, colliders, null);
    v.speed = Math.min(v.speed, v.def.topSpeed * 0.55);
  }
}

// --- Police ---------------------------------------------------------------
export class PoliceUnit {
  constructor(scene, type, callsign, number, x, z, heading) {
    this.vehicle = new Vehicle(type, undefined, x, z, heading);
    this.vehicle.ai = { kind: 'police' };
    this.callsign = callsign;
    this.number = number;
    this.state = 'Pursuing';
    scene.add(this.vehicle.mesh);
  }
  get label() { return this.callsign + ' ' + this.number; }
  distanceTo(px, pz) { return Math.hypot(this.vehicle.x - px, this.vehicle.z - pz); }
  update(dt, px, pz, colliders) {
    const v = this.vehicle;
    if (v.ai && v.ai.kind === 'escort') {
      // Scripted escort (shot staging only): hold a lane 5 m to the side
      // of the player at matched speed, instead of pursuing from behind.
      const targetX = px + (this.flank || 0);
      const dxLane = targetX - v.x;
      v.drive({ forward: true, back: false, left: dxLane < -0.5, right: dxLane > 0.5, handbrake: false }, dt, colliders, null);
      v.speed = Math.min(v.speed, 47);
      this.state = 'Pursuing';
      return;
    }
    // Flank offset: ride alongside the player instead of tailgating
    // directly behind (invisible from a chase camera). The offset is
    // lateral to the bearing to the player, one side per unit.
    const bearing = Math.atan2(px - v.x, pz - v.z);
    const flank = this.flank || 0;
    const tx = px + Math.cos(bearing) * flank;
    const tz = pz - Math.sin(bearing) * flank;
    const dx = tx - v.x, dz = tz - v.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const input = {
      forward: dist > 6,
      back: false,
      left: diff > 0.12,
      right: diff < -0.12,
      handbrake: false,
    };
    v.drive(input, dt, colliders, null);
    v.speed = Math.min(v.speed, (v.topSpeedOverride || v.def.topSpeed) * 0.92);
    this.state = dist < 12 ? 'On scene' : dist < 40 ? 'Closing in' : 'Pursuing';
  }
}

export class WantedManager {
  constructor() { this.stars = 0; this.heat = 0; this.cooldown = 0; }
  addHeat(amount) {
    this.heat += amount;
    const next = this.heat > 90 ? 3 : this.heat > 55 ? 2 : this.heat > 20 ? 1 : 0;
    this.stars = Math.max(this.stars, next);
    this.cooldown = 12;
  }
  update(dt, inSight) {
    if (this.stars > 0) {
      this.cooldown -= dt;
      if (!inSight && this.cooldown <= 0) {
        this.stars -= 1;
        this.heat = Math.max(0, this.heat - 35);
        this.cooldown = 10;
      }
    }
  }
  tier() { return WANTED_TIERS[this.stars]; }
}

// --- Combat ----------------------------------------------------------------
export class Guard {
  constructor(scene, rng, x, z) {
    this.mesh = makePedestrianMesh(rng);
    // Guards wear dark vests so they read as hostile at a glance.
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.8 }));
    vest.position.y = 1.05; this.mesh.add(vest);
    this.x = x; this.z = z; this.health = 100; this.alive = true;
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.scene = scene;
  }
  damage(amount) {
    this.health -= amount;
    if (this.health <= 0 && this.alive) {
      this.alive = false;
      this.mesh.visible = false;
    }
  }
}

// Hitscan shot from the player toward the aim point. Returns the guard hit.
export function shootAt(origin, dir, guards, maxDist = 60) {
  let best = null, bestD = maxDist;
  for (const g of guards) {
    if (!g.alive) continue;
    const dx = g.x - origin.x, dz = g.z - origin.z;
    const d = Math.hypot(dx, dz);
    if (d > maxDist) continue;
    const dot = (dx * dir.x + dz * dir.z) / (d || 1);
    if (dot > 0.94 && d < bestD) { best = g; bestD = d; }
  }
  if (best) best.damage(50);
  return best;
}

// --- Effects ---------------------------------------------------------------
export class SmokePool {
  constructor(scene, count = 40) {
    this.items = [];
    const mat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.55 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mat.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.items.push({ mesh: m, life: 0 });
    }
    this.cursor = 0;
  }
  spawn(x, z) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    it.mesh.position.set(x, 0.25, z);
    it.mesh.visible = true;
    it.life = 0.9;
  }
  update(dt) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      it.mesh.position.y += dt * 0.6;
      const s = 1 + (0.9 - it.life) * 1.6;
      it.mesh.scale.set(s, s, 1);
      it.mesh.material.opacity = Math.max(0, it.life * 0.55);
      if (it.life <= 0) it.mesh.visible = false;
    }
  }
}

export class MuzzleFlash {
  constructor(scene) {
    this.light = new THREE.PointLight(0xffc21c, 0, 7, 1.6);
    scene.add(this.light);
    // Starburst texture: soft radial burst, not a solid panel.
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,230,1)');
    grad.addColorStop(0.25, 'rgba(255,220,90,0.9)');
    grad.addColorStop(0.6, 'rgba(255,140,40,0.35)');
    grad.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,250,200,0.95)'; g.lineWidth = 5;
    for (const a of [0, Math.PI / 4, Math.PI / 2, -Math.PI / 4]) {
      g.beginPath();
      g.moveTo(64 - Math.cos(a) * 60, 64 - Math.sin(a) * 60);
      g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    this.sprite = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    scene.add(this.sprite);
    this.timer = 0;
  }
  fire(x, y, z, heading) {
    this.light.position.set(x, y, z);
    this.light.intensity = 25;
    this.sprite.position.set(x + Math.sin(heading) * 1.1, y, z + Math.cos(heading) * 1.1);
    this.sprite.rotation.y = heading;
    this.sprite.material.opacity = 1;
    this.timer = 0.09;
  }
  update(dt, cam) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) { this.light.intensity = 0; this.sprite.material.opacity = 0; }
    }
    if (this.sprite.material.opacity > 0) this.sprite.lookAt(cam.position);
  }
}
