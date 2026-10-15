# Mayank Singh Kunwar — CV

Built from **`data.js`** (the single source of truth):

| Path | What it is |
| --- | --- |
| `/` | Cinematic, Apple-style scroll story: real-time 3D planets (Three.js + bloom) with a camera that flies between them as you scroll, pinned chapters per career stage, highlights carousel, skills, contact. |
| `/#fly` | **Fly it yourself**: a 3D flight game in the same scene. Fly a ship between the planets, collect skill crystals, land to read each chapter, or use Autopilot for a guided tour. |
| `/cv.html` | Clean printable CV (Download PDF → browser print, A4). |
| `/classic.html` | The original plain CV page. |

## Edit content
Everything lives in `data.js`: stages (with `headline`, `color`, `logo`), `statement`, `stats`, `highlights`, `skillGroups`, contact.

## Run locally
`python3 -m http.server` in this folder, then open http://localhost:8000 (no build step).
Opening the HTML files straight from disk mostly works, but browsers block loading the logos that way.

## Tech
- Fly mode (`game3d.js`): physically-shaded ship with studio environment reflections, chase camera with speed-based FOV, warp streaks, orbiting crystals, autopilot, DOM labels tracking 3D positions.
- Story page: Three.js 0.160 (custom GLSL planets, atmosphere, rings, sun; UnrealBloom), GSAP 3.12 + ScrollTrigger, Lenis smooth scroll. Respects `prefers-reduced-motion`; falls back to a gradient if WebGL is unavailable.

## Fly controls
Hold the mouse to fly toward the cursor · arrows steer · W thrust · Shift boost · E land · P autopilot · Esc exit.
Phones: drag to steer, Boost button, tap the prompt to land.

(An earlier 2D/Phaser game version lives in git history.)

## Logos
Company and university logos in `logos/` are from Wikimedia Commons / Wikipedia and are trademarks of their owners.
They're shown unmodified to identify where I worked and studied.
