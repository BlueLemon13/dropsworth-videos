// Scrape Pinterest via Apify (meka.im/pinterest-scraper), download images into broll/<tag>/.
// usage: node tools/pinterest.mjs <tag> <maxPerQuery> "query one" "query two" ...
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, need} from './env.mjs';

const ACTOR = 'meka.im~pinterest-scraper';
const BROLL = path.join(ROOT, 'public', 'broll');
const BAD = ['ai art', 'ai generated', 'aiart', 'midjourney', 'stable diffusion', 'dall-e', 'dalle', 'leonardo',
  'generated', 'cartoon', 'anime', 'illustration', 'drawing', 'clipart', 'vector', 'quote', 'meme', 'render',
  'concept art', 'digital art', 'logo', 'template', 'sketch', 'painting', 'minecraft', 'bloxburg', 'sims'];

const [tag, maxStr, ...queries] = process.argv.slice(2);
const token = need('APIFY_TOKEN');
const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=280`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
  body: JSON.stringify({searchQueries: queries, maxPins: Number(maxStr)}),
});
if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 300)}`);
const pins = await res.json();

const out = path.join(BROLL, tag);
fs.mkdirSync(out, {recursive: true});
const libPath = path.join(BROLL, 'library.json');
const lib = fs.existsSync(libPath) ? JSON.parse(fs.readFileSync(libPath, 'utf8')) : [];
const have = new Set(lib.map((x) => x.id));
let kept = 0, filtered = 0;
for (const p of pins) {
  const id = String(p.id);
  if (!p.imageUrl || have.has(id)) continue;
  const text = [p.title, p.description, p.altText, p.domain].join(' ').toLowerCase();
  if (p.isVideo || BAD.some((b) => text.includes(b))) { filtered++; continue; }
  try {
    const r = await fetch(p.imageUrl, {headers: {'User-Agent': 'Mozilla/5.0'}});
    if (!r.ok) throw new Error(r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.toString('ascii', 4, 8) === 'ftyp') throw new Error('HEIC/AVIF not supported by Chrome');
    fs.writeFileSync(path.join(out, `${id}.jpg`), buf);
  } catch (e) { console.log('download failed', id, e.message); continue; }
  lib.push({id, tag, file: `${tag}/${id}.jpg`, query: (p.sourceQueries && p.sourceQueries[0]) || queries[0],
    title: p.title, alt: p.altText, color: p.dominantColor, url: p.url});
  have.add(id);
  kept++;
}
fs.writeFileSync(libPath, JSON.stringify(lib, null, 1));
console.log(`${tag}: ${pins.length} pins returned, kept ${kept}, filtered ${filtered}`);
