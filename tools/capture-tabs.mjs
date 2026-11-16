// Capture (1) the validation tabs in the sidebar (Demand, Competition, Supplier & profit, Product score) with
// each item's box, and (2) the demand chart card with the bar tops (for an animated "steady climb" line).
// Output: public/app/tabs.png, public/app/demand-chart.png, public/app/tabs.json
// usage: node tools/capture-tabs.mjs [baseUrl]   (default http://localhost:3007)
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {ROOT} from './env.mjs';

const BASE = process.argv[2] || 'http://localhost:3007';
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(ROOT, 'public/app');
const DPR = 2.5;
const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900, deviceScaleFactor: DPR});
await page.goto(`${BASE}/demand`, {waitUntil: 'networkidle0', timeout: 240000});
await new Promise((r) => setTimeout(r, 2500));
await page.evaluate(() => {
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length === 0 && /^\s*Demo mode/.test(el.textContent || '')) {
      let b = el;
      for (let i = 0; i < 3 && b.parentElement && b.parentElement.textContent.trim().length < 80; i++) b = b.parentElement;
      b.style.display = 'none';
    }
  }
});

// 1) sidebar tabs: collapse sub-menus so the 4 items sit together, then clip around them
const tabs = await page.evaluate(() => {
  const labels = ['1. Demand', '2. Competition', '3. Supplier', '4. Product score'];
  const find = (t) => [...document.querySelectorAll('a, button, [role="link"], [role="button"]')].find((e) => (e.textContent || '').trim().startsWith(t) && e.getBoundingClientRect().width > 0);
  const items = labels.map((t) => {
    const e = find(t);
    const r = e.getBoundingClientRect();
    return {label: t.replace(/^\d\.\s*/, ''), x: r.x, y: r.y, w: r.width, h: r.height};
  });
  const pad = 24;
  const x = Math.max(0, Math.min(...items.map((i) => i.x)) - pad);
  const y = Math.max(0, items[0].y - pad);
  const right = Math.max(...items.map((i) => i.x + i.w)) + pad;
  const bottom = items[3].y + items[3].h + pad;
  return {clip: {x, y, width: right - x, height: bottom - y}, items: items.map((i) => ({label: i.label, cx: (i.x + i.w * 0.42 - x) / (right - x), cy: (i.y + i.h / 2 - y) / (bottom - y), right: (i.x + i.w - x) / (right - x)}))};
});
await page.screenshot({path: path.join(OUT, 'tabs.png'), clip: tabs.clip});

// 2) demand chart card + bar tops
const chart = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Units sold');
  let card = btn;
  while (card && card.getBoundingClientRect().height < 420) card = card.parentElement;
  const r = card.getBoundingClientRect();
  const bars = [...card.querySelectorAll('rect, [class*="bar"]')].map((b) => b.getBoundingClientRect()).filter((b) => b.width > 6 && b.width < 60 && b.height > 4 && b.bottom > r.y + r.height * 0.35);
  bars.sort((a, b) => a.x - b.x);
  const tops = bars.map((b) => [(b.x + b.width / 2 - r.x) / r.width, (b.y - r.y) / r.height]);
  return {clip: {x: r.x, y: r.y, width: Math.min(r.width, 1280 - r.x), height: r.height}, tops};
});
await page.screenshot({path: path.join(OUT, 'demand-chart.png'), clip: chart.clip});

fs.writeFileSync(path.join(OUT, 'tabs.json'), JSON.stringify({tabs: {w: tabs.clip.width, h: tabs.clip.height, items: tabs.items}, chart: {w: chart.clip.width, h: chart.clip.height, tops: chart.tops}}, null, 1));
console.log('tabs', tabs.items.map((i) => i.label).join(', '), '| chart bars', chart.tops.length);
await browser.close();
