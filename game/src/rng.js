// rng.js — Seeded random numbers. Every random choice in the game flows
// through one of these, so a fixed seed replays the same city, traffic and
// shot setups bit for bit. No Math.random() anywhere in game code.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) { return min + (max - min) * next(); },
    int(min, max) { return Math.floor(min + (max - min + 1) * next()); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    chance(p) { return next() < p; },
    // Deterministic Fisher-Yates shuffle, returns a new array.
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
  };
}

// Fixed seeds used by the four screenshot setups, so each shot is stable.
export const SHOT_SEEDS = { cover: 1101, start: 2202, night: 3303, map: 4404 };
export const WORLD_SEED = 20261119;
