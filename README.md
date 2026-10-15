# Mayank Singh Kunwar — CV

Two ways to explore the same CV, both built from **`data.js`** (the single source of truth):

| Path | What it is |
| --- | --- |
| `/` | Cinematic, Apple-style scroll story: real-time 3D planets (Three.js + bloom) with a camera that flies between them as you scroll, pinned chapters per career stage, highlights carousel, skills, contact. |
| `/play/` | **CV Quest** — a space-flight game (Phaser 3): land on planets, collect skill crystals. `play/#cv` opens the printable CV. |
| `/classic.html` | The original plain CV page. |

## Edit content
Everything lives in `data.js`: stages (with `headline`, `color`, `logo`), `statement`, `stats`, `highlights`, `skillGroups`, contact.

## Run locally
`python3 -m http.server` in this folder, then open http://localhost:8000 (no build step).
Opening the HTML files straight from disk mostly works, but browsers block loading the logos that way.

## Tech
- Story page: Three.js 0.160 (custom GLSL planets, atmosphere, rings, sun; UnrealBloom), GSAP 3.12 + ScrollTrigger, Lenis smooth scroll. Respects `prefers-reduced-motion`; falls back to a gradient if WebGL is unavailable.
- Game: Phaser 3.80, procedural canvas textures, DPR-aware rendering.

## Controls (game)
WASD / arrows or hold the mouse to fly · Shift / Space boost · E / Enter land · on phones: hold to fly, ⚡ boost, E land.
Click a timeline marker in the top bar to warp.

## Logos
Company and university logos in `logos/` are from Wikimedia Commons / Wikipedia and are trademarks of their owners.
They're shown unmodified to identify where I worked and studied.
