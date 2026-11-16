// Record a "live" walkthrough of the real Dropsworth app (demo mode) frame by frame, with a realistic mouse:
// eased curved moves, small hand jitter, hover pauses, click presses, smooth scrolls.
// Output: public/app/walk/####.jpg + manifest.json {fps, cursor:[[x,y]...], segments:{demand,competition,supplier,score}}
// usage: node tools/capture-walk.mjs [baseUrl]   (default http://localhost:3007)
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {ROOT} from './env.mjs';

const BASE = process.argv[2] || 'http://localhost:3007';
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(ROOT, 'public/app/walk');
const W = 1280, H = 800, FPS = 30;
fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(OUT, {recursive: true});

const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: W, height: H, deviceScaleFactor: 1.25});

let frame = 0, cx = 640, cy = 420, pressed = 0;
const cursor = [];
const segments = {};
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;

async function prep() {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length === 0 && /^\s*Demo mode/.test(el.textContent || '')) {
        let b = el;
        for (let i = 0; i < 3 && b.parentElement && b.parentElement.textContent.trim().length < 80; i++) b = b.parentElement;
        b.style.display = 'none';
      }
    }
    document.documentElement.style.scrollBehavior = 'auto';
    if (!document.getElementById('__cur')) {
      const c = document.createElement('div');
      c.id = '__cur';
      c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:38px;z-index:2147483647;pointer-events:none;transform-origin:2px 2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
      c.innerHTML = '<svg width="26" height="38" viewBox="0 0 26 38"><path d="M2 2 L2 30 L9 23 L14 35 L19 33 L14 21 L24 21 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
      document.body.appendChild(c);
    }
  });
}
async function shot(n = 1) {
  for (let i = 0; i < n; i++) {
    const jx = cx + rnd() * 0.8, jy = cy + rnd() * 0.8;
    const s = pressed > 0 ? 0.82 : 1;
    if (pressed > 0) pressed--;
    await page.evaluate((x, y, s) => {
      const c = document.getElementById('__cur');
      if (c) c.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    }, jx, jy, s);
    await page.screenshot({path: path.join(OUT, String(frame).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 80});
    cursor.push([+(jx / W).toFixed(4), +(jy / H).toFixed(4)]);
    frame++;
  }
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function moveTo(x, y) {
  const x0 = cx, y0 = cy, d = Math.hypot(x - x0, y - y0);
  const n = Math.max(10, Math.min(26, Math.round(d / 28)));
  const bow = (rnd() > 0 ? 1 : -1) * Math.min(80, d * 0.18);
  const nx = -(y - y0) / (d || 1), ny = (x - x0) / (d || 1);
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n), arc = Math.sin(Math.PI * t) * bow;
    cx = x0 + (x - x0) * t + nx * arc;
    cy = y0 + (y - y0) * t + ny * arc;
    await shot();
  }
  // tiny overshoot settle
  cx = x + rnd() * 3; cy = y + rnd() * 3; await shot(2);
  cx = x; cy = y; await shot(1);
}
async function box(text) {
  return page.evaluate((text) => {
    const els = [...document.querySelectorAll('a, button, [role="link"], [role="button"], nav *')].filter((e) => (e.textContent || '').trim().startsWith(text));
    const e = els.find((x) => x.getBoundingClientRect().width > 0);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return {x: r.x + Math.min(70, r.width / 2), y: r.y + r.height / 2};
  }, text);
}
async function clickNav(text) {
  const b = await box(text);
  if (!b) throw new Error('not found: ' + text);
  await moveTo(b.x, b.y);
  await shot(6); // hover
  pressed = 4;
  await shot(4);
  await page.evaluate((text) => {
    const els = [...document.querySelectorAll('a, button, [role="link"], [role="button"], nav *')].filter((e) => (e.textContent || '').trim().startsWith(text));
    const e = els.find((x) => x.getBoundingClientRect().width > 0);
    e.click();
  }, text);
  await page.waitForNetworkIdle({idleTime: 600, timeout: 120000}).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
  await prep();
}
async function scrollBy(px, frames = 40) {
  const start = await page.evaluate(() => {
    const m = document.querySelector('main');
    return m && m.scrollHeight > m.clientHeight ? m.scrollTop : window.scrollY;
  });
  for (let i = 1; i <= frames; i++) {
    const y = start + px * ease(i / frames);
    await page.evaluate((y) => {
      const m = document.querySelector('main');
      if (m && m.scrollHeight > m.clientHeight) m.scrollTop = y; else window.scrollTo(0, y);
    }, y);
    cx += rnd() * 1.5; cy += rnd() * 1.2;
    await shot();
  }
}
async function wander(points) {
  for (const [x, y, hold] of points) { await moveTo(x, y); await shot(hold); }
}

await page.goto(`${BASE}/demand`, {waitUntil: 'networkidle0', timeout: 240000});
await new Promise((r) => setTimeout(r, 2500));
await prep();

// 1) demand: glance at sidebar, read the chart
segments.demand = frame;
await shot(8);
await wander([[150, 300, 6], [700, 420, 10], [960, 470, 12], [560, 520, 8]]);
await scrollBy(320, 45);
await wander([[420, 470, 10]]);
// 2) competition
segments.competition = frame;
await clickNav('2. Competition');
await shot(10);
await wander([[640, 360, 10], [900, 480, 12]]);
await scrollBy(380, 45);
await wander([[520, 430, 10]]);
// 3) supplier & profit
segments.supplier = frame;
await clickNav('3. Supplier');
await shot(10);
await wander([[700, 380, 10], [980, 430, 12]]);
await scrollBy(360, 45);
await wander([[620, 480, 12]]);
// 4) product score
segments.score = frame;
await clickNav('4. Product score');
await shot(10);
await wander([[600, 330, 14], [900, 420, 10]]);
await scrollBy(300, 40);
await wander([[700, 460, 14]]);
segments.end = frame;

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({fps: FPS, width: W, height: H, frames: frame, segments, cursor}, null, 0));
console.log(`walkthrough: ${frame} frames (${(frame / FPS).toFixed(1)}s)`, segments);
await browser.close();
