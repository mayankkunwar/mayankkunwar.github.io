# CV Quest — a playable CV

A space-flight game (Phaser 3) where visitors pilot a ship through your career: each school/job/project is a
planet to land on, each skill is a crystal orbiting it, and the beacon star at the end is your contact page.
All graphics are drawn procedurally in code (no image assets) and rendered at device resolution.
A "📄 CV" button opens a classic, printable version for recruiters in a hurry.

## Edit your content
Everything comes from **`data.js`** — no need to touch the game code.

## Run locally
Run `python3 -m http.server` here and visit http://localhost:8000 (no build step).
Opening `index.html` directly also works, but browsers block loading the logo files from disk, so planets show text labels instead.

## Deploy
Static files only — drop the folder on GitHub Pages, Netlify or Vercel.

## Controls
WASD / arrows or hold the mouse to fly · Shift / Space boost · E / Enter land · on phones: hold to fly, ⚡ boost, E land
Click a timeline marker in the top bar to warp.

## Logos
Company and university logos in `logos/` are from Wikimedia Commons / Wikipedia and are trademarks of their owners.
They're shown unmodified to identify where I worked and studied.

## Classic page
The original plain CV page is still live at `/classic.html`.
