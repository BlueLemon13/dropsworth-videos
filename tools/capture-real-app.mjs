// Screenshot the REAL Dropsworth app pages (running in demo mode, no real account data)
// for explainers: public/app/real/<page>.png, plus a slow-scroll frame sequence for each page.
// usage: node tools/capture-real-app.mjs [baseUrl]   (default http://localhost:3007)
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {ROOT} from './env.mjs';

const BASE = process.argv[2] || 'http://localhost:3007';
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(ROOT, 'public/app/real');
const PAGES = ['overview', 'find', 'verdict', 'demand', 'competition', 'supplier', 'winners', 'saved'];
const FRAMES = 30;

fs.mkdirSync(OUT, {recursive: true});
const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars']});
const page = await browser.newPage();
// laptop-ish width so it reads like the real desktop app; shown inside a laptop frame in the video
await page.setViewport({width: 1180, height: 1500, deviceScaleFactor: 1.25});
const manifest = {};
for (const name of PAGES) {
  await page.goto(`${BASE}/${name}`, {waitUntil: 'networkidle0', timeout: 240000});
  await new Promise((r) => setTimeout(r, 2500));
  // hide every "Demo mode" label, start at the top, clip to the main panel (no sidebar) so it reads on a phone
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length === 0 && /^s*Demo mode/.test(el.textContent || '')) {
        const box = el.closest('[role="status"], [class*="banner"], div') || el;
        let b = box;
        for (let i = 0; i < 3 && b.parentElement && b.parentElement.textContent.trim().length < 80; i++) b = b.parentElement;
        b.style.visibility = 'hidden';
        b.style.height = '0px'; b.style.overflow = 'hidden'; b.style.padding = '0'; b.style.margin = '0'; b.style.border = '0';
      }
    }
    window.scrollTo(0, 0);
    const m = document.querySelector('main'); if (m) m.scrollTop = 0;
  });
  await new Promise((r) => setTimeout(r, 400));
  const clip = await page.evaluate(() => {
    const m = document.querySelector('main') || document.body;
    const r = m.getBoundingClientRect();
    return {x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, window.innerWidth - Math.max(0, r.x)), height: Math.min(window.innerHeight - Math.max(0, r.y), 1500)};
  });
  await page.screenshot({path: path.join(OUT, `${name}.jpg`), clip, type: 'jpeg', quality: 82});
  // slow scroll frames through the page (for a "scrolling the app" shot)
  const dir = path.join(OUT, name);
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  const max = await page.evaluate(() => {
    const el = document.querySelector('main') || document.scrollingElement;
    return Math.max(0, (el.scrollHeight || document.body.scrollHeight) - window.innerHeight);
  });
  const travel = Math.min(max, 900);
  for (let f = 0; f < FRAMES; f++) {
    const y = Math.round(travel * (f / (FRAMES - 1)) ** 1.2);
    await page.evaluate((yy) => {
      window.scrollTo(0, yy);
      const el = document.querySelector('main');
      if (el && el.scrollHeight > el.clientHeight) el.scrollTop = yy;
    }, y);
    await new Promise((r) => setTimeout(r, 60));
    await page.screenshot({path: path.join(dir, String(f).padStart(4, '0') + '.jpg'), clip, type: 'jpeg', quality: 82});
  }
  manifest[name] = {still: `app/real/${name}.jpg`, dir: `app/real/${name}`, frames: FRAMES, scroll: travel};
  console.log(`${name}: captured (scroll ${travel}px)`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
await browser.close();
