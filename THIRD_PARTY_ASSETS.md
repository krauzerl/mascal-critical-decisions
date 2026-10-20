# Third-party dependencies and assets

## Foundational course code

- **JetBrains Academy — Build a Game with an AI Coding Agent**  
  Source: https://github.com/jetbrains-academy/game-course  
  License: MIT; Copyright (c) 2025 JetBrains Academy.  
  The MASCAL project was developed by extending the course game.

## JavaScript packages (installed from npm)

- **Three.js** — 3D rendering library. Source: https://github.com/mrdoob/three.js — MIT License.
- **Vite** — development server and build system. Source: https://github.com/vitejs/vite — MIT License.

Their packages are installed with `npm ci`; installed dependency folders are not committed.

## Web fonts loaded through Google Fonts

- **Barlow Condensed** — https://fonts.google.com/specimen/Barlow+Condensed
- **IBM Plex Sans** — https://fonts.google.com/specimen/IBM+Plex+Sans
- **IBM Plex Mono** — https://fonts.google.com/specimen/IBM+Plex+Mono

These are referenced remotely in `index.html` and are not bundled as font files in this repository. Consult each family's license information on Google Fonts before redistributing the fonts independently.

## In-game 3D and graphics

In this submission package, the active in-game geometry, materials, and game markers are generated in JavaScript source code under `src/components/`, without requiring downloaded third-party 3D models.

Unused legacy assets (`public/models/enemy.glb`, `small_house.glb`, `tode.glb`, and `public/tode.svg`) were intentionally excluded from the competition-ready export because the current game sources do not reference them and their original provenance has not been independently verified.

No commercially released audio tracks or recordings are included in this export.

**Final review recommended:** Check any custom logo, emblems (including medical crosses), new media or other files added to your *local* project after this export. Identify their creator, source and license before publishing, or replace them with verified original assets. Do not claim third-party assets as your own.
