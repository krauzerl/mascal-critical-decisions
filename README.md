# MASCAL: Critical Decisions

**A tactical 3D mass-casualty rescue game built with Three.js and AI coding agents.**

Created as an extensive modification of the [JetBrains Academy *Build a Game with an AI Coding Agent* course](https://github.com/jetbrains-academy/game-course). This project turns the original course gameplay into a railway disaster response simulation.

## Play

You are a first responder arriving at a train derailment. Assess casualties, assign triage categories, coordinate two rescue teams, and evacuate patients before time runs out. Respond to evolving conditions, radio failures, and unexpected incidents. Optional support supplies appear rarely on the map, including Smart Triage Tag (STT) monitoring bands, helicopter assistance, fire crew support, and medical kits.

**This is a fictional game. Simulated physiological parameters and triage decisions must not be used as medical guidance.**

## Features added beyond the course

- Five progressively harder rounds, from 6 to 14 casualties
- Randomized casualty conditions and evolving vital signs (heart rate and SpO2)
- Four-category triage with operational consequences and prioritization
- Two animated rescue teams, pathfinding, treatment, stretchers and evacuation
- Time-sensitive emergency decisions and radio communication incidents
- Rare collectible tactical support items, including STT monitoring bands
- Tactical *Field Command* HUD, radio log, post-mission performance report
- English-language start screen, interactive instructions and keyboard shortcuts
- Stylized 3D train derailment scene with nighttime emergency lighting

## Requirements

- Node.js compatible with Vite 7 (Node.js 20.19+ or 22.12+)
- npm
- A modern desktop browser with WebGL support

## Install and run

```bash
npm ci
npm run dev
```

Open **http://localhost:5188/**.

The game opens at the mission briefing in round 1. Press **START MISSION** to begin. For debugging only, `?round=3` can be used to start a particular round.

## Production build

```bash
npm run build
npm run preview
```

Vite writes the static production site to `dist/`. The output can be hosted on any static website host. This repository does not include `node_modules` or generated `dist` files.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move the responder |
| E | Examine a casualty / pick up a supply crate |
| 1–4 | Select triage priority or an event option |
| T | Attach an STT monitoring band (if available) |
| G | Use a collected medical kit |
| F | Call helicopter support after collecting it |
| H | Open / close the instructions (pauses gameplay) |
| Esc | Close the casualty assessment or guide |

## Run logic tests

The `tests/` folder contains executable Node.js test scripts; for example:

```bash
node tests/triage-core.test.mjs
node tests/gameplay-20.test.mjs
node tests/english-localization.test.mjs
node tests/start-screen-wiring.test.mjs
```

You can also run each `.test.mjs` file in `tests/` with Node.js. These test suites exercise gameplay logic and integration checks, not a full browser WebGL rendering test.

## Origins, licensing, and AI transparency

- **Course foundation:** [JetBrains Academy game-course](https://github.com/jetbrains-academy/game-course), MIT License, Copyright (c) 2025 JetBrains Academy. See [ATTRIBUTION.md](ATTRIBUTION.md) and [LICENSE](LICENSE).
- **Original modifications:** MASCAL visual design, triage simulation, round progression, HUD, rescue dispatch, and support mechanics.
- **AI assistance:** Details in [AI_USAGE.md](AI_USAGE.md).
- **Libraries, fonts and assets:** See [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md).

**Competition entry:** JetBrains Academy Build Your Game Challenge, October 2026. The gameplay extension is intended for evaluation as a browser-based interactive game.
