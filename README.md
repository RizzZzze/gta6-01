# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

EQUATOR DRIVE — an original open-world crime game set in Equator City. You are Ari "Kancil" Saputra, a valet with the prototype EV **Broombroom S1** for one day: run three missions from the Garage to the Plaza to the waterfront, steal cars (bajaj, angkot, pickup, sedan, taxi), drift for style, and outrun the Equator Police. Bright daytime is the city's signature light; one mission runs at night under neon.

Complete: a city on foot and by car, traffic and pedestrians, stealable cars, a wanted system with police pursuit, 3 story missions, on-foot combat, a garage with respray, a HUD with minimap, a full city map, a start screen and a save. Runs offline from static files with zero network requests.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome. Keyboard: WASD drive/walk, E enter or steal a car, SPACE handbrake drift, R respray at the Garage, click to shoot, SHIFT sprint, M mute.

Shots: `?shot=cover` day chase, `?shot=start` start screen, `?shot=night` night combat on foot, `?shot=map` full city map. `?seed=7` makes the world deterministic.

## Enter it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e054nszg&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
