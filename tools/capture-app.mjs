// Capture the real Dropsworth product from the landing page (running locally) as image sequences:
//  - hero scorecard card (still)
//  - the "Validation process" laptop demo, scrolled through each of its 4 steps (frames)
// Output: public/app/<name>/####.png  (+ public/app/manifest.json)
// usage: node tools/capture-app.mjs [url]   (default http://localhost:3000/)
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {ROOT} from './env.mjs';

const URL = process.argv[2] || 'http://localhost:3000/';
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(ROOT, 'public/app');
const FRAMES_PER_STEP = 36;
// step ranges from validation-scroll.tsx
const RANGES = [[0, 0.2], [0.2, 0.46], [0.46, 0.73], [0.73, 1]];
const NAMES = ['step1-drop', 'step2-demand', 'step3-competition', 'step4-supplier'];

const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: 1440, height: 900, deviceScaleFactor: 2});
await page.goto(URL, {waitUntil: 'networkidle0', timeout: 60000});
await new Promise((r) => setTimeout(r, 1500));
const manifest = {};

// 1) hero scorecard: the first card-like element that mentions "out of 100" / "Worth it"
const hero = await page.evaluateHandle(() => {
  const hasAll = (t) => ['Bladeless', 'Demand', 'Competition', 'Supplier'].every((w) => t.includes(w));
  const inValidation = (d) => d.closest('section[aria-label="Validation process"]');
  const els = [...document.querySelectorAll('div')].filter((d) => hasAll(d.textContent || '') && !inValidation(d));
  const area = (e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height;
  els.sort((a, b) => area(a) - area(b));
  return els.find((e) => e.getBoundingClientRect().width > 300 && e.getBoundingClientRect().height > 300) || null;
});
if (hero.asElement()) {
  fs.mkdirSync(path.join(OUT, 'hero'), {recursive: true});
  await hero.asElement().screenshot({path: path.join(OUT, 'hero', 'card.png')});
  manifest.hero = 'app/hero/card.png';
  console.log('hero card captured');
}

// 2) validation process laptop, frame by frame
const sec = await page.$('section[aria-label="Validation process"]');
if (!sec) throw new Error('Validation process section not found');
const {top, height} = await page.evaluate((s) => {
  const r = s.getBoundingClientRect();
  return {top: r.top + window.scrollY, height: r.height};
}, sec);
const scrollable = height - 900;
// the laptop: the right-hand column inside the sticky container (largest element with a "Dropsworth" top bar)
const laptopBox = async () =>
  page.evaluate((s) => {
    const grid = s.querySelector('.grid');
    const right = grid?.children?.[1];
    const r = right.getBoundingClientRect();
    // puppeteer clips are in page (document) coordinates
    return {x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height};
  }, sec);

for (const [i, [a, b]] of RANGES.entries()) {
  const dir = path.join(OUT, NAMES[i]);
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  for (let f = 0; f < FRAMES_PER_STEP; f++) {
    const p = a + (b - a) * (0.04 + 0.9 * (f / (FRAMES_PER_STEP - 1)));
    await page.evaluate((y) => window.scrollTo(0, y), top + p * scrollable);
    await new Promise((r) => setTimeout(r, f === 0 ? 700 : 90));
    const clip = await laptopBox();
    await page.screenshot({path: path.join(dir, String(f).padStart(4, '0') + '.png'), clip});
  }
  manifest[NAMES[i]] = {dir: `app/${NAMES[i]}`, frames: FRAMES_PER_STEP};
  console.log(`${NAMES[i]}: ${FRAMES_PER_STEP} frames`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
await browser.close();
