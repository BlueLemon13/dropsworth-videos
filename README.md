# Dropsworth video template

Faceless explainer videos: glowing figure, spotlight, BIG + small words, PRODUCT SCORE bar.

## Preview (Windows)
1. Install Node.js (LTS) from nodejs.org
2. Open this folder in a terminal and run: npm install
3. Live preview / tweak: npx remotion studio src/index.ts
4. Render: npx remotion render src/index.ts Explainer output/test.mp4 --props=scripts/sample.json

## Script format (scripts/*.json)
Each scene: say (voiceover line), big (bold caps word), small (italic words), visual, score (0-100), items (optional).
Visuals: figure-idle, figure-confused, figure-vs, figure-celebrate, phone, chart-down, chart-up, checklist, padlock, package, signposts, img:FILE (put FILE in public/images).

## Voice (next step)
Optional scene fields start/end/bigAt/smallAt (seconds) sync everything to the voiceover.
"audio" = mp3 path inside public/. Without them the video renders silent with estimated timing.
