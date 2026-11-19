// capture-shots.mjs — Serves game/ on localhost, opens each ?shot= state
// in headless Chromium, waits for the deterministic freeze flag, and
// writes the 4 screenshots as JPEGs. Tracing is on for QA. Run:
//   node capture-shots.mjs [--only cover|start|night|map] [--again]
// --again re-captures the cover into /tmp to prove pixel determinism.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/hatch/workspace/make-fun-bounty/repos/gta6-01/gta6-capture-r5/node_modules/playwright/package.json');
const { chromium } = require('playwright');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.join(ROOT, 'game');
const OUT_DIR = path.join(ROOT, 'screenshots');
const SHOTS = [
  { name: '01-cover', shot: 'cover' },
  { name: '02-start', shot: 'start' },
  { name: '03-night', shot: 'night' },
  { name: '04-map', shot: 'map' },
];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(GAME_DIR, url === '/' ? 'index.html' : url);
    if (!file.startsWith(GAME_DIR)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});

async function capture(browser, shotName, shot, outPath, trace) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  if (trace) await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  await page.goto('http://127.0.0.1:8931/index.html?shot=' + shot, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotDone === true, null, { timeout: 30000 });
  const winErrors = await page.evaluate(() => window.__errors || []);
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 82 });
  if (trace) await context.tracing.stop({ path: path.join(ROOT, 'gta6-capture-r5', 'trace-' + shot + '.zip') });
  await context.close();
  return errors.concat(winErrors.map((e) => 'window: ' + e));
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const again = process.argv.includes('--again');
await new Promise((r) => server.listen(8931, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
let failed = false;
try {
  const { mkdirSync, statSync, readFileSync } = await import('node:fs');
  mkdirSync(OUT_DIR, { recursive: true });
  for (const s of SHOTS) {
    if (only && s.shot !== only) continue;
    const outPath = path.join(OUT_DIR, s.name + '.jpg');
    const errs = await capture(browser, s.name, s.shot, outPath, !only);
    const size = statSync(outPath).size;
    const hash = createHash('sha256').update(readFileSync(outPath)).digest('hex').slice(0, 12);
    console.log(s.name + ': ' + size + ' bytes sha256:' + hash + (size > 262144 ? ' OVER-256KiB!' : '') + (errs.length ? ' ERRORS: ' + errs.join(' | ') : ' no errors'));
    if (errs.length || size > 262144) failed = true;
  }
  if (again) {
    const outPath = '/tmp/cover-again.jpg';
    await capture(browser, 'cover-again', 'cover', outPath, false);
    const a = createHash('sha256').update(readFileSync(path.join(OUT_DIR, '01-cover.jpg'))).digest('hex');
    const b = createHash('sha256').update(readFileSync(outPath)).digest('hex');
    console.log('determinism cover: ' + (a === b ? 'IDENTICAL ' + a.slice(0, 12) : 'DIFFERS ' + a.slice(0, 12) + ' vs ' + b.slice(0, 12)));
    if (a !== b) failed = true;
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
