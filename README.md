# Equator Drive — Make GTA 6 (gta6-01)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Open-world crime game set in **Equator City**, a bright tropical grid city.
You are Ari "Kancil" Saputra, valet by day, wheelman by night, driving the
electric prototype buggy **Broombroom S1**.

## Play

- **WASD / arrows** — drive or walk. **Space** — handbrake drift (smoke + DRIFT score).
- **E** — enter / exit a car (every civilian car can be stolen). **F** — shoot on foot.
- **G** — respray at the garage (Plaza Merdeka, saves to your garage). **M** — full city map.
- Wanted stars rise when you speed past police or shoot; police sedans and the
  Interceptor chase you at 2+ stars. Vehicle condition falls on hard hits.
- 7 story jobs across 9 districts, from a valet shift to a midnight run to the harbour.
- Progress saves to localStorage (money, garage, active job) and shows on the start screen.

## Vehicles

Bajaj (nimble), angkot minibus (heavy), open-bed pickup (heavy), sedan and taxi
(balanced), police sedan + Interceptor (pursuit), and the hero Broombroom S1
(fast / fun — open-frame electric buggy, big off-road wheels, magenta accents).

## Tech

- Three.js (vendored under `game/vendor/`), ES modules + import map, no build step.
- Static files in `game/` — `game/index.html` loads offline with zero network requests.
- Seeded RNG (`WORLD_SEED`) — same seed, same city, traffic and shots.
- Deterministic shots: `game/index.html?shot=cover|start|night|map` renders a fixed
  frame (cover = daytime drift chase, start = start screen over Plaza Merdeka,
  night = neon on-foot combat, map = full city map with 7 jobs + 9 districts).

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome.

## Enter it

```sh
node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory
(`$MAKEFUN_OUTPUT_DIR`, default `/output`) and writes `dossier.json` with the
make.fun kit (`vendor/makefun-game.ts`, verbatim copy).

---

<sub>Entered on [make.fun](https://make.fun/?ref=e054nszg&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
