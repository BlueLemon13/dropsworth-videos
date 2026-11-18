// After posting: file the finished videos on E: by type (owner's layout, 2026-11-18).
//   E:\all dropsworth videos here\all sauce here\        <date> <slot> sauce.mp4
//   E:\all dropsworth videos here\all explainers here\   <date> <slot> explainer.mp4
//   E:\all dropsworth videos here\all video demos here\  <date> <slot> demo.mp4
// usage: node tools/save-posted.mjs <date> [A1,A3,...]   (default: every video in output/<date>)
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './env.mjs';

const [date, onlyArg] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('usage: node tools/save-posted.mjs <YYYY-MM-DD> [slots]');
const only = (onlyArg || '').split(',').filter(Boolean);
const E = 'E:\all dropsworth videos here';
if (!fs.existsSync(E)) throw new Error('E: drive not plugged in');
const DIRS = {sauce: 'all sauce here', explainer: 'all explainers here', demo: 'all video demos here'};
const src = path.join(ROOT, 'output', date);
let n = 0;
for (const f of fs.readdirSync(src)) {
  const m = f.match(/^([AB]\d)-(\w+)\.mp4$/);
  if (!m || (only.length && !only.includes(m[1]))) continue;
  const dir = path.join(E, DIRS[m[2]] || 'all test videos here');
  fs.mkdirSync(dir, {recursive: true});
  const dest = path.join(dir, `${date} ${m[1]} ${m[2]}.mp4`);
  fs.copyFileSync(path.join(src, f), dest);
  console.log('saved', path.relative(E, dest));
  n++;
}
console.log(`${n} videos filed`);
