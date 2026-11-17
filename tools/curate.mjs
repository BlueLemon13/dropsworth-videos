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
  supercar: ['P1', 'P2', 'P4', 'P8', 'P9', 'P12', 'P3'], // POV driving only (owner: always POV), no McLaren
  sales: ['G15', 'W2'], // REAL Shopify notifications on a phone (W4 removed: opens on a person)
  penthouse: ['P24', 'S13', 'S14', 'S19', 'N22', 'N24'], // POV-style views from penthouses
  friends: ['F16', 'F8', 'F12', 'F6'], // POV hook intro: rich young friends with supercars (F7 McLaren excluded)
  pov: ['Y1', 'Y3', 'Y4', 'Y5', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'W11', 'W14', 'W15', 'W13', 'W7'], // + hands-in-frame rich lifestyle POV (Rolls wheel + watch, Dubai drive, wrist watch, superyacht, palm walk) // POV luxury: jet window, jet tarmac, car door to jet, Lambo dash night, infinity pools, iced Rolex, sunset terrace
  yacht: ['P26', 'P31', 'P32', 'P33', 'P30', 'P29', 'P34', 'P25'], // POV yacht / boat views
  money: ['A13', 'A14', 'A12', 'A16'],                    // cash
  // calm, slow, moving, SHARP + BRIGHT ENOUGH (removed: A21 watermark, A4 blurry, A19 + A9 too dark/low quality,
  // S15 TikTok watermark, S6 burned-in text). S/T = MacBook sessions, penthouses, non-McLaren cars (2026-11-16).
  sauce: ['B0', 'A24', 'N19', 'N22', 'N24', 'B16', 'S13', 'S14', 'S19', 'S23', 'S24', 'T0', 'T1'], // cozy MacBook clips S1 S4 S8 S11 removed: MacBooks must look RICH (black, luxury setting)
  // owner's own saves (2026-11-17). mhook = real Shopify notifications on a phone, mpov = rich POV b-roll, mintro = silent POV intro
  mhook: ['mine/1089589703636819985', 'mine/1089589703636819880', 'mine/1089589703636820004', 'mine/1089589703636819616', 'mine/1089589703636819643'],
  mpov: ['mine/1089589703636819229', 'mine/1089589703636819493', 'mine/1089589703636819557', 'mine/1089589703636819701', 'mine/1089589703636819757', 'mine/1089589703636819778', 'mine/1089589703636820013'],
  mintro: ['mine/1089589703636819229', 'mine/1089589703636819557'],
};
// product photo shown inside the store-grid / scorecard graphics
const PRODUCT_THUMB = 'N14';
const SHEETS = {A: 'v-all', B: 'v-all2', N: 'v-new', M: 'v-new2', G: 'v-g1', C: 'v-car', S: 'v-s1', T: 'v-s2', P: 'v-pov', F: 'v-fr', X: 'v-sx', Y: 'v-pv', W: 'v-w'};
const GH = process.env.GH_BIN || 'C:\\Program Files\\GitHub CLI\\gh.exe';
const REPO = 'BlueLemon13/dropsworth-videos';

const lib = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/bvideo/library.json'), 'utf8'));
const byFile = new Map(lib.map((x) => [x.file, x]));
const sheetFile = (k) => k.startsWith('mine/') ? k + '.mp4' : JSON.parse(fs.readFileSync(path.join(ROOT, 'output/sheets', `${SHEETS[k[0]]}.json`), 'utf8')).files[Number(k.slice(1))].replace(/^bvideo\//, '');

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
