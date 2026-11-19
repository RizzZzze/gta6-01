// main.js — Equator Drive: game loop, player, camera, input, states,
// save/load, garage, police spawning and the four deterministic shot
// setups. All randomness is seeded; shot mode runs a fixed number of
// fixed-dt steps and then freezes, so two loads render pixel-identical.
import * as THREE from 'three';
import { makeRng, WORLD_SEED, SHOT_SEEDS } from './rng.js';
import { buildCity, districtAt } from './city.js';
import { Vehicle, VEHICLE_DEFS, parkedSpawnPoints, randomRoadPoint, clearAround } from './vehicles.js';
import { Pedestrian, TrafficCar, PoliceUnit, WantedManager, Guard, shootAt, SmokePool, MuzzleFlash, POLICE_CALLSIGNS } from './actors.js';
import { MissionManager, JOBS } from './missions.js';
import { HUD } from './hud.js';
import { SoundBank } from './audio.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const SEED = SHOT ? (SHOT_SEEDS[SHOT] || 999) : WORLD_SEED;
const rng = makeRng(SEED);
const $ = (id) => document.getElementById(id);

const SAVE_KEY = 'equator-drive-save-v1';
const hud = new HUD();
const sounds = new SoundBank();
let renderer, scene, camera, sun, hemi, skyMesh;
let colliders = [];
let player, playerHeading = 0, playerSpeed = 0;
let onFoot = true;
let currentVehicle = null;
let vehicles = [];      // parked + traffic + police vehicles (all Vehicle)
let traffic = [];
let pedestrians = [];
let police = [];
let guards = [];
let wanted = new WantedManager();
let missions;
let smoke, flash;
let beacon;
let keys = {};
let camMode = 0;
let money = 1250, day = 1, clockMin = 9 * 60 + 12;
let weapon = 'pistol';
let ammo = { pistol: 48, smg: 120 };
let evadeArmed = false;
let keptCars = 0;
let garageColors = [0xff2e88, 0x2e9bff, 0xffb02e, 0x7dffb0, 0xffffff];
let garageColorIdx = 0;
let elapsed = 0;
let lastSave = 0;
let gameStarted = false;
let mapOpen = false;
let shotDone = false;
let stepCount = 0;

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('scene').appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9cc8e8, 180, 480);
  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
  hemi = new THREE.HemisphereLight(0xbfe3ff, 0x5a6a4a, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 500;
  scene.add(sun);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function setTimeOfDay(mode) {
  if (mode === 'night') {
    scene.background = new THREE.Color(0x0a1024);
    scene.fog = new THREE.Fog(0x0a1024, 120, 420);
    sun.intensity = 0.25; sun.color.set(0x8fa8ff);
    hemi.intensity = 0.25;
  } else {
    scene.background = new THREE.Color(0x87bfe8);
    scene.fog = new THREE.Fog(0x9cc8e8, 180, 480);
    sun.intensity = 2.2; sun.color.set(0xfff2d0);
    hemi.intensity = 0.9;
  }
}

function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5a, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.85, 8), jacket);
  body.position.y = 0.95; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.62; head.castShadow = true; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.7 }));
  cap.position.y = 1.8; g.add(cap);
  for (const sx of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 6), pants);
    leg.position.set(sx, 0.28, 0); g.add(leg);
  }
  return g;
}

function setupWorld() {
  const built = buildCity(scene);
  colliders = built.colliders;
  smoke = new SmokePool(scene);
  flash = new MuzzleFlash(scene);
  // Objective beacon: a floating yellow diamond.
  beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6),
    new THREE.MeshBasicMaterial({ color: 0xffd75e })
  );
  scene.add(beacon);
  // Player starts on foot at the downtown plaza.
  player = makePlayerMesh();
  player.position.set(0, 0, 20);
  scene.add(player);
  // Parked stealable cars on road lanes (clear space guaranteed).
  const spots = parkedSpawnPoints(rng, colliders, 14);
  const parkedTypes = ['sedan', 'taxi', 'pickup', 'angkot', 'bajaj', 'sedan', 'pickup', 'sedan', 'taxi', 'bajaj', 'angkot', 'sedan', 'pickup', 'bajaj'];
  spots.forEach((p, i) => {
    const v = new Vehicle(parkedTypes[i % parkedTypes.length], undefined, p.x, p.z, p.heading);
    v.parked = true;
    vehicles.push(v);
    scene.add(v.mesh);
  });
  // The marked sedan for job 2 sits near Old Canal.
  const marked = new Vehicle('sedan', 0xd9b02e, -180, -150, 0);
  marked.parked = true; marked.marked = true;
  vehicles.push(marked); scene.add(marked.mesh);
  // The hero buggy waits on the beach for the finale.
  const buggy = new Vehicle('buggy', undefined, 0, 210, Math.PI);
  buggy.parked = true; buggy.hero = true;
  vehicles.push(buggy); scene.add(buggy.mesh);
  // Traffic.
  const trafficTypes = ['sedan', 'taxi', 'pickup', 'angkot', 'bajaj', 'sedan'];
  for (let i = 0; i < 10; i++) {
    const t = new TrafficCar(scene, trafficTypes[i % trafficTypes.length], undefined, rng);
    traffic.push(t);
    vehicles.push(t.vehicle);
  }
  // Pedestrians on sidewalks.
  for (let i = 0; i < 22; i++) {
    const lanes = [-180, -120, -60, 0, 60, 120, 180];
    const lane = lanes[rng.int(0, lanes.length - 1)];
    const vertical = rng.chance(0.5);
    const p = new Pedestrian(scene, rng,
      vertical ? lane + 8 : rng.range(-210, 210),
      vertical ? rng.range(-210, 210) : lane + 8);
    pedestrians.push(p);
  }
  // Guards at the harbor yard (jobs 5-6).
  for (let i = 0; i < 4; i++) {
    guards.push(new Guard(scene, rng, 140 + i * 8, 110 + (i % 2) * 12));
  }
}

function playerPos() {
  return currentVehicle
    ? { x: currentVehicle.x, z: currentVehicle.z }
    : { x: player.position.x, z: player.position.z };
}

function spawnPolice() {
  const tier = wanted.tier();
  while (police.length < tier.units.length) {
    const idx = police.length;
    const type = tier.units[idx];
    const callsign = POLICE_CALLSIGNS[(idx * 2 + rng.int(0, 1)) % POLICE_CALLSIGNS.length];
    const a = rng.range(0, Math.PI * 2);
    const pp = playerPos();
    const x = Math.max(-220, Math.min(220, pp.x + Math.cos(a) * 55));
    const z = Math.max(-220, Math.min(220, pp.z + Math.sin(a) * 55));
    const unit = new PoliceUnit(scene, type, callsign, 100 + idx * 17 + rng.int(0, 9), x, z, 0);
    unit.flank = idx % 2 === 0 ? -5 : 5; // inside the chase camera's field of view
    police.push(unit);
    vehicles.push(unit.vehicle);
  }
}
function despawnPolice() {
  for (const u of police) {
    scene.remove(u.vehicle.mesh);
    const i = vehicles.indexOf(u.vehicle);
    if (i >= 0) vehicles.splice(i, 1);
  }
  police = [];
}

function nearestVehicle(maxDist) {
  let best = null, bestD = maxDist;
  const px = player.position.x, pz = player.position.z;
  for (const v of vehicles) {
    if (v.ai && v.ai.kind === 'police') continue;
    const d = Math.hypot(v.x - px, v.z - pz);
    if (d < bestD) { best = v; bestD = d; }
  }
  return best;
}

function enterVehicle(v) {
  currentVehicle = v;
  onFoot = false;
  player.visible = false;
  if (v.parked && !v.stolen) {
    v.stolen = true;
    v.parked = false;
    if (!v.hero) {
      hud.showBanner('VEHICLE STOLEN');
      wanted.addHeat(30);
      sounds.steal();
      missions.onEvent && null;
    } else {
      hud.showBanner('BROOMBROOM S1 — YOURS NOW');
    }
  }
  if (v.ai && v.ai.kind === 'traffic') {
    v.ai = null; // the driver flees; the car is yours now
    hud.showBanner('VEHICLE STOLEN');
    wanted.addHeat(30);
    sounds.steal();
  }
  hud.setCrosshair(false);
}

function exitVehicle() {
  if (!currentVehicle) return;
  const v = currentVehicle;
  // Step out to the side, on open ground (never inside a collider).
  let sx = v.x + Math.cos(v.heading + Math.PI / 2) * 2.2;
  let sz = v.z - Math.sin(v.heading + Math.PI / 2) * 2.2;
  if (!clearAround(sx, sz, 1.2, colliders, [])) { sx = v.x - Math.cos(v.heading + Math.PI / 2) * 2.2; sz = v.z + Math.sin(v.heading + Math.PI / 2) * 2.2; }
  player.position.set(sx, 0, sz);
  playerHeading = v.heading;
  player.visible = true;
  currentVehicle = null;
  onFoot = true;
  // Garage: parking a kept car in the yard stores it.
  if (Math.hypot(sx + 150, sz - 120) < 12 && v.stolen) {
    keptCars += 1;
    hud.showBanner('CAR STORED IN GARAGE');
    sounds.pickup();
  }
}

function shoot() {
  if (!onFoot) return;
  if (weapon === 'fists') return;
  if (ammo[weapon] <= 0) { hud.showDialogue('ARI "KANCIL" SAPUTRA', '"Out of ammo."', 2); return; }
  ammo[weapon] -= 1;
  sounds.gunshot();
  const dir = { x: Math.sin(playerHeading), z: Math.cos(playerHeading) };
  const origin = { x: player.position.x, z: player.position.z };
  const hit = shootAt(origin, dir, guards, 60);
  flash.fire(player.position.x, 1.4, player.position.z, playerHeading);
  wanted.addHeat(12);
  if (hit && !hit.alive) {
    missions.eliminated += 1;
    hud.showBanner('GUARD DOWN');
  }
}

// --- Missions, save, input --------------------------------------------------
function missionEvents(type, payload) {
  if (type === 'dialogue') hud.showDialogue(payload.name, payload.text);
  if (type === 'banner') hud.showBanner(payload.text);
  if (type === 'stage' && missions.job) hud.setMission(missions.job.title, payload.text, payload.timer || 0);
  if (type === 'tick') hud.setMission(missions.job.title, missions.stage ? missions.stage.text : '', payload.timer);
  if (type === 'jobDone') { money += payload.payout; saveGame(); }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money, day, clockMin, jobIndex: missions.jobIndex,
      completedJobs: missions.completedJobs, earned: missions.earned, keptCars,
    }));
  } catch (e) { /* storage unavailable: the game still plays */ }
}
function applySave(data) {
  if (!data) return;
  money = data.money ?? 1250;
  day = data.day ?? 1;
  clockMin = data.clockMin ?? 552;
  keptCars = data.keptCars ?? 0;
  missions.restore(data);
}
function updateSaveLabel() {
  const s = loadSave();
  $('save-state').textContent = s
    ? 'Save found — Chapter ' + (s.jobIndex + 1) + ' · $' + s.money.toLocaleString('en-US') + ' · Day ' + s.day
    : 'No save yet — start a new game.';
}

function startGame(fromSave) {
  if (fromSave) applySave(loadSave());
  $('start-screen').style.display = 'none';
  hud.show();
  gameStarted = true;
  sounds.ensure();
  if (missions.state === 'idle' && !missions.done) missions.startJob();
  else if (missions.job) hud.setMission(missions.job.title, missions.stage ? missions.stage.text : 'All jobs complete.', 0);
  hud.setMoney(money);
}

function bindInput() {
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE' && gameStarted && !mapOpen) {
      if (onFoot) { const v = nearestVehicle(4.5); if (v) enterVehicle(v); }
      else exitVehicle();
    }
    if (e.code === 'KeyF' && gameStarted && !mapOpen) shoot();
    if (e.code === 'KeyM' && gameStarted) {
      mapOpen = !mapOpen;
      hud.showMap(mapOpen);
      if (mapOpen) { hud.renderJobList(missions); hud.drawBigMap(player.position.x, player.position.z, missions.objective(), missions); }
    }
    if (e.code === 'KeyC' && gameStarted) camMode = (camMode + 1) % 3;
    if (e.code === 'KeyT' && currentVehicle) { currentVehicle.repair(); hud.showBanner('VEHICLE REPAIRED'); }
    if (e.code === 'KeyR' && currentVehicle && Math.hypot(currentVehicle.x + 150, currentVehicle.z - 120) < 12) {
      garageColorIdx = (garageColorIdx + 1) % garageColors.length;
      currentVehicle.mesh.traverse((m) => {
        if (m.material && m.material.roughness === 0.35 && m.material.metalness === 0.55) m.material.color.setHex(garageColors[garageColorIdx]);
      });
      hud.showBanner('RESPRAY COMPLETE');
      sounds.pickup();
    }
    if (e.code === 'Digit1') { weapon = 'fists'; hud.setWeapons('fists', ammo); }
    if (e.code === 'Digit2') { weapon = 'pistol'; hud.setWeapons('pistol', ammo); }
    if (e.code === 'Digit3') { weapon = 'smg'; hud.setWeapons('smg', ammo); }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  $('btn-continue').addEventListener('click', () => startGame(true));
  $('btn-new').addEventListener('click', () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    money = 1250; day = 1; clockMin = 552; keptCars = 0;
    missions.jobIndex = 0; missions.completedJobs = []; missions.earned = 0; missions.state = 'idle';
    startGame(false);
  });
}

function playerInput() {
  return {
    forward: !!(keys.KeyW || keys.ArrowUp),
    back: !!(keys.KeyS || keys.ArrowDown),
    left: !!(keys.KeyA || keys.ArrowLeft),
    right: !!(keys.KeyD || keys.ArrowRight),
    handbrake: !!keys.Space,
  };
}
function movePlayerOnFoot(dt) {
  const input = playerInput();
  const turn = ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * 2.6 * dt;
  playerHeading += turn;
  const speed = input.forward ? 5 : input.back ? -2.5 : 0;
  player.position.x += Math.sin(playerHeading) * speed * dt;
  player.position.z += Math.cos(playerHeading) * speed * dt;
  player.position.x = Math.max(-234, Math.min(234, player.position.x));
  player.position.z = Math.max(-234, Math.min(234, player.position.z));
  // Push out of building footprints (same rule as cars).
  const r = 0.6;
  for (const c of colliders) {
    const nx = Math.max(c.x - c.hw, Math.min(player.position.x, c.x + c.hw));
    const nz = Math.max(c.z - c.hd, Math.min(player.position.z, c.z + c.hd));
    const dx = player.position.x - nx, dz = player.position.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      player.position.x += (dx / d) * (r - d);
      player.position.z += (dz / d) * (r - d);
    }
  }
  player.rotation.y = playerHeading;
}

// --- Camera, loop -----------------------------------------------------------
function updateCamera(dt) {
  const target = currentVehicle ? currentVehicle.mesh.position : player.position;
  const heading = currentVehicle ? currentVehicle.heading : playerHeading;
  const dists = [11, 6, 14], heights = [5, 2.6, 7];
  const dist = dists[camMode], height = heights[camMode];
  const cx = target.x - Math.sin(heading) * dist;
  const cz = target.z - Math.cos(heading) * dist;
  const want = new THREE.Vector3(cx, height, cz);
  camera.position.lerp(want, Math.min(1, dt * 6));
  camera.lookAt(target.x, 1.6, target.z);
}

function update(dt) {
  elapsed += dt;
  stepCount += 1;
  clockMin += dt * 0.667;
  if (clockMin >= 1440) { clockMin -= 1440; day += 1; }
  const input = playerInput();
  if (onFoot) movePlayerOnFoot(dt);
  else if (currentVehicle) {
    currentVehicle.drive(input, dt, colliders, (v) => smoke.spawn(v.x - Math.sin(v.heading) * 1.5, v.z - Math.cos(v.heading) * 1.5));
    if (currentVehicle.drifting) hud.showDrift(currentVehicle.driftScore);
    else hud.hideDrift();
    sounds.driftScreech(currentVehicle.drifting);
    sounds.setEngine(Math.abs(currentVehicle.speed) / currentVehicle.def.topSpeed, true);
  } else sounds.setEngine(0, false);
  for (const t of traffic) t.update(dt, colliders, vehicles);
  for (const p of pedestrians) p.update(dt);
  smoke.update(dt);
  flash.update(dt, camera);
  // Wanted + police. pp is the player or their vehicle — never the stale
  // on-foot position while driving.
  const pp = playerPos();
  const inSight = police.some((u) => u.distanceTo(pp.x, pp.z) < 60);
  wanted.update(dt, inSight);
  if (wanted.stars > 0) spawnPolice();
  else if (police.length) despawnPolice();
  for (const u of police) u.update(dt, pp.x, pp.z, colliders);
  sounds.setSiren(wanted.stars > 0, elapsed);
  // Missions.
  if (missions.job && missions.job.id === 'heat-up' && missions.stageIndex === 0 && wanted.stars > 0) evadeArmed = true;
  missions.update({
    px: pp.x, pz: pp.z,
    inCar: !onFoot, carType: currentVehicle ? currentVehicle.type : null,
    stolen: !!(currentVehicle && currentVehicle.stolen),
    wanted: wanted.stars, eliminated: missions.eliminated, evadeArmed, dt,
  });
  // Objective beacon.
  const obj = missions.objective();
  if (obj && gameStarted) {
    beacon.visible = true;
    beacon.position.set(obj.x, 6 + Math.sin(elapsed * 2) * 0.6, obj.z);
    beacon.rotation.y += dt * 2;
  } else beacon.visible = false;
  // HUD.
  if (gameStarted && !mapOpen) {
    if (elapsed - lastSave > 20) { lastSave = elapsed; saveGame(); }
    const j = missions.job;
    hud.setMission(j ? j.title : 'All jobs complete', missions.stage ? missions.stage.text : 'Story complete — free roam.', 0);
    hud.setWanted(wanted.stars);
    hud.setMoney(money);
    hud.setClock(day, Math.floor(clockMin / 60), Math.floor(clockMin % 60));
    hud.setPolice(police, pp.x, pp.z);
    hud.setDrive(onFoot ? 'ON FOOT' : currentVehicle.label, onFoot ? 0 : Math.abs(currentVehicle.speed) * 3.6, onFoot ? 100 : currentVehicle.condition);
    hud.setWeapons(weapon, ammo);
    hud.setDistrict(pp.x, pp.z);
    hud.drawMinimap(pp.x, pp.z, onFoot ? playerHeading : currentVehicle.heading, police, obj);
    hud.update(dt);
  }
  updateCamera(dt);
}

let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (SHOT) {
    // Deterministic shot mode: fixed steps, then freeze on the final frame.
    update(1 / 60);
    if (stepCount >= 90) {
      finishShot();
      renderer.render(scene, camera);
      window.__shotDone = true;
      return;
    }
    requestAnimationFrame(loop);
    return;
  }
  if (gameStarted) update(dt);
  else {
    // Menu backdrop: slow orbit over downtown.
    const a = t * 0.00004;
    camera.position.set(Math.sin(a) * 90, 42, Math.cos(a) * 90);
    camera.lookAt(0, 8, 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function finishShot() {
  if (SHOT === 'night') {
    // Aim at the nearest guard and fire once so the muzzle flash is fully
    // visible in the final frame (never behind a dialogue box).
    let best = null, bestD = 1e9;
    for (const g of guards) {
      const d = Math.hypot(g.x - player.position.x, g.z - player.position.z);
      if (d < bestD) { best = g; bestD = d; }
    }
    if (best) {
      playerHeading = Math.atan2(best.x - player.position.x, best.z - player.position.z);
      player.rotation.y = playerHeading;
      shoot();
      flash.update(0, camera); // face the flash at the camera for the freeze frame
      document.getElementById('dialogue').classList.remove('on'); // flash never behind dialogue
      hud.setWanted(2);
    }
  }
  if (SHOT === 'cover') {
    hud.setWanted(2);
  }
}

// --- Shot setups ------------------------------------------------------------
function setupShot() {
  if (SHOT === 'start') {
    // Start screen over a live city view, with a sample save shown.
    $('start-screen').style.background =
      'linear-gradient(160deg, rgba(10,42,68,0.88) 0%, rgba(18,58,92,0.88) 45%, rgba(61,15,56,0.88) 100%)';
    $('save-state').textContent = 'Save found — Chapter 3 · $2,150 · Day 2 · 14:30';
    camera.position.set(70, 38, 110);
    camera.lookAt(0, 10, 0);
    return;
  }
  // All other shots play the game with the HUD up.
  $('start-screen').style.display = 'none';
  hud.show();
  gameStarted = true;
  sounds.ensure();
  if (SHOT === 'cover') {
    const buggy = vehicles.find((v) => v.hero);
    buggy.x = 0; buggy.z = -60; buggy.heading = Math.PI;
    buggy.mesh.position.set(0, 0, -60); buggy.mesh.rotation.y = Math.PI;
    player.position.set(0, 0, -60);
    enterVehicle(buggy);
    buggy.speed = 18; // mid-chase: the speedometer reads a real chase speed
    keys.KeyW = true; // shot mode: hold the throttle through the freeze frame
    wanted.stars = 2; wanted.heat = 60;
    spawnPolice();
    // Flanking, never in the camera corridor behind the buggy; faster than
    // the buggy so they stay in frame for the whole chase.
    if (police[0]) { police[0].vehicle.x = -5; police[0].vehicle.z = -78; police[0].vehicle.heading = Math.PI; police[0].vehicle.speed = 40; police[0].vehicle.topSpeedOverride = 56; police[0].vehicle.ai = { kind: 'escort' }; }
    if (police[1]) { police[1].vehicle.x = 5; police[1].vehicle.z = -82; police[1].vehicle.heading = Math.PI; police[1].vehicle.speed = 40; police[1].vehicle.topSpeedOverride = 56; police[1].vehicle.ai = { kind: 'escort' }; }
    // Two traffic cars ahead on the same road for chase density.
    if (traffic[0]) { traffic[0].vehicle.x = -3; traffic[0].vehicle.z = -95; traffic[0].vehicle.heading = Math.PI; }
    if (traffic[1]) { traffic[1].vehicle.x = 3; traffic[1].vehicle.z = -115; traffic[1].vehicle.heading = Math.PI; }
    missions.startJob();
    hud.bannerTimer = 0.4; // job banner clears before the freeze frame
    hud.showDialogue('NADIA', '"Ari, the Meridian Hotel needs a valet at the Delta Towers stand. Drive there — and do not scratch anything."', 5);
    camera.position.set(0, 5, -48);
    camera.lookAt(0, 1.6, -60);
  }
  if (SHOT === 'night') {
    setTimeOfDay('night');
    clockMin = 23 * 60 + 40; // night shot shows a night clock
    // Open yard south of the container rows: player in left profile,
    // guards in a line ahead with the containers as the backdrop.
    player.position.set(120, 0, 162);
    playerHeading = Math.atan2(125 - 120, 140 - 162);
    player.rotation.y = playerHeading;
    weapon = 'pistol';
    hud.setWeapons('pistol', ammo);
    guards.forEach((g, i) => {
      const gx = [110, 120, 130, 142][i], gz = [148, 146, 148, 146][i];
      g.x = gx; g.z = gz;
      g.mesh.position.set(gx, 0, gz);
      g.mesh.visible = true; g.alive = true; g.health = 100;
    });
    wanted.stars = 2; wanted.heat = 60; // police respond during the steps
    missions.jobIndex = 5;
    missions.startJob();
    hud.bannerTimer = 0.4;
    camera.position.set(104, 3.2, 170);
    camera.lookAt(124, 1.3, 142);
  }
  if (SHOT === 'map') {
    missions.completedJobs = ['valet-shift', 'borrowed-keys'];
    missions.earned = 1050;
    missions.jobIndex = 2;
    money = 2300;
    hud.setMoney(money);
    missions.startJob(); // active job so the objective + GPS route draw
    hud.bannerTimer = 0;
    mapOpen = true;
    hud.showMap(true);
    hud.renderJobList(missions);
    hud.drawBigMap(player.position.x, player.position.z, missions.objective(), missions);
  }
}

// --- Boot -------------------------------------------------------------------
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));

initRenderer();
setupWorld();
missions = new MissionManager(missionEvents);
bindInput();
updateSaveLabel();
hud.setWeapons('pistol', ammo);
if (SHOT) setupShot();
window.__gameReady = true;
requestAnimationFrame(loop);
