# Equator Drive — Make GTA 6

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A 3D open-world driving and action game set in Equator City. You are Ari
"Kancil" Saputra — valet by day, wheelman by night. Steal cars, drift through
traffic, outrun the police, and work your way through seven story jobs across
nine districts, from Pasar Kanal to the neon streets of Distrik Neon.

## The city

Equator City is a bright, dense grid city with a plaza fountain, a green hill
park, a harbour, a campus, and a neon district that comes alive after dark.
Shop signs, streetlights, traffic, and pedestrians fill the streets, and every
building window glows warm at night.

## Vehicles

- **Broombroom S1** — the hero car: an open-frame electric buggy prototype,
  fast, nimble, and built for drifting. It is yours from the start.
- **Bajaj** — small and nimble. **Angkot minibus** and **open pickup** — heavy
  and slow to turn. **Sedan** and **taxi** — balanced all-rounders.
- **Police sedan** and **interceptor** — they will chase you when your wanted
  level rises.

Every civilian car can be stolen. Each vehicle has its own handling, and
damage shows on the car and on the condition meter in the HUD.

## What you can do

- Drive and walk around the city in third person.
- Steal any parked or moving civilian car.
- Handbrake-drift to build a drift score, with smoke pouring off the rear
  wheels.
- Take on story jobs: valet shifts, deliveries, taxi rushes, midnight runs,
  and a grand tour of the city. Each job pays out and updates its status.
- Fight on foot and attract police attention — the wanted stars climb, and
  patrol cars hunt you down.
- Keep your cars in the garage at Plaza Merdeka and respray them there.
- Check the full city map with all nine districts and the job list.
- Progress is saved automatically in the browser.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Drive / walk |
| Space | Handbrake drift |
| E | Enter / exit car |
| F | Shoot (on foot) |
| G | Respray at the garage |
| M | City map |

## How to run

The game is a static site with no build step. Because it uses ES modules, it
must be served over HTTP — opening the file directly will not work.

```sh
cd game
python3 -m http.server 8123
```

Then open <http://localhost:8123> in a browser.

Built with Three.js (vendored, no network needed), fully offline, with a
seeded world so every run generates the same city.
