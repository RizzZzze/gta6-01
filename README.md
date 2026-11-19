# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

EQUATOR DRIVE — an original open-world crime game set in Equator City, a fictional equatorial city. Ari "Kancil" Saputra, a valet framed for stealing the Broombroom S1 electric buggy prototype, must clear his name across five districts — one story job at a time. Bright daytime is the city's signature light; one mission runs at night under neon.

The game is complete: a city on foot and by car, traffic and pedestrians, stealable cars (bajaj, angkot, pickup, sedan, taxi), a wanted system with named police units, 7 story jobs, on-foot combat, a garage with respray, a dense HUD with a circular minimap, a full city map, a start screen and a save. It runs offline from static files with zero network requests.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome. Keyboard: WASD move/drive, E enter & exit cars, SPACE handbrake drift, F shoot, M city map, C camera, T repair, R respray (in the garage yard).

## Enter it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e054nszg&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
