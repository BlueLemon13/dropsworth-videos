// The nightly pipeline: write 6 scripts -> pick + unlock clips -> voice -> render -> captions.
// usage: node tools/nightly.mjs [YYYY-MM-DD] [--skip-write] [--only A1,B3]
// In the cloud set DW_LOCK=1 to password-lock the finished videos for the downloadable artifact.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './env.mjs';
import {lock, unlock} from './crypt.mjs';

const args = process.argv.slice(2);
const sydneyDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'Australia/Sydney'}).format(new Date());
const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || sydneyDate;
const only = (args[args.indexOf('--only') + 1] || '').split(',').filter((s) => /^[AB][123]$/.test(s));
const outDir = path.join(ROOT, 'output', date);
const LIB = path.join(ROOT, 'public/bvideo/_lib');
const RELEASE = 'https://github.com/BlueLemon13/dropsworth-videos/releases/download/clips/';
fs.mkdirSync(LIB, {recursive: true});
fs.mkdirSync(outDir, {recursive: true});

const run = (cmd, cmdArgs, label) => {
  const t0 = Date.now();
  const r = spawnSync(cmd, cmdArgs, {cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32', env: process.env});
  if (r.status !== 0) throw new Error(`${label} failed (exit ${r.status})`);
  console.log(`  ${label} ok (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
};

// ---------- 1. scripts ----------
if (!args.includes('--skip-write') || !fs.existsSync(path.join(outDir, 'plan.json'))) run('node', ['tools/write-scripts.mjs', date], 'write scripts');
const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'plan.json'), 'utf8'));

// ---------- 2. clips ----------
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/clips.json'), 'utf8'));
const statePath = path.join(ROOT, 'state/used.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {topics: [], clips: {}};
state.clips ??= {};

async function ensure(asset) {
  const plain = asset.replace(/\.enc$/, '');
  const dest = path.join(LIB, plain);
  if (fs.existsSync(dest)) return plain;
  const enc = path.join(ROOT, 'cache', 'enc', asset);
  if (!fs.existsSync(enc)) {
    fs.mkdirSync(path.dirname(enc), {recursive: true});
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await fetch(RELEASE + asset, {signal: AbortSignal.timeout(120000)});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        fs.writeFileSync(enc, Buffer.from(await r.arrayBuffer()));
        break;
      } catch (e) {
        console.log(`  download ${asset} attempt ${attempt} failed: ${e.message}${e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : ''}`);
        if (attempt >= 5) throw new Error(`could not download ${asset}`);
        await new Promise((res) => setTimeout(res, 3000 * attempt));
      }
    }
  }
  unlock(enc, dest);
  return plain;
}

// least-used clip for a tag, never reusing a clip inside the same video
async function pick(tag, taken) {
  const pool = catalog.clips.filter((c) => c.tags.includes(tag) && !taken.has(c.id));
  const choices = pool.length ? pool : catalog.clips.filter((c) => c.tags.includes(tag));
  if (!choices.length) throw new Error(`no clips tagged ${tag}`);
  choices.sort((a, b) => (state.clips[a.id] || 0) - (state.clips[b.id] || 0) || Math.random() - 0.5);
  const c = choices[0];
  taken.add(c.id);
  state.clips[c.id] = (state.clips[c.id] || 0) + 1;
  return {file: await ensure(c.asset), dur: c.dur};
}
const thumb = 'bvideo/_lib/' + (await ensure(catalog.productThumb));

// ---------- 3. post times ----------
const BASE = {1: [11, 0], 2: [16, 0], 3: [20, 0]};
const postTime = (slot) => {
  const [h, m] = BASE[slot[1]];
  const mins = h * 60 + m + (slot[0] === 'B' ? 40 : 0) + Math.floor(Math.random() * 26);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};

// ---------- 4. build + render each video ----------
const results = [];
for (const v of plan.videos) {
  if (only.length && !only.includes(v.slot)) continue;
  const name = `${date}-${v.slot}`;
  const out = path.join(outDir, `${v.slot}-${v.format}.mp4`);
  console.log(`\n=== ${v.slot} ${v.format}: ${v.topic}`);
  try {
    const taken = new Set();
    if (v.format === 'sauce') {
      const clip = await pick('sauce', taken);
      const words = v.sauce_text.split(/\s+/).length;
      const props = {video: `_lib/${clip.file}`, videoSeconds: clip.dur || 8, text: v.sauce_text, duration: Math.min(12, Math.max(7, Math.round(words / 2.8 + 3))), fontSize: 38, y: 0.46};
      const propsPath = path.join(outDir, `${v.slot}.props.json`);
      fs.writeFileSync(propsPath, JSON.stringify(props, null, 1));
      run('npx', ['remotion', 'render', 'src/index.ts', 'Sauce', out, `--props=${propsPath}`, '--timeout=120000', '--log=error'], 'render');
    } else {
      const lines = [];
      for (const [i, l] of v.lines.entries()) {
        let marker;
        if (l.shot.startsWith('g-')) {
          marker = `[${l.shot} img=${thumb}${l.shot === 'g-score' ? ' ticks=demand|margin|competition' : ''}${l.step ? ` step=${l.step}` : ''}]`;
        } else {
          const clip = await pick(l.shot, taken);
          const step = l.step ? ` step=${l.step}` : i === 0 ? ' step=0' : '';
          marker = `[vid:_lib/${clip.file} grade=bright${step}]`;
        }
        lines.push(`${marker} ${l.text}`);
      }
      const end = await pick('penthouse', taken); // made it, then the DM graphic
      lines.push(`[vid:_lib/${end.file} grade=bright step=0] Send me the word ^VALIDATE [g-dm] and I'll send you my *FREE checklist.`);
      const specPath = path.join(outDir, `${v.slot}.spec.json`);
      fs.writeFileSync(specPath, JSON.stringify({name, lines, options: {sfx: 'minimal', tail: 2.6}}, null, 2));
      run('node', ['tools/build.mjs', specPath], 'voice + timing');
      run('npx', ['remotion', 'render', 'src/index.ts', 'Reel', out, `--props=${specPath.replace(/\.spec\.json$/, '.props.json')}`, '--timeout=120000', '--log=error'], 'render');
    }
    results.push({slot: v.slot, format: v.format, file: path.basename(out), ok: true});
    state.topics.push({date, slot: v.slot, topic: v.topic, hook: v.hook_style});
  } catch (e) {
    console.log(`  !! ${v.slot} failed: ${e.message}`);
    results.push({slot: v.slot, format: v.format, ok: false, error: e.message});
  }
}

// ---------- 5. captions + state ----------
const cap = plan.videos.filter((v) => !only.length || only.includes(v.slot)).map((v) => {
  const r = results.find((x) => x.slot === v.slot);
  return [`${v.slot} (${v.format}) post at ${postTime(v.slot)} — ${r?.ok ? r.file : 'FAILED: ' + r?.error}`, `topic: ${v.topic}`, v.caption, v.hashtags.join(' '), ''].join('\n');
}).join('\n');
fs.writeFileSync(path.join(outDir, 'captions.txt'), `Dropsworth videos for ${date}\nAccount A = teacher, Account B = lifestyle. Tick "AI-generated content" on upload.\n\n${cap}`);
fs.mkdirSync(path.dirname(statePath), {recursive: true});
state.topics = state.topics.filter((t) => (Date.parse(date) - Date.parse(t.date)) / 864e5 < 60);
fs.writeFileSync(statePath, JSON.stringify(state, null, 1));

// ---------- 6. lock for the public cloud artifact ----------
if (process.env.DW_LOCK === '1') {
  const lockedDir = path.join(outDir, 'locked');
  fs.mkdirSync(lockedDir, {recursive: true});
  for (const f of fs.readdirSync(outDir)) if (/\.(mp4|txt|json)$/.test(f)) lock(path.join(outDir, f), path.join(lockedDir, f + '.enc'));
}

const ok = results.filter((r) => r.ok).length;
console.log(`\nDONE ${date}: ${ok}/${results.length} videos rendered -> ${outDir}`);
if (!ok) process.exit(1);
