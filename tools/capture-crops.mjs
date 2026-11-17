// Clean, UNBRANDED crops of the app for explainers (no logo, no app name):
//  crops/item-demand|item-competition|item-supplier.png  (sidebar rows, for the contents list)
//  crops/demand-line.png   (demand chart switched to LINE view, plot only)
//  crops/competition.png   (the competition summary card: stores selling + saturated)
//  crops/supplier.png      (supplier stats: matches, avg price per unit)
// usage: node tools/capture-crops.mjs [baseUrl]   (default http://localhost:3007)
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {ROOT} from './env.mjs';

const BASE = process.argv[2] || 'http://localhost:3007';
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(ROOT, 'public/app/crops');
fs.mkdirSync(OUT, {recursive: true});
const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 1000, deviceScaleFactor: 3});
const hideDemo = () => page.evaluate(() => {
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length === 0 && /^\s*Demo mode/.test(el.textContent || '')) {
      let b = el;
      for (let i = 0; i < 3 && b.parentElement && b.parentElement.textContent.trim().length < 80; i++) b = b.parentElement;
      b.style.display = 'none';
    }
  }
});
const shotRect = async (file, r, pad = 0) => {
  await page.screenshot({path: path.join(OUT, file), clip: {x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2}});
};
const go = async (p) => {
  await page.goto(`${BASE}/${p}`, {waitUntil: 'networkidle0', timeout: 240000});
  await new Promise((r) => setTimeout(r, 2000));
  await hideDemo();
};

await go('demand');
// sidebar rows (icon + label + key hint), each on its own
for (const [label, file] of [['1. Demand', 'item-demand.png'], ['2. Competition', 'item-competition.png'], ['3. Supplier', 'item-supplier.png']]) {
  const r = await page.evaluate((label) => {
    const e = [...document.querySelectorAll('a, button, [role="link"], [role="button"]')].find((x) => (x.textContent || '').trim().startsWith(label) && x.getBoundingClientRect().width > 0);
    const b = e.getBoundingClientRect();
    return {x: b.x, y: b.y, width: b.width, height: b.height};
  }, label);
  await shotRect(file, r, 6);
}
// competition summary card on the demand page ("34+ stores sell it ... Saturated")
const comp = await page.evaluate(() => {
  const el = [...document.querySelectorAll('a, div')].filter((d) => /stores sell it/.test(d.textContent || '') && /Saturated|Crowded|Open/.test(d.textContent || ''));
  el.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
  const e = el.find((x) => x.getBoundingClientRect().height > 50);
  e.scrollIntoView({block: 'center'});
  return true;
});
await new Promise((r) => setTimeout(r, 400));
const compR = await page.evaluate(() => {
  const el = [...document.querySelectorAll('a, div')].filter((d) => /stores sell it/.test(d.textContent || '') && /Saturated|Crowded|Open/.test(d.textContent || ''));
  el.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
  const b = el.find((x) => x.getBoundingClientRect().height > 50).getBoundingClientRect();
  return {x: b.x, y: b.y, width: b.width, height: b.height};
});
await shotRect('competition.png', compR, 4);
// demand chart -> line view, plot only
await page.evaluate(() => window.scrollTo(0, 0));
await page.evaluate(() => {
  const m = document.querySelector('main'); if (m) m.scrollTop = 0;
  const units = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Units sold');
  let card = units; while (card && card.getBoundingClientRect().height < 420) card = card.parentElement;
  // icon-only buttons in the toolbar: [bar, line, curve] -> click the 2nd (line)
  const icons = [...card.querySelectorAll('button')].filter((b) => !(b.textContent || '').trim() && b.querySelector('svg'));
  if (icons[1]) icons[1].click();
});
await new Promise((r) => setTimeout(r, 1200));
const plot = await page.evaluate(() => {
  const units = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Units sold');
  let card = units; while (card && card.getBoundingClientRect().height < 420) card = card.parentElement;
  const svgs = [...card.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().width > 400);
  svgs.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height);
  const b = svgs[0].getBoundingClientRect();
  return {x: b.x, y: b.y, width: b.width, height: b.height};
});
await shotRect('demand-line.png', plot, 10);

// supplier stats panel
await go('supplier');
const sup = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].filter((d) => /Avg price per unit/.test(d.textContent || '') && /Matches/.test(d.textContent || ''));
  el.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
  const b = el.find((x) => x.getBoundingClientRect().height > 80).getBoundingClientRect();
  return {x: b.x, y: b.y, width: b.width, height: b.height};
});
await shotRect('supplier.png', sup, 4);
console.log('crops saved:', fs.readdirSync(OUT).join(', '));
await browser.close();
