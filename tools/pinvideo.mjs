// Scrape Pinterest VIDEO pins via Apify (apt_marble/pinterest-video-scraper, $2 / 1k videos)
// and download MP4s into public/bvideo/<tag>/ (+ thumbnail .jpg for contact sheets).
// usage: node tools/pinvideo.mjs <tag> <maxPerQuery> "query one" "query two" ...
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, need} from './env.mjs';

const ACTOR = 'apt_marble~pinterest-video-scraper';
const FFMPEG = path.join(ROOT, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
// words that usually mean AI video, edits with text, or off-theme stuff
const BAD = ['ai video', 'ai generated', 'aiart', 'midjourney', 'generated', 'sora', 'runway', 'kling', 'veo',
  'cartoon', 'anime', 'animation', 'render', 'tutorial', 'how to', 'recipe', 'diy', 'quote', 'lyrics', 'edit audio'];

const [tag, max, ...queries] = process.argv.slice(2);
const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=290`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${need('APIFY_TOKEN')}`},
  body: JSON.stringify({queries, maxVideos: Number(max), minDurationSeconds: 4, maxDurationSeconds: 60, excludePromoted: true}),
});
if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 300)}`);
const rows = await res.json();

const out = path.join(ROOT, 'public/bvideo', tag);
fs.mkdirSync(out, {recursive: true});
const libPath = path.join(ROOT, 'public/bvideo/library.json');
const lib = fs.existsSync(libPath) ? JSON.parse(fs.readFileSync(libPath, 'utf8')) : [];
const have = new Set(lib.map((x) => x.id));
let kept = 0, skipped = 0;
const get = async (url) => {
  const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0'}});
  if (!r.ok) throw new Error(`${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};
for (const r of rows) {
  const id = String(r.id);
  const text = [r.title, r.description, r.altText].join(' ').toLowerCase();
  const vertical = r.width && r.height ? r.height / r.width > 1.4 : true;
  if (have.has(id) || r.isStoryPin || !vertical || BAD.some((b) => text.includes(b))) { skipped++; continue; }
  const dest = path.join(out, `${id}.mp4`);
  try {
    if (r.mp4Url) fs.writeFileSync(dest, await get(r.mp4Url));
    else if (r.hlsUrl) execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', r.hlsUrl, '-c', 'copy', '-an', dest]);
    else { skipped++; continue; }
    if (r.thumbnail) fs.writeFileSync(path.join(out, `${id}.jpg`), await get(r.thumbnail));
  } catch (e) { console.log('download failed', id, e.message); continue; }
  lib.push({id, tag, file: `${tag}/${id}.mp4`, thumb: `${tag}/${id}.jpg`, query: r.searchQuery, w: r.width, h: r.height, dur: r.durationSeconds, alt: r.altText, url: r.url});
  have.add(id);
  kept++;
}
fs.writeFileSync(libPath, JSON.stringify(lib, null, 1));
console.log(`${tag}: ${rows.length} returned, kept ${kept}, skipped ${skipped}`);
