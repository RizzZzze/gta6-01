// EQUATOR DRIVE — main.ts (Node 22, standard library only).
// Hands the entry in: copies game/ and screenshots/ from beside this file
// to /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library. Running it
// twice writes the same bytes: the copy is a plain recursive copy and the
// dossier is a pure function of the files in the output directory.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      const sub = countFiles(p);
      files += sub.files; bytes += sub.bytes;
    } else if (name.isFile()) {
      files += 1; bytes += statSync(p).size;
    }
  }
  return { files, bytes };
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files, in all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const game = countFiles(join(out, 'game'));
const shots = readdirSync(join(out, 'screenshots'));
console.log(`equator-drive: game/ ${game.files} files, ${game.bytes} bytes; ` +
  `screenshots/ ${shots.length} files (${shots.join(', ')}); ` +
  `dossier.json ${dossier.length} bytes -> ${out}`);
