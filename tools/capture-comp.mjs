// Re-capture just the competition summary card ("34+ stores sell it · 1 serious competitor  Saturated").
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {ROOT} from './env.mjs';
const browser = await puppeteer.launch({executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 1000, deviceScaleFactor: 3});
await page.goto('http://localhost:3007/demand', {waitUntil: 'networkidle0', timeout: 240000});
await new Promise((r) => setTimeout(r, 2000));
const ok = await page.evaluate(() => {
  const leaf = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && /serious competitor/.test(e.textContent || ''));
  if (!leaf) return false;
  let c = leaf;
  while (c.parentElement && !(c.getBoundingClientRect().width > 600 && c.getBoundingClientRect().height > 60)) c = c.parentElement;
  c.setAttribute('data-cap', '1');
  c.scrollIntoView({block: 'center'});
  return true;
});
if (!ok) throw new Error('card not found');
await new Promise((r) => setTimeout(r, 500));
const el = await page.$('[data-cap="1"]');
await el.screenshot({path: path.join(ROOT, 'public/app/crops/competition.png')});
console.log('competition card captured');
await browser.close();
