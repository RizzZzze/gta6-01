// main.ts — Equator Drive entry builder (fresh, session revision-2).
// Copies game/ + screenshots/ to /output and writes dossier.json with the kit's
// buildDossier (vendor/makefun-game.ts, copied verbatim, never edited).
// Run: node main.ts   (Node 22, no flags, no install)
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const OUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('game', `${OUT}/game`, { recursive: true });
cpSync('screenshots', `${OUT}/screenshots`, { recursive: true });
writeFileSync(`${OUT}/dossier.json`, buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
}));
console.log(`Equator Drive: ${OUT} written (game/ + screenshots/ + dossier.json)`);
