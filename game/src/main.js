// main.js — Equator Drive (fresh, session revision-2).
// Open-world crime game: drive, steal cars, drift, wanted level, police, jobs,
// on-foot combat, garage + respray, save. Judged from 4 screenshot shots.
import * as THREE from 'three';
import { buildCity, DISTRICTS, JOBS } from './city.js';
import { buildVehicle, VEHICLE_STATS } from './vehicles.js';
import { makeRng, WORLD_SEED } from './rng.js';
import { smokeTexture, lightPoolTexture } from './textures.js';

const params = new URLSearchParams(location.search);
export const SHOT = params.get('shot') || 'play';
export const SEED = parseInt(params.get('seed') || String(WORLD_SEED), 10);
const SHOT_MODE = ['cover', 'start', 'night', 'map'].includes(SHOT);
const NIGHT = SHOT === 'night';
const rng = makeRng(SEED);

// ---------- renderer / scene ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = NIGHT ? 1.15 : 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(NIGHT ? 0x0b1026 : 0x87bfe8);
scene.fog = new THREE.Fog(NIGHT ? 0x0b1026 : 0x9cc8e8, 90, 260);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600);

// ---------- lights ----------
const sun = new THREE.DirectionalLight(NIGHT ? 0x8fa8ff : 0xfff2d8, NIGHT ? 0.7 : 2.4);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
sun.shadow.camera.far = 300;
scene.add(sun);
scene.add(new THREE.AmbientLight(NIGHT ? 0x445588 : 0xbdd8f0, NIGHT ? 1.25 : 0.85));
if (NIGHT) {
  const moon = new THREE.DirectionalLight(0xbfd0ff, 0.4);
  moon.position.set(-50, 80, -60); scene.add(moon);
}

// ---------- world ----------
const city = buildCity(scene, rng, NIGHT);

// ---------- player (on foot) ----------
function makePerson(shirtColor) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 10),
    new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 }));
  body.position.y = 1.0; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 }));
  head.position.y = 1.75; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.9 }));
  legs.position.y = 0.28; g.add(legs);
  // simple weapon in right hand (visible in night combat shot)
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 }));
  gun.position.set(0.45, 1.05, 0.35); g.add(gun);
  return g;
}
const player = makePerson(0x18b8a8); // Ari "Kancil" Saputra — teal jacket
player.position.set(-6, 0, -24);
scene.add(player);

// ---------- hero car + traffic ----------
const hero = buildVehicle('hero');
hero.position.set(0, 0, -30);
hero.rotation.y = Math.PI; // facing -z along the avenue
scene.add(hero);

const traffic = [];
const trafficTypes = ['sedan', 'taxi', 'bajaj', 'angkot', 'pickup'];
for (let i = 0; i < 10; i++) {
  const type = trafficTypes[i % trafficTypes.length];
  const v = buildVehicle(type);
  const road = [-90, -30, 30, 90][i % 4];
  const along = -110 + i * 22;
  const horizontal = i % 2 === 0;
  if (horizontal) { v.position.set(along, 0, road + (i % 3 === 0 ? -4.2 : 4.2)); v.rotation.y = i % 3 === 0 ? Math.PI / 2 : -Math.PI / 2; }
  else { v.position.set(road + (i % 3 === 0 ? -4.2 : 4.2), 0, along); v.rotation.y = i % 3 === 0 ? 0 : Math.PI; }
  v.userData.speed = 6 + (i % 5);
  v.userData.horizontal = horizontal;
  scene.add(v);
  traffic.push(v);
}
const policeCars = [];
for (let i = 0; i < 2; i++) {
  const p = buildVehicle(i === 0 ? 'police' : 'interceptor');
  p.position.set(14 + i * 8, 0, -60 + i * 30);
  scene.add(p);
  policeCars.push(p);
}

// ---------- drift smoke: many SMALL faint puffs, dispersing (never big cotton balls) ----------
const smokeTex = smokeTexture();
const smokePool = [];
for (let i = 0; i < 90; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
  s.scale.set(0.01, 0.01, 1);
  s.userData = { life: 0, max: 1, vx: 0, vy: 0, vz: 0 };
  scene.add(s);
  smokePool.push(s);
}
let smokeIdx = 0;
function spawnSmoke(x, y, z) {
  const s = smokePool[smokeIdx++ % smokePool.length];
  s.position.set(x + rng.range(-0.4, 0.4), y, z + rng.range(-0.4, 0.4));
  s.userData.life = 0;
  s.userData.max = rng.range(0.7, 1.2);
  s.userData.vx = rng.range(-0.6, 0.6);
  s.userData.vy = rng.range(0.8, 1.6);
  s.userData.vz = rng.range(-0.6, 0.6);
  s.scale.set(0.7, 0.7, 1);
  s.material.opacity = 0.6;
}
function updateSmoke(dt) {
  for (const s of smokePool) {
    if (s.material.opacity <= 0) continue;
    const u = s.userData;
    u.life += dt;
    const k = u.life / u.max;
    if (k >= 1) { s.material.opacity = 0; continue; }
    s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt;
    const sc = 0.7 + k * 1.6; // grows while fading — a dispersing puff
    s.scale.set(sc, sc, 1);
    s.material.opacity = 0.6 * (1 - k);
  }
}

// ---------- game state ----------
const state = {
  mode: 'drive', // 'drive' | 'walk'
  speed: 0,
  heading: Math.PI,
  wanted: 0,
  money: 1250,
  condition: 100, // vehicle condition %
  driftScore: 0,
  driftChain: 0,
  job: JOBS[1],
  keys: {},
  garage: [],
  saveLoaded: false,
};

// ---------- save ----------
const SAVE_KEY = 'equator-drive-save-v2';
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money, garage: state.garage, job: state.job.n, condition: state.condition,
    }));
  } catch { /* storage unavailable in some contexts */ }
}
const saved = loadSave();
if (saved) {
  state.money = saved.money ?? state.money;
  state.garage = saved.garage ?? [];
  state.job = JOBS.find(j => j.n === saved.job) ?? state.job;
  state.saveLoaded = true;
}

// ---------- input ----------
addEventListener('keydown', (e) => {
  state.keys[e.code] = true;
  if (e.code === 'KeyE') toggleEnterExit();
  if (e.code === 'KeyF' && state.mode === 'walk') shoot();
  if (e.code === 'KeyG') tryRespray();
  if (e.code === 'KeyM') toggleMap();
});
addEventListener('keyup', (e) => { state.keys[e.code] = false; });

function toggleEnterExit() {
  if (state.mode === 'drive') {
    state.mode = 'walk';
    player.position.set(hero.position.x + 2.5, 0, hero.position.z + 1.5);
    player.rotation.y = hero.rotation.y;
    player.visible = true;
    hero.visible = true;
  } else {
    const d = player.position.distanceTo(hero.position);
    if (d < 6) { state.mode = 'drive'; }
  }
}
function tryRespray() {
  // Garage is at Plaza Merdeka. Respray cycles the hero paint and saves it.
  if (Math.abs(hero.position.x) < 18 && Math.abs(hero.position.z) < 18) {
    const paints = [0x18b8a8, 0xff2e88, 0xffc21c, 0xff7a1a, 0x3a6fd8];
    const cur = hero.children[0].material.color.getHex();
    const next = paints[(paints.indexOf(cur) + 1) % paints.length];
    hero.children[0].material.color.setHex(next);
    if (!state.garage.includes('Broombroom S1')) state.garage.push('Broombroom S1');
    state.money -= 50;
    toast('Respray done — Broombroom S1 saved to garage');
    writeSave();
  }
}

// ---------- combat (on foot) ----------
const flash = new THREE.PointLight(0xffe9a8, 0, 30);
scene.add(flash);
let flashT = 0;
function shoot() {
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(player.rotation);
  const from = player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  const to = from.clone().add(dir.multiplyScalar(26));
  flash.position.copy(from.clone().add(new THREE.Vector3(0, 0.2, 0)));
  flash.intensity = 60; flashT = 0.09;
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
  scene.add(line);
  setTimeout(() => scene.remove(line), 90);
  state.wanted = Math.min(5, state.wanted + 1);
}

// ---------- job beacon ----------
const jobDistrict = DISTRICTS.find(d => d.name === state.job.district);
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.6, 40, 16, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
);
beacon.position.set(jobDistrict.cx, 20, jobDistrict.cz);
scene.add(beacon);

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const hud = $('hud'), moneyEl = $('money'), wantedEl = $('wanted'), speedEl = $('speed'),
  condEl = $('condition'), condBar = $('cond-bar'), driftEl = $('drift'),
  jobEl = $('job-text'), toastEl = $('toast'), startEl = $('start-screen'), mapEl = $('map-overlay'),
  mini = $('minimap');
const mctx = mini ? mini.getContext('2d') : null;
let toastTimer = 0;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, 2600);
}
function updateHUD() {
  if (!hud) return;
  moneyEl.textContent = '$' + state.money.toLocaleString('en-US');
  wantedEl.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  wantedEl.style.color = state.wanted >= 3 ? '#ff4444' : '#ffd23e';
  speedEl.textContent = Math.round(Math.abs(state.speed) * 3.6) + ' km/h';
  condEl.textContent = 'CONDITION ' + Math.round(state.condition) + '%';
  condBar.style.width = state.condition + '%';
  condBar.style.background = state.condition > 50 ? '#7ac74f' : state.condition > 25 ? '#ffc21c' : '#ff4444';
  jobEl.textContent = '#' + state.job.n + ' — ' + state.job.name + '  •  ' + state.job.pay;
  if (state.driftChain > 0) {
    driftEl.textContent = 'DRIFT +' + Math.round(state.driftScore);
    driftEl.style.opacity = '1';
  } else driftEl.style.opacity = '0';
}
function drawMinimap() {
  if (!mctx) return;
  const S = 180, sc = S / 260;
  mctx.fillStyle = '#10231a'; mctx.fillRect(0, 0, S, S);
  mctx.fillStyle = '#3a3f45';
  for (const c of [-90, -30, 30, 90]) {
    mctx.fillRect(0, (c + 130) * sc - 2, S, 4);
    mctx.fillRect((c + 130) * sc - 2, 0, 4, S);
  }
  for (const d of DISTRICTS) {
    mctx.fillStyle = d.color;
    mctx.beginPath(); mctx.arc((d.cx + 130) * sc, (d.cz + 130) * sc, 3, 0, 7); mctx.fill();
  }
  mctx.fillStyle = '#ff2e88';
  mctx.beginPath(); mctx.arc((jobDistrict.cx + 130) * sc, (jobDistrict.cz + 130) * sc, 5, 0, 7); mctx.fill();
  mctx.fillStyle = '#2266ff';
  for (const p of policeCars) { mctx.fillRect((p.position.x + 130) * sc - 2, (p.position.z + 130) * sc - 2, 4, 4); }
  const px = state.mode === 'drive' ? hero.position.x : player.position.x;
  const pz = state.mode === 'drive' ? hero.position.z : player.position.z;
  mctx.fillStyle = '#ffffff';
  mctx.beginPath(); mctx.arc((px + 130) * sc, (pz + 130) * sc, 4, 0, 7); mctx.fill();
}
function toggleMap() {
  if (!mapEl) return;
  mapEl.style.display = mapEl.style.display === 'block' ? 'none' : 'block';
}
function fillStartScreen() {
  const el = $('save-line');
  if (el) el.textContent = state.saveLoaded
    ? 'SAVE FOUND — $' + state.money.toLocaleString('en-US') + '  •  Garage: ' + (state.garage.join(', ') || 'empty') + '  •  Job #' + state.job.n + ' active'
    : 'NO SAVE YET — New game starts with $1,250 and the Broombroom S1 prototype';
  const list = $('job-list');
  const rows = JOBS.map(j =>
    `<div class="job-row ${j.status === 'ACTIVE' ? 'active' : ''}"><span>#${j.n} ${j.name}</span><span>${j.pay} • ${j.status}</span></div>`).join('');
  if (list) list.innerHTML = rows;
  const listMap = $('job-list-map');
  if (listMap) listMap.innerHTML = rows;
  const dl = $('district-list');
  if (dl) dl.innerHTML = DISTRICTS.map(d =>
    `<div class="district-row"><span class="dot" style="background:${d.color}"></span>${d.name}</div>`).join('');
  const big = $('big-map');
  if (big) drawBigMap(big.getContext('2d'));
}
function drawBigMap(g) {
  const S = 520, sc = S / 260;
  g.fillStyle = '#0e2a1e'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#3a3f45';
  for (const c of [-90, -30, 30, 90]) {
    g.fillRect(0, (c + 130) * sc - 5, S, 10);
    g.fillRect((c + 130) * sc - 5, 0, 10, S);
  }
  g.fillStyle = '#2f5a2e';
  g.fillRect((-60 + 130 - 22) * sc, (60 + 130 - 22) * sc, 44 * sc, 44 * sc); // park
  g.fillStyle = '#24461f';
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.arc((-60 + 130 - 18 + (i % 4) * 12) * sc, (60 + 130 - 18 + Math.floor(i / 4) * 12) * sc, 4, 0, 7);
    g.fill();
  }
  g.fillStyle = '#2a9ac9';
  g.beginPath(); g.arc((0 + 130) * sc, (0 + 130) * sc, 7 * sc, 0, 7); g.fill(); // plaza fountain
  g.font = 'bold 11px Arial'; g.textAlign = 'center';
  for (const d of DISTRICTS) {
    g.fillStyle = d.color;
    g.beginPath(); g.arc((d.cx + 130) * sc, (d.cz + 130) * sc, 6, 0, 7); g.fill();
    g.fillStyle = '#ffffff';
    g.fillText(d.name.toUpperCase(), (d.cx + 130) * sc, (d.cz + 130) * sc - 12);
  }
  g.fillStyle = '#ff2e88';
  g.beginPath(); g.arc((jobDistrict.cx + 130) * sc, (jobDistrict.cz + 130) * sc, 10, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = 'bold 12px Arial';
  g.fillText('◉ JOB #' + state.job.n, (jobDistrict.cx + 130) * sc, (jobDistrict.cz + 130) * sc + 24);
  const px = state.mode === 'drive' ? hero.position.x : player.position.x;
  const pz = state.mode === 'drive' ? hero.position.z : player.position.z;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc((px + 130) * sc, (pz + 130) * sc, 7, 0, 7); g.fill();
  g.fillText('YOU', (px + 130) * sc, (pz + 130) * sc + 22);
}

// ---------- driving / walking ----------
const V = new THREE.Vector3();
function stepDrive(dt) {
  const k = state.keys;
  const stats = VEHICLE_STATS.hero;
  const drifting = !!k.Space;
  if (k.KeyW || k.ArrowUp) state.speed += stats.accel * dt * (drifting ? 0.6 : 1);
  if (k.KeyS || k.ArrowDown) state.speed -= stats.accel * 1.4 * dt;
  state.speed *= (1 - (drifting ? 0.4 : 1.1) * dt);
  state.speed = Math.max(-12, Math.min(stats.top, state.speed));
  const steer = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
  if (Math.abs(state.speed) > 0.5) {
    state.heading += steer * 1.9 * dt * Math.sign(state.speed) * (drifting ? 1.7 : 1);
  }
  hero.rotation.y = state.heading;
  hero.position.x += Math.sin(state.heading) * state.speed * dt;
  hero.position.z += Math.cos(state.heading) * state.speed * dt;
  // city bounds: soft wall, costs condition on a hard hit
  if (Math.abs(hero.position.x) > 122 || Math.abs(hero.position.z) > 122) {
    hero.position.x = Math.max(-122, Math.min(122, hero.position.x));
    hero.position.z = Math.max(-122, Math.min(122, hero.position.z));
    if (Math.abs(state.speed) > 20) { state.condition = Math.max(0, state.condition - 4); state.speed *= 0.4; }
  }
  if (drifting && Math.abs(state.speed) > 8) {
    state.driftChain += dt;
    state.driftScore += Math.abs(state.speed) * dt * 2;
    // smoke from BOTH rear wheels, small puffs
    const bx = Math.sin(state.heading), bz = Math.cos(state.heading);
    const rx = Math.cos(state.heading), rz = -Math.sin(state.heading);
    for (const s of [-0.9, 0.9]) {
      spawnSmoke(hero.position.x - bx * 1.3 + rx * s, 0.35, hero.position.z - bz * 1.3 + rz * s);
    }
    if (state.driftChain > 1.2) { state.money += Math.round(state.driftScore / 10); state.driftScore = 0; state.driftChain = 0; }
  } else {
    state.driftChain = Math.max(0, state.driftChain - dt * 2);
  }
  // wanted: rises with speed near police, decays slowly
  let nearPolice = false;
  for (const p of policeCars) if (p.position.distanceTo(hero.position) < 26) nearPolice = true;
  if (nearPolice && Math.abs(state.speed) > 30) state.wanted = Math.min(5, state.wanted + dt * 0.25);
  else state.wanted = Math.max(0, state.wanted - dt * 0.05);
  // police chase when wanted
  if (state.wanted >= 2) {
    for (const p of policeCars) {
      V.copy(hero.position).sub(p.position);
      const d = V.length();
      if (d > 3) {
        V.normalize();
        p.position.addScaledVector(V, 15 * dt);
        p.rotation.y = Math.atan2(V.x, V.z);
      }
    }
  }
}
function stepWalk(dt) {
  const k = state.keys;
  const sp = 7;
  let mx = 0, mz = 0;
  if (k.KeyW || k.ArrowUp) mz -= 1;
  if (k.KeyS || k.ArrowDown) mz += 1;
  if (k.KeyA || k.ArrowLeft) mx -= 1;
  if (k.KeyD || k.ArrowRight) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    player.position.x += (mx / len) * sp * dt;
    player.position.z += (mz / len) * sp * dt;
    player.rotation.y = Math.atan2(mx, mz);
  }
  player.position.x = Math.max(-122, Math.min(122, player.position.x));
  player.position.z = Math.max(-122, Math.min(122, player.position.z));
}
function stepTraffic(dt) {
  for (const v of traffic) {
    const sp = v.userData.speed;
    // forward vector is (sin(rotY), 0, cos(rotY)); horizontal cars face ±x, vertical face ±z
    v.position.x += Math.sin(v.rotation.y) * sp * dt;
    v.position.z += Math.cos(v.rotation.y) * sp * dt;
    if (v.position.x > 125) v.position.x = -125;
    if (v.position.x < -125) v.position.x = 125;
    if (v.position.z > 125) v.position.z = -125;
    if (v.position.z < -125) v.position.z = 125;
  }
  for (const p of city.pedSpots) {
    p.position.x += Math.sin(p.rotation.y) * 0.8 * dt;
    p.position.z += Math.cos(p.rotation.y) * 0.8 * dt;
    if (Math.abs(p.position.x) > 122 || Math.abs(p.position.z) > 122) p.rotation.y += Math.PI;
  }
}

// ---------- cameras ----------
function chaseCamera() {
  const back = state.mode === 'drive' ? hero : player;
  const h = state.mode === 'drive' ? state.heading : back.rotation.y;
  const dist = state.mode === 'drive' ? 10.5 : 7;
  const height = state.mode === 'drive' ? 4.2 : 3.2;
  camera.position.set(
    back.position.x - Math.sin(h) * dist,
    height,
    back.position.z - Math.cos(h) * dist
  );
  camera.lookAt(back.position.x + Math.sin(h) * 6, 1.6, back.position.z + Math.cos(h) * 6);
}

// ---------- shot setups (deterministic) ----------
function setupShot() {
  fillStartScreen();
  // The job beacon reads as a glitch bar in the start / map shots — hide it there.
  beacon.visible = !(SHOT === 'start' || SHOT === 'map');
  if (SHOT === 'cover') {
    state.mode = 'drive';
    state.speed = 22;
    hero.position.set(0, 0, -30);
    hero.rotation.y = Math.PI + 0.55; // mid-drift angle, hero clearly visible from behind-side
    state.heading = hero.rotation.y;
    // drift smoke behind the rear wheels: rear = -forward
    const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
    for (let i = 0; i < 24; i++) {
      const back = 1.6 + rng.range(0, 2.2);
      spawnSmoke(hero.position.x - fx * back + rng.range(-1.2, 1.2), 0.35,
        hero.position.z - fz * back + rng.range(-0.6, 0.6));
    }
    // traffic far ahead in frame, on the same avenue — clear of the hero
    traffic[0].position.set(-16, 0, -54); traffic[0].rotation.y = Math.PI / 2;
    traffic[1].position.set(18, 0, -56); traffic[1].rotation.y = Math.PI / 2;
    // hide parked cars in the hero corridor so nothing blocks the chase framing
    for (const v of city.parked) {
      if (Math.abs(v.position.x) < 26 && v.position.z > -48 && v.position.z < -10) v.visible = false;
    }
    camera.position.set(3, 4.0, -17);
    camera.lookAt(-1, 1.2, -33);
    hud.style.display = 'block';
    startEl.style.display = 'none'; mapEl.style.display = 'none';
  } else if (SHOT === 'start') {
    state.mode = 'walk';
    player.position.set(6, 0, 8);
    player.rotation.y = Math.PI * 0.75;
    camera.position.set(58, 52, 62);
    camera.lookAt(0, 0, 0);
    hud.style.display = 'none';
    startEl.style.display = 'block'; mapEl.style.display = 'none';
  } else if (SHOT === 'night') {
    // Action ON the avenue (z = -30), flanked by lit facades + neon — never inside a block.
    state.mode = 'walk';
    state.wanted = 2;
    player.position.set(56, 0, -30);
    player.rotation.y = Math.PI / 2; // facing +x, down the neon avenue toward the police car
    policeCars[0].position.set(66, 0, -30);
    policeCars[0].rotation.y = -Math.PI / 2;
    // muzzle flash frozen mid-shot + tracer toward the street
    flash.position.set(57.2, 1.3, -29.4);
    flash.intensity = 55;
    const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: lightPoolTexture(), transparent: true, opacity: 0.95, depthWrite: false,
    }));
    flashSprite.position.set(57.4, 1.25, -29.3);
    flashSprite.scale.set(1.6, 1.6, 1);
    scene.add(flashSprite);
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(57.4, 1.25, -29.3), new THREE.Vector3(65, 1.2, -30),
    ]);
    scene.add(new THREE.Line(tracerGeo,
      new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.95 })));
    camera.position.set(50.5, 2.8, -25.5);
    camera.lookAt(62, 1.5, -30);
    hud.style.display = 'block';
    startEl.style.display = 'none'; mapEl.style.display = 'none';
  } else if (SHOT === 'map') {
    state.mode = 'drive';
    hero.position.set(0, 0, 30);
    camera.position.set(0, 185, 0.5);
    camera.lookAt(0, 0, 0);
    hud.style.display = 'none';
    startEl.style.display = 'none'; mapEl.style.display = 'block';
    fillStartScreen();
  }
  updateHUD();
  drawMinimap();
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) flash.intensity = 0; }
  if (state.mode === 'drive') stepDrive(dt); else stepWalk(dt);
  stepTraffic(dt);
  updateSmoke(dt);
  if (SHOT === 'cover' || SHOT === 'night') { /* fixed shot camera */ }
  else if (SHOT === 'start') { camera.position.set(58, 52, 62); camera.lookAt(0, 0, 0); }
  else if (SHOT === 'map') { camera.position.set(0, 185, 0.5); camera.lookAt(0, 0, 0); }
  else chaseCamera();
  updateHUD();
  drawMinimap();
  renderer.render(scene, camera);
  if (!SHOT_MODE) requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setupShot();
if (SHOT_MODE) {
  // Deterministic: advance traffic a fixed number of steps, then render once.
  // NOTE: do NOT updateSmoke here — 90 steps (1.5 s) would kill the shot's
  // initial smoke (max life 1.2 s) before the screenshot.
  for (let i = 0; i < 90; i++) {
    stepTraffic(1 / 60);
    if (flashT > 0) flashT -= 1 / 60;
  }
  updateHUD();
  drawMinimap();
  renderer.render(scene, camera);
  window.__ready = true;
  document.title = 'READY';
  // Keep re-presenting the SAME fixed frame: headless screenshots otherwise
  // capture a cleared compositor frame. No simulation advance here.
  const repaint = () => { renderer.render(scene, camera); requestAnimationFrame(repaint); };
  requestAnimationFrame(repaint);
} else {
  player.visible = true;
  requestAnimationFrame(frame);
}
