// Build the cloud clip library from the hand-approved clips, tagged by MEANING (see STYLE.md).
//  - catalog/clips.json (committed): id, tags, duration, asset name
//  - each clip is password-locked (tools/crypt.mjs) and uploaded to the GitHub release "clips"
// Picks reference contact-sheet indexes: A=v-all B=v-all2 N=v-new M=v-new2 G=v-g1 C=v-car.
// usage: node tools/curate.mjs            (re-run after changing PICKS; only new clips are uploaded)
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT} from './env.mjs';
import {lock} from './crypt.mjs';

const PICKS = {
  opener: ['G5', 'G6', 'G9', 'G24', 'G19'],               // a PERSON with car / penthouse / computer (first shot)
  tired: ['G0', 'G1', 'G2'],                              // struggling, losing money
  working: ['G5', 'G6', 'G7', 'G3', 'G9', 'M2'],          // grinding at the computer
  phone: ['B6', 'B7'],                                    // scrolling TikTok
  product: ['N0', 'N2', 'N3', 'N5', 'N10', 'N11', 'N14'], // real viral dropshipping products
  supercar: ['B16', 'B20'],            // winners
  sales: ['G15'],                                         // Shopify sales (G10 removed: TikTok watermark + a real customer's name)
  penthouse: ['G24', 'G19', 'N20', 'N21', 'N22', 'N24'],  // made it (END of video)
  money: ['A13', 'A14', 'A12', 'A16'],                    // cash
  sauce: ['B0', 'A24', 'A19', 'A9', 'A4', 'N19', 'N22', 'N24', 'B16'], // calm, slow, moving (A21 removed: TikTok watermark)
};
// product photo shown inside the store-grid / scorecard graphics
const PRODUCT_THUMB = 'N14';
const SHEETS = {A: 'v-all', B: 'v-all2', N: 'v-new', M: 'v-new2', G: 'v-g1', C: 'v-car'};
const GH = process.env.GH_BIN || 'C:\\Program Files\\GitHub CLI\\gh.exe';
const REPO = 'BlueLemon13/dropsworth-videos';

const lib = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/bvideo/library.json'), 'utf8'));
const byFile = new Map(lib.map((x) => [x.file, x]));
const sheetFile = (k) => JSON.parse(fs.readFileSync(path.join(ROOT, 'output/sheets', `${SHEETS[k[0]]}.json`), 'utf8')).files[Number(k.slice(1))].replace(/^bvideo\//, '');

const clips = new Map(); // id -> entry
for (const [tag, refs] of Object.entries(PICKS)) {
  for (const ref of refs) {
    const file = sheetFile(ref).replace(/\.jpg$/, '.mp4');
    const meta = byFile.get(file);
    if (!meta || !fs.existsSync(path.join(ROOT, 'public/bvideo', file))) { console.log('missing', ref, file); continue; }
    const short = meta.id.slice(-10).replace(/[^A-Za-z0-9]/g, '');
    const e = clips.get(meta.id) ?? {id: meta.id, asset: `${meta.tag}-${short}.mp4.enc`, src: file, dur: meta.dur, tags: []};
    e.tags.push(tag);
    clips.set(meta.id, e);
  }
}
const thumbSrc = sheetFile(PRODUCT_THUMB);
const thumb = {asset: 'product-thumb.jpg.enc', src: thumbSrc};

// make sure the release exists, find what's already uploaded
let existing = [];
try {
  existing = JSON.parse(execFileSync(GH, ['release', 'view', 'clips', '--repo', REPO, '--json', 'assets'], {encoding: 'utf8'})).assets.map((a) => a.name);
} catch {
  execFileSync(GH, ['release', 'create', 'clips', '--repo', REPO, '--title', 'Clip library (encrypted)', '--notes', 'Password-locked b-roll for the nightly pipeline. Not usable without the key.'], {stdio: 'inherit'});
}

const tmp = path.join(ROOT, 'cache', 'enc');
fs.mkdirSync(tmp, {recursive: true});
const toUpload = [];
for (const e of [...clips.values(), thumb]) {
  if (existing.includes(e.asset)) continue;
  const out = path.join(tmp, e.asset);
  lock(path.join(ROOT, 'public/bvideo', e.src), out);
  toUpload.push(out);
}
console.log(`${clips.size} clips (+ product thumb); uploading ${toUpload.length} new`);
for (let i = 0; i < toUpload.length; i += 10) {
  execFileSync(GH, ['release', 'upload', 'clips', '--repo', REPO, '--clobber', ...toUpload.slice(i, i + 10)], {stdio: 'inherit'});
  console.log(`  uploaded ${Math.min(i + 10, toUpload.length)}/${toUpload.length}`);
}

fs.mkdirSync(path.join(ROOT, 'catalog'), {recursive: true});
const catalog = {productThumb: thumb.asset, clips: [...clips.values()].map(({id, asset, dur, tags}) => ({id, asset, dur, tags}))};
fs.writeFileSync(path.join(ROOT, 'catalog/clips.json'), JSON.stringify(catalog, null, 1));
const counts = {};
catalog.clips.forEach((c) => c.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
console.log('catalog saved', counts);
