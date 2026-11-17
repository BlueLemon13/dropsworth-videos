// Download every VIDEO pin from a Pinterest profile/board (the owner's own saves).
// Step 1: meka.im scraper lists the pins (boards/profile). Step 2: apt_marble resolves video pins to MP4s.
// usage: node tools/pinsaved.mjs <tag> <profileOrBoardUrl> [maxPins]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, need} from './env.mjs';

const [tag, url, maxStr] = process.argv.slice(2);
const H = {'Content-Type': 'application/json', Authorization: `Bearer ${need('APIFY_TOKEN')}`};
const isBoard = new URL(url).pathname.split('/').filter(Boolean).length >= 2;

const r1 = await fetch('https://api.apify.com/v2/acts/meka.im~pinterest-scraper/run-sync-get-dataset-items?timeout=290', {
  method: 'POST', headers: H,
  body: JSON.stringify({...(isBoard ? {boardUrls: [url]} : {profileUrls: [url]}), maxPins: Number(maxStr || 300)}),
});
if (!r1.ok) throw new Error(`list ${r1.status}: ${(await r1.text()).slice(0, 300)}`);
const pins = await r1.json();
const vids = process.env.ALL_PINS ? pins : pins.filter((p) => p.isVideo);
console.log(`listed ${pins.length} pins, ${vids.length} videos`);
if (!vids.length) process.exit(0);

const r2 = await fetch('https://api.apify.com/v2/acts/apt_marble~pinterest-video-scraper/run-sync-get-dataset-items?timeout=290', {
  method: 'POST', headers: H,
  body: JSON.stringify({pins: vids.map((p) => p.url), maxVideos: vids.length + 5}),
});
if (!r2.ok) throw new Error(`resolve ${r2.status}: ${(await r2.text()).slice(0, 300)}`);
const rows = await r2.json();
console.log(`resolved ${rows.length} video rows`);

const FFMPEG = path.join(ROOT, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const out = path.join(ROOT, 'public/bvideo', tag);
fs.mkdirSync(out, {recursive: true});
const libPath = path.join(ROOT, 'public/bvideo/library.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
let n = 0;
for (const r of rows) {
  const id = String(r.id);
  const dest = path.join(out, `${id}.mp4`);
  try {
    if (r.mp4Url) {
      const v = await fetch(r.mp4Url, {headers: {'User-Agent': 'Mozilla/5.0'}});
      if (!v.ok) throw new Error(v.status);
      fs.writeFileSync(dest, Buffer.from(await v.arrayBuffer()));
    } else if (r.hlsUrl) execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', r.hlsUrl, '-c', 'copy', dest]);
    else continue;
    if (r.thumbnail) {
      const t = await fetch(r.thumbnail, {headers: {'User-Agent': 'Mozilla/5.0'}});
      const b = Buffer.from(await t.arrayBuffer());
      if (t.ok && b.toString('ascii', 4, 8) !== 'ftyp') fs.writeFileSync(path.join(out, `${id}.jpg`), b);
    }
    if (!lib.find((x) => x.id === id)) lib.push({id, tag, file: `${tag}/${id}.mp4`, query: 'owner saved', w: r.width, h: r.height, dur: r.durationSeconds, alt: r.altText, url: r.url});
    n++;
  } catch (e) { console.log('fail', id, e.message); }
}
fs.writeFileSync(libPath, JSON.stringify(lib, null, 1));
console.log(`downloaded ${n} videos -> ${out}`);
