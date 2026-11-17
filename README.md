# Solara Bay — a sun-soaked street story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dentybaiq/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dentybaiq/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solara Bay** is a complete open-world crime game that runs entirely in your
browser from static files — no build step, no network requests, no assets to
download. You are **Kai Rook**, a new driver in the sun-soaked coastal city of
Solara Bay. You owe fixer **Lena Voss** a debt, and the only way out is six
jobs across the city: fares, hot packages, getaways, debt collection, a timed
sunset run, and one last big score.

## The city

A 3.6 km² grid city with five districts — Dockside, Old Town, Marina Row,
Coral Heights and Palm Court — plus a central park and a palm-lined beach on
the ocean. Traffic flows along every road, pedestrians stroll the sidewalks
(and run when things get loud), and parked cars all over town are yours for
the taking.

## How it plays

- **On foot** — WASD / arrows to walk. `E` steals the nearest car, `SPACE`
  punches, mouse aims the pistol and click shoots.
- **Driving** — WASD to drive, `SPACE` handbrake, `H` horn, `E` to get out.
  Cars handle with speed, grip and slide; traffic cars brake for you and
  each other.
- **Wanted level** — five stars. Stealing cars, hitting pedestrians and
  firing shots raise the heat; Solara Bay PD pursuit cars chase, ram and try
  to bust you. Lose them and the stars fade; get caught standing still and
  you're busted (fine + the job fails).
- **Missions** — six story jobs with markers, a pulsing beacon, an
  off-screen direction arrow and a distance readout. Complete jobs to earn
  cash, unlock the next one, and pay off the debt. The final job is yours
  when all six are done.
- **Progression** — cash, ammo and health pickups on the street, a save in
  localStorage (money, job progress, best run) that survives a reload, and
  a win screen when the debt is paid.
- **HUD** — health, money, ammo, wanted stars, mission objective with a
  timer, speedometer, and a live minimap showing roads, the marker, cops,
  traffic and you.
- **Sound** — fully synthesized WebAudio: engine hum that follows your
  speed, two-tone police sirens, horns, gunshots, punches and mission
  jingles. `M` mutes (on the pause screen).

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static file server and open `game/index.html`.
It plays with zero network requests — every script is a file under `game/`.

## Staged screenshots

`?shot=start|drive|chase|mission` renders a deterministic scene of the live
game for screenshots (see `game/src/shots.js`).

## Structure

| File | Job |
| --- | --- |
| `game/src/config.js` | World size, tuning, palette, districts, car models |
| `game/src/rng.js` | Seeded random numbers (deterministic city + shots) |
| `game/src/input.js` | Keyboard + mouse state |
| `game/src/audio.js` | WebAudio synthesis: engine, sirens, SFX |
| `game/src/city.js` | City generation, roads, buildings, collisions |
| `game/src/traffic.js` | Traffic cars and pedestrians |
| `game/src/police.js` | Wanted stars and police pursuit |
| `game/src/missions.js` | Story and the six jobs |
| `game/src/combat.js` | Fists, pistol, bullets, thugs, pickups |
| `game/src/render.js` | Canvas drawing, HUD, minimap, menus |
| `game/src/shots.js` | Staged screenshot scenes |
| `game/src/save.js` | localStorage save / load |
| `game/src/main.js` | Game loop, player, driving, mission flow |

## License

MIT — see `LICENSE`. An original game: its city, characters, vehicles,
names, story, art and sounds are all its own.

<sub>Entered on [make.fun](https://make.fun/?ref=hvjtrkxx&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
