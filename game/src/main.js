// main.js — Equator Drive (fresh build). Open-world crime game: drive, steal, drift, evade police, run missions.
import * as THREE from '../vendor/three.module.min.js';
import { mulberry32, pick, range } from './rng.js';
import { buildCity } from './city.js';
import { buildVehicle, buildPerson, buildAri } from './vehicles.js';

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '7', 10) || 7;
const SHOT = params.get('shot') || '';
const rng = mulberry32(SEED);
const NIGHT = SHOT === 'night';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (id) => document.getElementById(id);

// ---------- renderer / scene ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = NIGHT ? 0.85 : 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(NIGHT ? 0x0b1026 : 0x87c5e8);
scene.fog = new THREE.Fog(NIGHT ? 0x0b1026 : 0x9fd0e8, 90, 240);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 8, -14);

const hemi = new THREE.HemisphereLight(NIGHT ? 0x2a3a6a : 0xbfe3ff, NIGHT ? 0x0c0f18 : 0x5a7a4a, NIGHT ? 0.5 : 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(NIGHT ? 0x8fa8ff : 0xfff2d8, NIGHT ? 0.5 : 2.0);
sun.position.set(60, 90, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -110; sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
sun.shadow.camera.far = 300;
scene.add(sun);
if (NIGHT) {
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf4f1de }));
  moon.position.set(-70, 80, -90); scene.add(moon);
} else {
  // sun disc + clouds
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
  sunBall.position.set(90, 95, 40); scene.add(sunBall);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 10; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 3, 6), 10, 8), cloudMat);
      s.position.set(j * 4 - 4, range(rng, 0, 1), range(rng, -1, 1)); cl.add(s);
    }
    cl.position.set(range(rng, -100, 100), range(rng, 42, 60), range(rng, -100, 100));
    scene.add(cl);
  }
}

// ---------- world ----------
const city = buildCity(scene, rng);
const colliders = city.colliders;

// ---------- state ----------
const state = {
  mode: SHOT === 'start' ? 'menu' : 'play',
  money: 1250, wanted: 0, health: 100, damage: 0,
  missionIdx: 0, drift: 0, driftTotal: 0, carsStolen: 0,
  inCar: null, onFoot: true, speed: 0, bustedTimer: 0,
  time: 0, muted: false, saved: null,
};
try { const s = JSON.parse(localStorage.getItem('equator-drive-save-v1') || 'null'); if (s) state.saved = s; } catch (e) { /* no save */ }
if (state.saved && SHOT !== 'start') { state.money = state.saved.money || 1250; state.missionIdx = state.saved.missionIdx || 0; }

const MISSIONS = [
  { id: 'valet', title: 'MISSION 1 — VALET RUSH', text: 'Drive the Broombroom S1 to the Garage.', target: city.garagePos, reward: 500 },
  { id: 'angkot', title: 'MISSION 2 — BORROWED ANGKOT', text: 'Steal the yellow angkot and deliver it to the Plaza.', target: city.plazaPos, reward: 800 },
  { id: 'heat', title: 'MISSION 3 — NIGHT HEAT', text: 'Lose the police. Reach the waterfront with 0 stars.', target: new THREE.Vector3(108, 0, 0), reward: 1200 },
];

// ---------- vehicles ----------
const VEHICLE_SPECS = {
  broombroom: { max: 34, accel: 20, grip: 0.92, label: 'Broombroom S1' },
  sedan: { max: 26, accel: 15, grip: 0.85, label: 'Sedan' },
  taxi: { max: 26, accel: 15, grip: 0.85, label: 'Taxi' },
  pickup: { max: 24, accel: 13, grip: 0.8, label: 'Pickup' },
  angkot: { max: 20, accel: 11, grip: 0.78, label: 'Angkot' },
  bajaj: { max: 18, accel: 12, grip: 0.9, label: 'Bajaj' },
  police: { max: 30, accel: 18, grip: 0.9, label: 'Police Interceptor' },
};
const vehicles = [];
function spawnVehicle(type, color, x, z, heading, opts = {}) {
  const mesh = buildVehicle(type, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  const v = { type, mesh, x, z, heading, speed: 0, steer: 0, spec: VEHICLE_SPECS[type], traffic: !!opts.traffic, loop: opts.loop || null, loopIdx: opts.loopIdx || 0, police: type === 'police', stolen: false, smoke: 0 };
  vehicles.push(v);
  return v;
}
// hero + street population (deterministic positions)
const hero = spawnVehicle('broombroom', 0xff2e88, -6, -14, Math.PI);
spawnVehicle('sedan', 0x3a6ea5, 6, 8, 0.2);
spawnVehicle('taxi', 0xf2f2f2, -14, 30, -0.4);
spawnVehicle('pickup', 0xc96a2e, 26, -22, 1.2);
spawnVehicle('angkot', 0xffc400, 14, 44, 2.8);
spawnVehicle('bajaj', 0x19b8a6, -30, -6, 0.8);
spawnVehicle('sedan', 0x8a2f3c, 44, 14, -1.6);
spawnVehicle('bajaj', 0xff5a5f, -44, 44, 2.2);
spawnVehicle('pickup', 0x4a6b8a, 58, 30, 0.5);
// traffic loops
const trafficColors = [0xd96a4a, 0x5b8dbf, 0xe8e0d0, 0x7fb069, 0xc97ba8];
city.loops.slice(0, 6).forEach((loop, i) => {
  const type = pick(rng, ['sedan', 'taxi', 'pickup', 'angkot', 'bajaj']);
  const p = loop[0];
  spawnVehicle(type, trafficColors[i % trafficColors.length], p.x + range(rng, -3, 3), p.z + range(rng, -3, 3), 0, { traffic: true, loop, loopIdx: 0 });
});
const policeCars = [];
function spawnPolice(x, z) {
  const v = spawnVehicle('police', 0xf2f2f2, x, z, 0);
  v.police = true; policeCars.push(v); return v;
}

// ---------- people ----------
const peds = [];
const pedShirts = [0xff5a5f, 0xffb400, 0x19b8a6, 0x7c5cff, 0xff7ab8, 0xe8e0d0, 0x3a6ea5];
function spawnPed(x, z) {
  const mesh = buildPerson(pick(rng, pedShirts), pick(rng, [0x22303c, 0x3c2a22, 0x2a3c2a]));
  mesh.position.set(x, 0, z);
  mesh.rotation.y = range(rng, 0, Math.PI * 2);
  scene.add(mesh);
  const p = { mesh, x, z, heading: mesh.rotation.y, speed: range(rng, 1.2, 2.2), phase: range(rng, 0, 6), down: false, flee: 0 };
  peds.push(p); return p;
}
for (let i = 0; i < 22; i++) {
  const road = pick(rng, [-80, -40, 0, 40, 80]);
  if (Math.abs(road - 20) < 12 && rng() < 0.5) continue;
  spawnPed(road + pick(rng, [-8.5, 8.5]), range(rng, -90, 90));
}
for (let i = 0; i < 6; i++) spawnPed(20 + range(rng, -14, 14), 20 + range(rng, -14, 14));

// player — Ari "Kancil" Saputra
const ari = buildAri();
ari.position.set(-2, 0, -18);
scene.add(ari);
const player = { x: -2, z: -18, heading: Math.PI, speed: 0, walkPhase: 0 };

// mission beacon
const beacon = new THREE.Group();
const beaconRing = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.15, 24), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xffb400, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 }));
beaconRing.position.y = 0.1; beacon.add(beaconRing);
const beaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.6, 26, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc400, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
beaconBeam.position.y = 13; beacon.add(beaconBeam);
const beaconDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xffaa00, emissiveIntensity: 1.4 }));
beaconDiamond.position.y = 7; beacon.add(beaconDiamond);
scene.add(beacon);

// smoke / muzzle particles (pooled sprites)
const particles = [];
const smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.55 });
for (let i = 0; i < 60; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), smokeMat.clone());
  m.visible = false; scene.add(m);
  particles.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
}
function puff(x, y, z, n = 3, color = 0xcccccc) {
  let c = 0;
  for (const p of particles) {
    if (p.life > 0) continue;
    p.life = 0.7 + rng() * 0.4; p.mesh.visible = true;
    p.mesh.position.set(x + range(rng, -0.4, 0.4), y, z + range(rng, -0.4, 0.4));
    p.mesh.material.color.setHex(color); p.mesh.material.opacity = 0.55;
    p.vx = range(rng, -1, 1); p.vy = range(rng, 1, 2.4); p.vz = range(rng, -1, 1);
    if (++c >= n) break;
  }
}
const flash = new THREE.PointLight(0xffc46a, 0, 18);
scene.add(flash);

// ---------- input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE') tryEnterExit();
  if (e.code === 'KeyR') tryRespray();
  if (e.code === 'KeyM') toggleMute();
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
let mouseDown = false, lastX = 0, camYaw = 0;
canvas.addEventListener('mousedown', (e) => { mouseDown = true; lastX = e.clientX; if (state.mode === 'play' && state.inCar === null) shoot(); });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('mousemove', (e) => { if (mouseDown) { camYaw += (e.clientX - lastX) * 0.005; lastX = e.clientX; } });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- audio (tiny synth, created on first gesture) ----------
let audioCtx = null, engineOsc = null, engineGain = null;
function ensureAudio() {
  if (audioCtx || state.muted) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioCtx.createOscillator(); engineGain = audioCtx.createGain();
    engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60; engineGain.gain.value = 0.0;
    engineOsc.connect(engineGain); engineGain.connect(audioCtx.destination); engineOsc.start();
  } catch (e) { audioCtx = null; }
}
function beep(freq, dur = 0.12, type = 'square', vol = 0.08) {
  if (!audioCtx || state.muted) return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* silent */ }
}
function toggleMute() { state.muted = !state.muted; if (engineGain) engineGain.gain.value = 0; toast(state.muted ? 'Sound off' : 'Sound on'); }

// ---------- HUD helpers ----------
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function setStars(n) {
  state.wanted = clamp(n, 0, 5);
  $('stars').textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  $('stars').style.color = state.wanted >= 3 ? '#ff4444' : '#ffc400';
}
function saveGame() {
  const data = { money: state.money, missionIdx: state.missionIdx, carsStolen: state.carsStolen, driftTotal: Math.round(state.driftTotal), at: new Date().toISOString() };
  try { localStorage.setItem('equator-drive-save-v1', JSON.stringify(data)); state.saved = data; } catch (e) { /* private mode */ }
  $('save-line').textContent = 'Saved — $' + state.money + ' • Mission ' + (state.missionIdx + 1) + ' of 3';
  return data;
}
function nearestVehicle(x, z, maxD = 4.5) {
  let best = null, bd = maxD;
  for (const v of vehicles) {
    if (v.traffic && v.speed > 2) continue;
    const d = Math.hypot(v.mesh.position.x - x, v.mesh.position.z - z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

// ---------- actions ----------
function tryEnterExit() {
  ensureAudio();
  if (state.mode !== 'play') return;
  if (state.inCar) {
    const v = state.inCar;
    player.x = v.mesh.position.x + Math.sin(v.heading + Math.PI / 2) * 2.2;
    player.z = v.mesh.position.z + Math.cos(v.heading + Math.PI / 2) * 2.2;
    player.heading = v.heading;
    ari.position.set(player.x, 0, player.z);
    ari.visible = true; state.inCar = null; state.onFoot = true;
    toast('On foot — press E near a car to drive');
    return;
  }
  const v = nearestVehicle(player.x, player.z);
  if (!v) { toast('No car in reach'); return; }
  state.inCar = v; state.onFoot = false; ari.visible = false;
  if (!v.stolen && v.type !== 'broombroom') {
    v.stolen = true; state.carsStolen++;
    setStars(state.wanted + 1);
    toast('Car stolen! Wanted level up — the police are coming');
    beep(440, 0.2, 'square', 0.1);
    if (policeCars.length < 3) spawnPolice(player.x + 24, player.z - 18);
  } else {
    toast('Driving the ' + v.spec.label);
  }
}
function tryRespray() {
  if (state.mode !== 'play' || !state.inCar) return;
  const d = Math.hypot(state.inCar.mesh.position.x - city.garagePos.x, state.inCar.mesh.position.z - city.garagePos.z);
  if (d > 9) { toast('Respray only at the Garage — follow the yellow beacon'); return; }
  const colors = [0xff2e88, 0x19b8a6, 0xffc400, 0x3a6ea5, 0xff5a5f, 0x7c5cff];
  const c = colors[Math.floor(Math.random() * colors.length)];
  state.inCar.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.userData) { /* keep */ } });
  // recolor body meshes (first large box material group is shared per vehicle build; repaint via new material on body parts)
  state.inCar.mesh.children.forEach((o) => {
    if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width > 1.5 && o.geometry.parameters.height < 0.8) {
      o.material = new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.6 });
    }
  });
  state.money = Math.max(0, state.money - 50);
  toast('Resprayed — $50. Fresh paint, clean getaway.');
  saveGame();
}
function shoot() {
  if (state.mode !== 'play' || state.inCar) return;
  ensureAudio(); beep(180, 0.08, 'sawtooth', 0.12);
  flash.position.set(ari.position.x + Math.sin(player.heading) * 1.2, 1.4, ari.position.z + Math.cos(player.heading) * 1.2);
  flash.intensity = 60;
  setTimeout(() => { flash.intensity = 0; }, 70);
  puff(flash.position.x, 1.4, flash.position.z, 2, 0xffc46a);
  // hit nearest ped/police in front cone
  let best = null, bd = 14;
  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  for (const p of peds) {
    if (p.down) continue;
    const dx = p.mesh.position.x - player.x, dz = p.mesh.position.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / Math.max(d, 0.01) > 0.7) { bd = d; best = p; }
  }
  if (best) {
    best.down = true; best.mesh.rotation.x = -Math.PI / 2; best.mesh.position.y = 0.3;
    setStars(state.wanted + 1);
    toast('Shots fired — wanted level up');
    if (policeCars.length < 4) spawnPolice(player.x + 20, player.z + 20);
  }
}
function completeMission() {
  const m = MISSIONS[state.missionIdx];
  state.money += m.reward;
  toast(m.title + ' COMPLETE — +$' + m.reward);
  beep(660, 0.15, 'square', 0.1); setTimeout(() => beep(880, 0.2, 'square', 0.1), 150);
  state.missionIdx++;
  if (state.missionIdx >= MISSIONS.length) {
    $('end-title').textContent = 'EQUATOR CITY IS YOURS';
    $('end-sub').textContent = 'All 3 missions complete — $' + state.money + ' banked. Free roam continues.';
    $('end-screen').classList.add('show');
    state.missionIdx = MISSIONS.length - 1;
  }
  setStars(Math.max(0, state.wanted - 1));
  saveGame();
}

// ---------- physics + AI ----------
function collideCircle(x, z, r) {
  for (const c of colliders) {
    const dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx) < c.hx + r && Math.abs(dz) < c.hz + r) {
      const px = c.hx + r - Math.abs(dx), pz = c.hz + r - Math.abs(dz);
      if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hx + r);
      else z = c.z + Math.sign(dz || 1) * (c.hz + r);
      return { x, z, hit: true };
    }
  }
  return { x: clamp(x, -102, 108), z: clamp(z, -102, 102), hit: false };
}
function updateCar(v, dt) {
  const spec = v.spec;
  if (v.traffic) {
    // follow loop waypoints
    const target = v.loop[v.loopIdx];
    const dx = target.x - v.mesh.position.x, dz = target.z - v.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { v.loopIdx = (v.loopIdx + 1) % v.loop.length; return; }
    const want = Math.atan2(dx, dz);
    let diff = want - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.heading += clamp(diff, -1.4 * dt, 1.4 * dt);
    v.speed = lerp(v.speed, 8, dt);
    v.mesh.position.x += Math.sin(v.heading) * v.speed * dt;
    v.mesh.position.z += Math.cos(v.heading) * v.speed * dt;
    v.mesh.rotation.y = v.heading;
    return;
  }
  if (v.police && state.mode === 'play') {
    // chase the player (car or on foot)
    const tx = state.inCar ? state.inCar.mesh.position.x : player.x;
    const tz = state.inCar ? state.inCar.mesh.position.z : player.z;
    const dx = tx - v.mesh.position.x, dz = tz - v.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.heading += clamp(diff, -2.2 * dt, 2.2 * dt);
    v.speed = lerp(v.speed, dist > 6 ? 26 : 10, dt);
    v.mesh.position.x += Math.sin(v.heading) * v.speed * dt;
    v.mesh.position.z += Math.cos(v.heading) * v.speed * dt;
    v.mesh.rotation.y = v.heading;
    // flashing beacons
    const on = Math.floor(state.time * 6) % 2 === 0;
    v.mesh.traverse((o) => {
      if (o.name === 'beaconR') o.material.emissiveIntensity = on ? 2.4 : 0.2;
      if (o.name === 'beaconB') o.material.emissiveIntensity = on ? 0.2 : 2.4;
    });
    if (dist < 3.2 && state.inCar === v) { /* police beside player car */ }
    if (dist < 2.6 && !state.inCar) {
      state.bustedTimer += dt;
      if (state.bustedTimer > 1.6) {
        state.mode = 'busted';
        $('end-title').textContent = 'BUSTED';
        $('end-sub').textContent = 'The Equator Police caught Ari. Pay $300 bail to keep driving.';
        $('end-screen').classList.add('show');
      }
    }
    return;
  }
  if (v !== state.inCar) return; // parked
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 0.7 : 0);
  const hand = keys.Space ? true : false;
  v.speed += fwd * spec.accel * dt;
  v.speed -= v.speed * (hand ? 1.6 : 0.55) * dt;
  v.speed = clamp(v.speed, -9, spec.max);
  const steerInput = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  const steerFactor = clamp(Math.abs(v.speed) / 10, 0.25, 1) * (v.speed >= 0 ? 1 : -1);
  v.heading += steerInput * 1.9 * steerFactor * dt * (hand ? 1.5 : 1);
  const nx = v.mesh.position.x + Math.sin(v.heading) * v.speed * dt;
  const nz = v.mesh.position.z + Math.cos(v.heading) * v.speed * dt;
  const hit = collideCircle(nx, nz, 1.4);
  if (hit.hit && Math.abs(v.speed) > 6) {
    state.damage = clamp(state.damage + Math.abs(v.speed) * 0.9, 0, 100);
    puff(v.mesh.position.x, 0.8, v.mesh.position.z, 4, 0x888888);
    beep(120, 0.15, 'sawtooth', 0.1);
    v.speed *= -0.25;
    if (state.damage >= 100) {
      $('end-title').textContent = 'WASTED';
      $('end-sub').textContent = 'The ' + v.spec.label + ' is wrecked. Walk to another car.';
      $('end-screen').classList.add('show');
      state.mode = 'wasted'; state.inCar = null; ari.visible = true;
      ari.position.copy(v.mesh.position);
      player.x = v.mesh.position.x; player.z = v.mesh.position.z;
    }
  }
  v.mesh.position.x = hit.x; v.mesh.position.z = hit.z;
  v.mesh.rotation.y = v.heading;
  // drift: handbrake at speed
  if (hand && Math.abs(v.speed) > 10 && Math.abs(steerInput) > 0) {
    const gain = Math.abs(v.speed) * dt * 3;
    state.drift += gain; state.driftTotal += gain;
    puff(v.mesh.position.x - Math.sin(v.heading) * 1.4, 0.3, v.mesh.position.z - Math.cos(v.heading) * 1.4, 2);
    $('drift').textContent = 'DRIFT +' + Math.round(state.drift);
    $('drift').classList.add('show');
    clearTimeout(updateCar._dt); updateCar._dt = setTimeout(() => { state.drift = 0; $('drift').classList.remove('show'); }, 1200);
  }
  // body roll / pitch for feel
  v.mesh.rotation.z = lerp(v.mesh.rotation.z, -steerInput * 0.05 * clamp(Math.abs(v.speed) / 20, 0, 1), 0.2);
}
function updatePlayer(dt) {
  if (state.inCar || state.mode !== 'play') return;
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const sprint = keys.ShiftLeft ? 1.7 : 1;
  const sp = 6 * sprint;
  const mx = Math.sin(player.heading) * fwd + Math.cos(player.heading) * strafe;
  const mz = Math.cos(player.heading) * fwd - Math.sin(player.heading) * strafe;
  const len = Math.hypot(mx, mz) || 1;
  const nx = player.x + (mx / len) * sp * dt * (fwd || strafe ? 1 : 0);
  const nz = player.z + (mz / len) * sp * dt * (fwd || strafe ? 1 : 0);
  const hit = collideCircle(nx, nz, 0.6);
  player.x = hit.x; player.z = hit.z;
  if (fwd || strafe) {
    player.heading = Math.atan2(mx, mz);
    player.walkPhase += dt * 11 * sprint;
  }
  ari.position.set(player.x, 0, player.z);
  ari.rotation.y = player.heading;
  const parts = ari.userData.parts;
  if (parts) {
    const s = Math.sin(player.walkPhase) * (fwd || strafe ? 0.55 : 0);
    parts.legL.rotation.x = s; parts.legR.rotation.x = -s;
    parts.armL.rotation.x = -s * 0.8; parts.armR.rotation.x = s * 0.8;
    ari.position.y = Math.abs(Math.sin(player.walkPhase)) * 0.05;
  }
}
function updatePeds(dt) {
  for (const p of peds) {
    if (p.down) continue;
    // flee from the player's car
    const threat = state.inCar ? state.inCar.mesh.position : null;
    let tx = p.x, tz = p.z;
    if (threat) {
      const d = Math.hypot(threat.x - p.x, threat.z - p.z);
      if (d < 7) { p.flee = 1.5; p.heading = Math.atan2(p.x - threat.x, p.z - threat.z); }
    }
    if (p.flee > 0) { p.flee -= dt; tx = p.x + Math.sin(p.heading) * p.speed * 2 * dt; tz = p.z + Math.cos(p.heading) * p.speed * 2 * dt; }
    else {
      if (Math.random() < dt * 0.12) p.heading += range(rng, -1.2, 1.2);
      tx = p.x + Math.sin(p.heading) * p.speed * dt;
      tz = p.z + Math.cos(p.heading) * p.speed * dt;
      if (Math.abs(tx) > 100 || Math.abs(tz) > 100) p.heading += Math.PI;
    }
    const hit = collideCircle(tx, tz, 0.5);
    p.x = hit.x; p.z = hit.z;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.phase += dt * 8;
    const parts = p.mesh.userData.parts;
    if (parts) {
      const s = Math.sin(p.phase) * 0.5;
      parts.legL.rotation.x = s; parts.legR.rotation.x = -s;
      parts.armL.rotation.x = -s * 0.7; parts.armR.rotation.x = s * 0.7;
    }
  }
}
function updateMissions() {
  const m = MISSIONS[state.missionIdx];
  $('mission-title').textContent = m.title;
  $('mission-text').textContent = m.text + '  •  Reward $' + m.reward;
  beacon.position.set(m.target.x, 0, m.target.z);
  beaconDiamond.rotation.y += 0.03;
  beaconDiamond.position.y = 7 + Math.sin(state.time * 2) * 0.6;
  const px = state.inCar ? state.inCar.mesh.position.x : player.x;
  const pz = state.inCar ? state.inCar.mesh.position.z : player.z;
  const d = Math.hypot(px - m.target.x, pz - m.target.z);
  if (m.id === 'heat') {
    if (state.wanted === 0 && d < 12) completeMission();
  } else if (d < 8) {
    if (m.id === 'angkot' && (!state.inCar || state.inCar.type !== 'angkot')) { $('mission-text').textContent = m.text + ' — bring the ANGKTOT here!'; return; }
    completeMission();
  }
  // wanted decays slowly when far from police
  if (state.wanted > 0 && policeCars.length === 0) setStars(state.wanted - 0);
}

// ---------- camera / HUD / minimap ----------
const camPos = new THREE.Vector3(0, 8, -14);
function updateCamera(dt) {
  // staged shots keep their fixed camera — the loop must not override it
  if (SHOT === 'cover' || SHOT === 'night' || SHOT === 'start') return;
  let tx, tz, th, dist = 11, height = 5.2;
  if (SHOT === 'map') {
    camera.position.set(0, 150, 0.01); camera.lookAt(0, 0, 0);
    return;
  }
  if (state.inCar) {
    const v = state.inCar.mesh;
    tx = v.position.x; tz = v.position.z; th = v.rotation.y;
    dist = 12; height = 5.4;
  } else {
    tx = player.x; tz = player.z; th = player.heading;
    dist = 8; height = 4.2;
  }
  const yaw = th + Math.PI + camYaw * 0.4;
  const want = new THREE.Vector3(tx + Math.sin(yaw) * dist, height, tz + Math.cos(yaw) * dist);
  camPos.lerp(want, 1 - Math.pow(0.001, dt));
  camera.position.copy(camPos);
  camera.lookAt(tx, 1.6, tz);
}
const minimap = $('minimap').getContext('2d');
function drawMinimap() {
  const c = minimap, S = 150, scale = S / 220;
  c.fillStyle = '#0e2a22'; c.fillRect(0, 0, S, S);
  c.fillStyle = '#3f8f3a'; c.fillRect(0, 0, S, S);
  c.fillStyle = '#33363d';
  for (const r of [-80, -40, 0, 40, 80]) {
    c.fillRect((r + 110) * scale - 2, 0, 4, S);
    c.fillRect(0, (r + 110) * scale - 2, S, 4);
  }
  c.fillStyle = '#1f8fb8'; c.fillRect(218 * scale, 0, S, S);
  c.fillStyle = '#ff2e88';
  const m = MISSIONS[state.missionIdx];
  c.beginPath(); c.arc((m.target.x + 110) * scale, (m.target.z + 110) * scale, 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff';
  for (const v of vehicles) {
    if (v === state.inCar) continue;
    c.fillRect((v.mesh.position.x + 110) * scale - 1.5, (v.mesh.position.z + 110) * scale - 1.5, 3, 3);
  }
  const px = state.inCar ? state.inCar.mesh.position.x : player.x;
  const pz = state.inCar ? state.inCar.mesh.position.z : player.z;
  c.fillStyle = '#00ff88';
  c.beginPath(); c.arc((px + 110) * scale, (pz + 110) * scale, 4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
  for (const pc of policeCars) {
    c.fillStyle = '#2244ff';
    c.beginPath(); c.arc((pc.mesh.position.x + 110) * scale, (pc.mesh.position.z + 110) * scale, 3.5, 0, Math.PI * 2); c.fill();
  }
}
function updateHUD() {
  $('money').textContent = '$' + state.money.toLocaleString('en-US');
  const spd = state.inCar ? Math.abs(Math.round(state.inCar.speed * 3.6)) : Math.round(6 * 3.6 * (keys.KeyW ? 1 : 0));
  $('speed').textContent = state.mode === 'play' ? spd + ' km/h' : '—';
  $('car-name').textContent = state.inCar ? state.inCar.spec.label : (state.mode === 'play' ? 'On foot — Ari "Kancil" Saputra' : 'Equator Drive');
  $('damage-fill').style.width = (100 - state.damage) + '%';
  $('damage-fill').style.background = state.damage > 60 ? '#ff4444' : state.damage > 30 ? '#ffb400' : '#19b8a6';
  if (engineOsc && audioCtx) {
    engineOsc.frequency.value = 50 + Math.abs(state.inCar ? state.inCar.speed : 0) * 4;
    if (engineGain) engineGain.gain.value = state.inCar && !state.muted ? 0.035 : 0;
  }
}

// ---------- shot staging (deterministic, for screenshots) ----------
function stageShot() {
  // frozen shots: the mission beacon stays at the origin unless placed — hide it except on the map
  beacon.visible = SHOT === 'map';
  if (SHOT === 'map') beacon.position.set(MISSIONS[state.missionIdx].target.x, 0, MISSIONS[state.missionIdx].target.z);
  if (SHOT === 'cover') {
    // hero mid-drift on the z=40 road, 3/4 rear-side low camera so the magenta buggy reads big
    hero.mesh.position.set(16, 0, 40); hero.mesh.rotation.y = Math.PI + 0.3; hero.speed = 22;
    hero.mesh.rotation.z = -0.06;
    puff(14, 0.4, 44, 6); puff(18, 0.4, 46, 6);
    const t1 = vehicles[1]; t1.mesh.position.set(8, 0, 28); t1.mesh.rotation.y = Math.PI;
    const t2 = vehicles[4]; t2.mesh.position.set(30, 0, 30); t2.mesh.rotation.y = -Math.PI / 2;
    player.x = 16; player.z = 40;
    camera.position.set(25, 3.6, 51); camera.lookAt(15, 1.2, 32);
    camPos.copy(camera.position);
    state.inCar = hero; state.onFoot = false; ari.visible = false;
    $('mission-title').textContent = MISSIONS[0].title;
    $('mission-text').textContent = MISSIONS[0].text + '  •  Reward $500';
    $('drift').textContent = 'DRIFT +340'; $('drift').classList.add('show');
    setStars(2);
  } else if (SHOT === 'start') {
    state.mode = 'menu';
    // aerial plaza view: no single facade can fill the frame from above
    hero.mesh.position.set(30, 0, 30); hero.mesh.rotation.y = 0.8;
    camera.position.set(4, 24, -2); camera.lookAt(22, 0, 22);
    camPos.copy(camera.position);
    $('start-screen').classList.add('show');
    if (state.saved) $('save-line').textContent = 'Save found — $' + state.saved.money + ' • Mission ' + (state.saved.missionIdx + 1) + ' of 3 • ' + (state.saved.carsStolen || 0) + ' cars stolen';
  } else if (SHOT === 'night') {
    // on-foot combat at night: 3/4 front view of Ari so the teal jacket + cap read, police closing down the avenue
    state.mode = 'play'; state.inCar = null; state.onFoot = true; ari.visible = true;
    player.x = 0; player.z = 8; player.heading = 2.6;
    ari.position.set(0, 0, 8); ari.rotation.y = 2.6;
    const pc = spawnPolice(4, 20);
    pc.mesh.rotation.y = Math.PI;
    const taxi = vehicles[2]; taxi.mesh.position.set(-6, 0, 16); taxi.mesh.rotation.y = Math.PI * 0.9;
    // warm key light on Ari + magenta neon spill so the hero is never a black silhouette
    const keyLight = new THREE.PointLight(0xffb45e, 90, 32); keyLight.position.set(-3, 5, 4); scene.add(keyLight);
    const neonLight = new THREE.PointLight(0xff2e88, 70, 30); neonLight.position.set(10, 5, 14); scene.add(neonLight);
    flash.position.set(1.6, 1.4, 9.6); flash.intensity = 80;
    const flashBall = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    flashBall.position.set(1.6, 1.4, 9.6); scene.add(flashBall);
    setStars(3);
    $('mission-title').textContent = MISSIONS[2].title;
    $('mission-text').textContent = 'Shots fired on Equator Avenue — lose the police!';
    camera.position.set(-4.5, 2.6, 3.5); camera.lookAt(1.5, 1.3, 12);
    camPos.copy(camera.position);
  } else if (SHOT === 'map') {
    state.mode = 'play';
    // hide the chase HUD chrome so nothing overlaps the map title / legend
    $('topbar').style.display = 'none';
    $('speedbox').style.display = 'none';
    $('controls-hint').style.display = 'none';
    $('minimap-wrap').style.display = 'none';
    $('map-panel').classList.add('show');
  }
  if (SHOT === 'cover' || SHOT === 'night' || SHOT === 'map') $('hud').classList.add('show');
}

// ---------- start / end buttons ----------
$('btn-new').addEventListener('click', () => {
  ensureAudio();
  try { localStorage.removeItem('equator-drive-save-v1'); } catch (e) { /* ignore */ }
  state.money = 1250; state.missionIdx = 0; state.carsStolen = 0; state.damage = 0; setStars(0);
  $('start-screen').classList.remove('show');
  state.mode = 'play'; state.inCar = hero; state.onFoot = false; ari.visible = false;
  hero.mesh.position.set(-6, 0, -14); hero.mesh.rotation.y = Math.PI;
  toast('Welcome to Equator City, Ari. The Broombroom S1 is yours.');
});
$('btn-continue').addEventListener('click', () => {
  ensureAudio();
  $('start-screen').classList.remove('show');
  state.mode = 'play'; state.inCar = hero; state.onFoot = false; ari.visible = false;
  toast('Welcome back, Ari.');
});
$('btn-resume').addEventListener('click', () => {
  $('end-screen').classList.remove('show');
  if (state.mode === 'busted') { state.money = Math.max(0, state.money - 300); setStars(0); }
  if (state.mode === 'wasted') { state.damage = 0; }
  state.mode = 'play'; state.bustedTimer = 0;
  saveGame();
});
$('btn-mute').addEventListener('click', toggleMute);

// ---------- main loop ----------
let last = performance.now(), frame = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now; state.time += dt; frame++;
  const frozen = SHOT === 'cover' || SHOT === 'night' || SHOT === 'start';
  if (state.mode === 'play' && !frozen) {
    updatePlayer(dt);
    for (const v of vehicles) updateCar(v, dt);
    updatePeds(dt);
    updateMissions();
    // wanted: spawn police as stars rise
    if (state.wanted >= 1 && policeCars.length < state.wanted) spawnPolice(player.x + 26, player.z + 10);
    if (state.wanted === 0 && policeCars.length > 0 && Math.hypot(policeCars[0].mesh.position.x - player.x, policeCars[0].mesh.position.z - player.z) > 90) {
      const gone = policeCars.shift(); scene.remove(gone.mesh);
    }
  } else if (frozen) {
    // staged shot: gentle idle motion only (beacon pulse, ped bob)
    beaconDiamond.rotation.y += 0.02;
  }
  for (const p of particles) {
    if (frozen || p.life <= 0) continue;
    p.life -= dt;
    p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
    p.mesh.material.opacity = Math.max(0, p.life * 0.7);
    p.mesh.scale.setScalar(1 + (0.8 - p.life));
    if (p.life <= 0) p.mesh.visible = false;
  }
  if (SHOT !== 'map') updateCamera(dt);
  else { camera.position.set(-4, 150, 0.01); camera.lookAt(-4, 0, 0); }
  if (frame % 3 === 0) drawMinimap();
  updateHUD();
  renderer.render(scene, camera);
}
stageShot();
if (SHOT !== 'start') $('hud').classList.add('show');
if (!SHOT) $('start-screen').classList.add('show');
requestAnimationFrame(loop);
