// Turn `pin:tag#N` (index on that tag's contact sheet) into a real file path, in place.
// usage: node tools/resolve.mjs scripts/x.spec.json
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './env.mjs';
const file = path.resolve(process.argv[2]);
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/pin:([a-z]+)#(\d+)/g, (_, tag, n) => {
  const sheet = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/sheets', `${tag}.json`), 'utf8'));
  return 'pin:' + sheet.files[Number(n)];
});
// `vid:tag#N` -> index on the video contact sheet (output/sheets/v-<tag>.json, made of thumbnails)
s = s.replace(/vid:([a-z]+)#(\d+)/g, (_, tag, n) => {
  const sheet = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/sheets', `v-${tag}.json`), 'utf8'));
  return 'vid:' + sheet.files[Number(n)].replace(/^bvideo\//, '').replace(/\.jpg$/, '.mp4');
});
fs.writeFileSync(file, s);
console.log('resolved', path.basename(file));
