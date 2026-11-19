// missions.js — The 7-job story curriculum: driving, stealing, evading,
// combat, and the buggy finale. Each job is a list of stages with a plain
// check; the manager advances stages, pays out, and drives the dialogue.
export const JOBS = [
  {
    id: 'valet-shift', title: 'Valet Shift', payout: 400,
    intro: 'Nadia: "Ari, the Meridian Hotel needs a valet at the Delta Towers stand. Drive there — and do not scratch anything."',
    stages: [
      { text: 'Drive to the Valet Stand in Delta Towers.', type: 'reach', x: 150, z: -150, r: 8 },
      { text: 'Park inside the marked bay.', type: 'reach', x: 150, z: -138, r: 5 },
    ],
  },
  {
    id: 'borrowed-keys', title: 'Borrowed Keys', payout: 650,
    intro: 'Bimo: "The prototype keys are in a sedan near the canal. Borrow the car — the owner will not miss it for an hour."',
    stages: [
      { text: 'Steal the marked sedan near Old Canal.', type: 'steal' },
      { text: 'Drive the sedan to the garage yard in Vila Hill.', type: 'deliver', x: -150, z: 120, r: 9 },
    ],
  },
  {
    id: 'canal-run', title: 'Canal Run', payout: 900,
    intro: 'Nadia: "A package has to cross the canal bridge before the 10:00 ferry. No police, no crashes. Go."',
    stages: [
      { text: 'Pick up the package at the canal market.', type: 'reach', x: -180, z: -150, r: 7 },
      { text: 'Cross the cable bridge and deliver to Delta Towers.', type: 'deliver', x: 120, z: -120, r: 8, timer: 150 },
    ],
  },
  {
    id: 'heat-up', title: 'Heat Up', payout: 1100,
    intro: 'Bimo: "You tripped a camera. Lose the police before you come back — two stars will not shake themselves."',
    stages: [
      { text: 'Raise police attention, then lose the wanted level.', type: 'evade' },
      { text: 'Return to the garage yard in Vila Hill.', type: 'reach', x: -150, z: 120, r: 9 },
    ],
  },
  {
    id: 'harbor-heist', title: 'Harbor Heist', payout: 1500,
    intro: 'Nadia: "A pickup full of parts is sitting at Crate Harbor. Guards on site. Take it — quietly is optional now."',
    stages: [
      { text: 'Reach Crate Harbor and deal with the guards.', type: 'eliminate', count: 3 },
      { text: 'Steal the pickup and drive it to the garage.', type: 'deliver', x: -150, z: 120, r: 9 },
    ],
  },
  {
    id: 'night-shift', title: 'Night Shift', payout: 1800,
    intro: 'Bimo: "Night run. The docks are lit up and the guards are jumpy. Clear the yard, then bring the van home."',
    stages: [
      { text: 'Clear the guards at the night yard.', type: 'eliminate', count: 4, night: true },
      { text: 'Drive the van to the garage yard.', type: 'deliver', x: -150, z: 120, r: 9 },
    ],
  },
  {
    id: 'broombroom-finale', title: 'Broombroom Finale', payout: 3000,
    intro: 'Nadia: "The Broombroom S1 is yours now, Ari. Three stars, one roadblock, one bridge. Drive it home and your name is clear."',
    stages: [
      { text: 'Take the Broombroom S1 buggy from the beach.', type: 'takeBuggy' },
      { text: 'Break through the roadblock and reach the finale gate.', type: 'deliver', x: 0, z: -180, r: 10 },
    ],
  },
];

export class MissionManager {
  constructor(onEvent) {
    this.onEvent = onEvent; // (type, payload) -> dialogue / banner / hud
    this.jobIndex = 0;
    this.stageIndex = 0;
    this.state = 'idle'; // idle | active | done
    this.timer = 0;
    this.eliminated = 0;
    this.completedJobs = [];
    this.earned = 0;
  }
  get job() { return JOBS[this.jobIndex]; }
  get stage() { return this.job ? this.job.stages[this.stageIndex] : null; }
  get done() { return this.jobIndex >= JOBS.length; }

  startJob() {
    if (this.done) return;
    this.state = 'active';
    this.stageIndex = 0;
    this.timer = 0;
    this.eliminated = 0;
    this.onEvent('dialogue', { name: 'NADIA / BIMO', text: this.job.intro });
    this.onEvent('banner', { text: 'JOB ' + (this.jobIndex + 1) + ' — ' + this.job.title.toUpperCase() });
    this.announceStage();
  }
  announceStage() {
    const s = this.stage;
    if (!s) return;
    if (s.timer) this.timer = s.timer;
    this.onEvent('stage', { text: s.text, timer: s.timer || 0 });
  }
  completeJob() {
    const j = this.job;
    this.completedJobs.push(j.id);
    this.earned += j.payout;
    this.onEvent('banner', { text: 'JOB COMPLETE — $' + j.payout });
    this.onEvent('dialogue', { name: 'NADIA', text: '"' + j.title + ' done. $' + j.payout + ' is yours, Ari. Next job is ready when you are."' });
    this.jobIndex += 1;
    this.state = 'idle';
    this.onEvent('jobDone', { job: j.id, payout: j.payout, earned: this.earned });
  }
  failStage(reason) {
    this.onEvent('dialogue', { name: 'BIMO', text: '"' + reason + ' Start the stage over — the car is fixed, you are fine."' });
    this.stageIndex = Math.max(0, this.stageIndex - 0);
    this.announceStage();
  }
}

MissionManager.prototype.objective = function () {
  const s = this.stage;
  if (!s || this.state !== 'active') return null;
  if (s.type === 'reach' || s.type === 'deliver') return { x: s.x, z: s.z, r: s.r };
  if (s.type === 'steal') return { x: -180, z: -150, r: 12 };
  if (s.type === 'eliminate') return { x: 150, z: 120, r: 14 };
  if (s.type === 'takeBuggy') return { x: 0, z: 210, r: 10 };
  if (s.type === 'evade') return null;
  return null;
};

// state: {px, pz, inCar, carType, stolen, wanted, eliminated, dt}
MissionManager.prototype.update = function (state) {
  if (this.state !== 'active' || !this.stage) return;
  const s = this.stage;
  if (s.timer) {
    this.timer -= state.dt;
    if (this.timer <= 0) {
      this.onEvent('dialogue', { name: 'NADIA', text: '"Too slow, Ari. The ferry left. Try the run again."' });
      this.stageIndex = 0;
      this.announceStage();
      return;
    }
    this.onEvent('tick', { timer: Math.ceil(this.timer) });
  }
  const near = (x, z, r) => Math.hypot(state.px - x, state.pz - z) < r;
  let advanced = false;
  if (s.type === 'reach' && near(s.x, s.z, s.r)) advanced = true;
  if (s.type === 'deliver' && state.inCar && near(s.x, s.z, s.r)) advanced = true;
  if (s.type === 'steal' && state.stolen) advanced = true;
  if (s.type === 'takeBuggy' && state.inCar && state.carType === 'buggy') advanced = true;
  if (s.type === 'evade' && state.wanted === 0 && state.evadeArmed) advanced = true;
  if (s.type === 'eliminate' && state.eliminated >= s.count) advanced = true;
  if (!advanced) return;
  this.stageIndex += 1;
  if (this.stageIndex >= this.job.stages.length) {
    this.completeJob();
  } else {
    this.onEvent('dialogue', { name: 'ARI "KANCIL" SAPUTRA', text: '"One down. Next step."' });
    this.announceStage();
  }
};

MissionManager.prototype.serialize = function () {
  return {
    jobIndex: this.jobIndex,
    completedJobs: this.completedJobs,
    earned: this.earned,
    state: this.state,
  };
};
MissionManager.prototype.restore = function (data) {
  if (!data) return;
  this.jobIndex = Math.min(data.jobIndex || 0, JOBS.length);
  this.completedJobs = data.completedJobs || [];
  this.earned = data.earned || 0;
  this.state = 'idle';
};
