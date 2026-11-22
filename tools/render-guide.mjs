// Render "dropshipping guide" videos (Guide composition) from output/guide/props/<key>.json.
// usage: node tools/render-guide.mjs <key,key> [--stills]
//   --stills: only a still from the middle of every shot/popup, into output/guide/stills/<key>/
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {ROOT} from './env.mjs';

const keys = (process.argv[2] || '').split(',').filter(Boolean);
const stills = process.argv.includes('--stills');
const G = path.join(ROOT, 'output/guide');
const slim = process.env.GUIDE_SLIM || (process.platform === 'win32' ? 'E:/tmp/guidepub' : path.join(os.tmpdir(), 'guidepub'));
fs.rmSync(slim, {recursive: true, force: true});
const all = keys.map((k) => [k, JSON.parse(fs.readFileSync(path.join(G, `props/${k}.json`), 'utf8'))]);
const need = new Set(['walk/paper.png', 'guide/logo.png', 'guide/cover-phone.jpg']);
for (const [, p] of all) { need.add(p.audio); p.shots.forEach((s) => s.file && need.add(s.file)); p.pops.forEach((x) => { need.add(x.src); (x.row || []).forEach((r) => need.add(r)); }); }
for (const f of need) { fs.mkdirSync(path.dirname(path.join(slim, f)), {recursive: true}); fs.copyFileSync(path.join(ROOT, 'public', f), path.join(slim, f)); }

let t = Date.now();
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: slim});
console.log(`bundled in ${((Date.now() - t) / 1000).toFixed(0)}s`);

for (const [k, props] of all) {
  const composition = await selectComposition({serveUrl, id: 'Guide', inputProps: props});
  if (stills) {
    const dir = path.join(G, 'stills', k);
    fs.rmSync(dir, {recursive: true, force: true});
    fs.mkdirSync(dir, {recursive: true});
    const at = [...props.shots.map((s) => (s.from + s.to) / 2), ...props.pops.map((p) => Math.min(p.t1 - 0.1, p.t0 + 0.6))].sort((a, b) => a - b);
    for (const s of at) {
      await renderStill({composition, serveUrl, inputProps: props, frame: Math.round(s * 30), output: path.join(dir, `${s.toFixed(1).padStart(5, '0')}.jpg`), imageFormat: 'jpeg', jpegQuality: 70, scale: 0.4});
    }
    console.log(`${k}: ${at.length} stills`);
    continue;
  }
  t = Date.now();
  const out = path.join(process.env.GUIDE_OUT || path.join(G, 'fast'), `${k}.mp4`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: out, inputProps: props,
    concurrency: +(process.env.GUIDE_CONC || 2), offthreadVideoCacheSizeInBytes: 256 * 1024 * 1024, videoBitrate: '1200k', audioBitrate: '128k', x264Preset: 'medium'});
  console.log(`${k}: ${((Date.now() - t) / 1000).toFixed(0)}s, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
}
