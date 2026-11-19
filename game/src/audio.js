// audio.js — Procedural sound only: engine hum, drift screech, gunshot,
// pickup chime and a two-tone police siren, all synthesized with WebAudio.
// No audio files, no network. Radio is a HUD widget, not audio.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420;
    this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.start();
  }
  setEngine(speedNorm, on) {
    if (!this.ctx || this.muted) return;
    this.engineGain.gain.value = on ? 0.03 + speedNorm * 0.05 : 0;
    this.engineOsc.frequency.value = 55 + speedNorm * 130;
  }
  setSiren(on, t) {
    if (!this.ctx || this.muted) return;
    this.sirenGain.gain.value = on ? 0.025 : 0;
    if (on) this.sirenOsc.frequency.value = 660 + Math.sin(t * 5) * 220;
  }
  blip(freq, dur, type = 'sine', vol = 0.12) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  gunshot() { this.blip(180, 0.12, 'square', 0.2); this.blip(90, 0.18, 'sawtooth', 0.15); }
  pickup() { this.blip(880, 0.12); setTimeout(() => this.blip(1320, 0.16), 90); }
  steal() { this.blip(520, 0.1, 'triangle', 0.15); setTimeout(() => this.blip(780, 0.14, 'triangle', 0.15), 110); }
  driftScreech(on) {
    if (!this.ctx || this.muted) return;
    if (!this.screech) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = 900;
      const g = this.ctx.createGain(); g.gain.value = 0;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 4;
      o.connect(f); f.connect(g); g.connect(this.ctx.destination);
      o.start();
      this.screech = { osc: o, gain: g };
    }
    this.screech.gain.gain.value = on ? 0.03 : 0;
  }
}
