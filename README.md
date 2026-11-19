# Equator Drive — Make GTA 6

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RizzZzze/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A bright open-world crime game in Equator City. You play Ari "Kancil"
Saputra, a valet in the daytime and a getaway driver after dark, at the
wheel of the Broombroom S1 — a home-built electric buggy prototype.

Take any car you see, drift the avenues, shake off the police, and run
seven story jobs across nine districts, from the canal market to the
neon quarter.

## Playing

- Drive or walk in third person through a dense tropical grid city:
  a plaza with a fountain, a hill park, a harbour, a campus, and a
  neon district that lights up at night.
- Grab any civilian car on the street. Every car handles differently,
  and hard knocks show up as visible damage and on the condition gauge.
- Drift with the handbrake to rack up a drift score, smoke trailing
  from the back wheels.
- Work the job list: valet shifts, deliveries, taxi rushes, midnight
  runs, and a full tour of the city. Finishing a job pays and moves
  the story on.
- Stir up trouble on foot and the wanted stars rise — patrol sedans
  and the interceptor will come after you.
- Park your cars in the garage at Plaza Merdeka and respray them there.
- Open the city map to see all nine districts and the jobs on offer.
- Your money, garage, and job progress save in the browser.

## Cars

- **Broombroom S1** — your hero buggy: open-frame, electric, quick
  off the line and made to slide. Yours from the start.
- **Bajaj** — tiny and nimble.
- **Angkot** and **pickup** — heavy, slow to turn, hard to push around.
- **Sedan** and **taxi** — steady all-rounders.
- **Police sedan** and **interceptor** — the pursuit cars.

## Controls

- **W A S D** — drive / walk
- **Space** — handbrake drift
- **E** — get in / out of a car
- **F** — shoot on foot
- **G** — respray at the garage
- **M** — city map

## Running it

No build step, just static files. It uses ES modules, so serve it over
HTTP instead of opening the file directly:

```sh
cd game
python3 -m http.server 8123
```

Then open <http://localhost:8123>.

Three.js is vendored in the repo, so the game runs fully offline, and
the city is seeded — the same streets, traffic, and signs every run.
