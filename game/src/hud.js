// hud.js — All DOM HUD updates, the circular minimap, the full city map
// screen, dialogue and banners. Text is white on near-black panels, which
// passes APCA Lc 60 for content and Lc 45 for headlines by a wide margin.
import { DISTRICTS, districtAt } from './city.js';
import { JOBS } from './missions.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.minimap = $('minimap');
    this.bigmap = $('bigmap');
    this.bannerTimer = 0;
    this.dialogueTimer = 0;
    this.radioTracks = [
      ['Solar Winds', 'The Meridian Line'],
      ['Neon Tide', 'Harbor Lights'],
      ['Canal Street Blues', 'The Ferrymen'],
      ['Equator Heat', 'DJ Meridian'],
    ];
    this.radioIndex = 0;
    this.radioTimer = 0;
  }
  show() { $('hud').classList.add('on'); }
  hide() { $('hud').classList.remove('on'); }

  setMission(title, next, timer) {
    $('mission-title').textContent = title;
    $('mission-next').textContent = next;
    $('mission-timer').textContent = timer > 0 ? 'TIME LEFT — ' + timer + 's' : '';
  }
  setWanted(stars) {
    let html = '';
    for (let i = 0; i < 4; i++) html += stars > i ? '★' : '<span class="off">★</span>';
    $('wanted').innerHTML = html;
  }
  setMoney(amount) { $('money').textContent = '$' + amount.toLocaleString('en-US'); }
  setClock(day, hh, mm) {
    $('clock').textContent = 'DAY ' + day + '  ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  setPolice(units, px, pz) {
    if (!units.length) { $('police-list').textContent = 'No units assigned.'; return; }
    $('police-list').innerHTML = units.map((u) => {
      const d = Math.round(Math.hypot(u.vehicle.x - px, u.vehicle.z - pz));
      return '<b>' + u.label + '</b> — ' + u.state + ' — ' + d + ' m';
    }).join('<br>');
  }
  setDrive(vehicleName, speedKmh, condition) {
    $('vehicle-name').textContent = vehicleName;
    $('speed').innerHTML = Math.round(speedKmh) + ' <small>km/h</small>';
    const fill = $('condition-fill');
    fill.style.width = Math.max(0, condition) + '%';
    fill.style.background = condition > 55 ? '#7dffb0' : condition > 25 ? '#ffb02e' : '#ff5d5d';
    $('vignette').classList.toggle('on', condition > 0 && condition < 25);
  }
  setWeapons(active, ammo) {
    for (const key of ['fists', 'pistol', 'smg']) {
      $('slot-' + key).classList.toggle('active', active === key);
    }
    document.querySelector('#slot-pistol .ammo').textContent = ammo.pistol;
    document.querySelector('#slot-smg .ammo').textContent = ammo.smg;
  }
  setDistrict(x, z) { $('district').textContent = districtAt(x, z); }
  showBanner(text, seconds = 2.4) {
    const b = $('banner');
    b.textContent = text;
    b.classList.add('on');
    this.bannerTimer = seconds;
  }
  showDialogue(name, text, seconds = 5) {
    $('dialogue-name').textContent = name;
    $('dialogue-text').textContent = text;
    $('portrait').textContent = name.trim().charAt(0);
    $('portrait').style.background = name.startsWith('ARI') ? '#ff2e88' : name.startsWith('NADIA') ? '#2e9bff' : '#ffb02e';
    $('dialogue').classList.add('on');
    this.dialogueTimer = seconds;
  }
  showDrift(score) {
    const d = $('drift');
    d.textContent = 'DRIFT +' + Math.round(score);
    d.classList.add('on');
  }
  hideDrift() { $('drift').classList.remove('on'); }
  setCrosshair(on) { $('crosshair').classList.toggle('on', on); }
  update(dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) $('banner').classList.remove('on');
    }
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) $('dialogue').classList.remove('on');
    }
    this.radioTimer += dt;
    if (this.radioTimer > 24) {
      this.radioTimer = 0;
      this.radioIndex = (this.radioIndex + 1) % this.radioTracks.length;
      const [track, artist] = this.radioTracks[this.radioIndex];
      $('radio-track').textContent = track + ' — ' + artist;
    }
  }
}

HUD.prototype.drawMinimap = function (px, pz, heading, police, objective) {
  const c = this.minimap, g = c.getContext('2d');
  const S = c.width, R = S / 2;
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#0d2733'; g.fillRect(0, 0, S, S);
  const scale = S / 200; // show a 200 m window around the player
  const toMap = (x, z) => [R + (x - px) * scale, R + (z - pz) * scale];
  for (const d of DISTRICTS) {
    const [x0, z0] = toMap(d.x0, d.z0);
    const [x1, z1] = toMap(d.x1, d.z1);
    g.fillStyle = d.ground;
    g.globalAlpha = 0.55;
    g.fillRect(x0, z0, x1 - x0, z1 - z0);
    g.globalAlpha = 1;
  }
  g.strokeStyle = '#3a3f45'; g.lineWidth = 5;
  for (let v = -180; v <= 180; v += 60) {
    const [ax, az] = toMap(v, -240), [bx, bz] = toMap(v, 240);
    g.beginPath(); g.moveTo(ax, az); g.lineTo(bx, bz); g.stroke();
    const [cx, cz] = toMap(-240, v), [dx, dz] = toMap(240, v);
    g.beginPath(); g.moveTo(cx, cz); g.lineTo(dx, dz); g.stroke();
  }
  if (objective) {
    const [ox, oz] = toMap(objective.x, objective.z);
    g.fillStyle = '#ffd75e';
    g.beginPath(); g.moveTo(ox, oz - 8); g.lineTo(ox + 7, oz); g.lineTo(ox, oz + 8); g.lineTo(ox - 7, oz); g.closePath(); g.fill();
  }
  for (const u of police) {
    const [ux, uz] = toMap(u.vehicle.x, u.vehicle.z);
    g.fillStyle = '#ff3b30';
    g.beginPath(); g.arc(ux, uz, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  }
  // Player arrow, pointing along heading.
  g.save();
  g.translate(R, R); g.rotate(Math.PI - heading);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill();
  g.strokeStyle = '#ff2e88'; g.lineWidth = 2; g.stroke();
  g.restore();
  g.restore();
};

HUD.prototype.drawBigMap = function (px, pz, objective, missions) {
  const c = this.bigmap, g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0d2733'; g.fillRect(0, 0, W, H);
  const s = Math.min(W, H) / 500;
  const ox = (W - 480 * s) / 2, oz = (H - 480 * s) / 2;
  const toMap = (x, z) => [ox + (x + 240) * s, oz + (z + 240) * s];
  for (const d of DISTRICTS) {
    const [x0, z0] = toMap(d.x0, d.z0);
    const [x1, z1] = toMap(d.x1, d.z1);
    g.fillStyle = d.ground; g.globalAlpha = 0.8;
    g.fillRect(x0, z0, x1 - x0, z1 - z0); g.globalAlpha = 1;
  }
  g.strokeStyle = '#20262c'; g.lineWidth = 7;
  for (let v = -180; v <= 180; v += 60) {
    const [ax, az] = toMap(v, -240), [bx, bz] = toMap(v, 240);
    g.beginPath(); g.moveTo(ax, az); g.lineTo(bx, bz); g.stroke();
    const [cx, cz] = toMap(-240, v), [dx, dz] = toMap(240, v);
    g.beginPath(); g.moveTo(cx, cz); g.lineTo(dx, dz); g.stroke();
  }
  // Labels AFTER roads, on a dark pill, so no road line cuts through text.
  for (const d of DISTRICTS) {
    const [x0, z0] = toMap(d.x0, d.z0);
    const [x1, z1] = toMap(d.x1, d.z1);
    const cx = (x0 + x1) / 2, cy = (z0 + z1) / 2 - (z1 - z0) * 0.18;
    g.font = 'bold 13px sans-serif';
    const w = g.measureText(d.name).width + 14;
    g.fillStyle = 'rgba(4,10,18,0.78)';
    g.beginPath(); g.roundRect(cx - w / 2, cy - 11, w, 22, 6); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.fillText(d.name, cx, cy + 5);
  }
  // Monorail ring + ferris wheel + bridge markers.
  g.strokeStyle = '#ffd75e'; g.lineWidth = 3;
  const [rx, rz] = toMap(0, 0);
  g.beginPath(); g.arc(rx, rz, 52 * s, 0, Math.PI * 2); g.stroke();
  const [fx, fz] = toMap(0, 210);
  g.fillStyle = '#ffd75e'; g.beginPath(); g.arc(fx, fz, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.textAlign = 'left';
  g.fillText('Ferris Wheel', fx + 12, fz + 4);
  g.fillText('Monorail Ring', rx + 56 * s, rz);
  if (objective) {
    const [mx, mz] = toMap(objective.x, objective.z);
    // GPS route: dashed line from the player to the objective.
    const [px0, pz0] = toMap(px, pz);
    g.strokeStyle = '#ffd75e'; g.lineWidth = 3; g.setLineDash([8, 7]);
    g.beginPath(); g.moveTo(px0, pz0); g.lineTo(mx, mz); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffd75e';
    g.beginPath(); g.moveTo(mx, mz - 10); g.lineTo(mx + 9, mz); g.lineTo(mx, mz + 10); g.lineTo(mx - 9, mz); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  }
  const [pxm, pzm] = toMap(px, pz);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(pxm, pzm - 10); g.lineTo(pxm + 8, pzm + 8); g.lineTo(pxm - 8, pzm + 8); g.closePath(); g.fill();
  g.strokeStyle = '#ff2e88'; g.lineWidth = 2; g.stroke();
};

HUD.prototype.renderJobList = function (missions) {
  const el = $('job-list');
  el.innerHTML = JOBS.map((j, i) => {
    let state = 'Locked';
    if (missions.completedJobs.includes(j.id)) state = 'Complete';
    else if (i === missions.jobIndex) state = 'In progress';
    else if (i < missions.jobIndex) state = 'Complete';
    const color = state === 'Complete' ? '#7dffb0' : state === 'In progress' ? '#ffd75e' : '#9fb8cc';
    return '<div><span style="color:' + color + '">&#9679;</span> ' + (i + 1) + '. ' + j.title +
      ' — $' + j.payout + ' — <b style="color:' + color + '">' + state + '</b></div>';
  }).join('');
  $('map-stats').innerHTML =
    'Jobs complete: ' + missions.completedJobs.length + ' / 7<br>' +
    'Cash earned: $' + missions.earned.toLocaleString('en-US') + '<br>' +
    'Districts: 5 named + Downtown<br>Garage cars kept: 0';
};

HUD.prototype.showMap = function (on) {
  $('map-screen').style.display = on ? 'block' : 'none';
};
