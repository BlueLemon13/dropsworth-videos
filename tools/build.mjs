// Script spec -> ElevenLabs voice (exact timestamps) -> trimmed audio -> Remotion props.
// usage: node tools/build.mjs scripts/<name>.spec.json
//
// Spec: {"name": "...", "composition": "Reel", "lines": ["..."], "options": {...}}
// Line syntax:
//   *word              BIG word
//   ^word              BIG + Dropsworth blue
//   !word              BIG + red
//   word=spoken_words  show `word`, speak/time it as `spoken words`
//   [visual k=v ...]   switch scene here (swipe). keys: zoom, items=A|B, ticks=w1|w2, sfx=name, stage=...
//   {sfx}              play a sound effect at the next word
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROOT, need} from './env.mjs';

const FFMPEG = path.join(ROOT, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const specPath = path.resolve(process.argv[2]);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const name = spec.name;

// ---------- parse ----------
const parseVisual = (tok) => {
  const [visual, ...rest] = tok.slice(1, -1).split(/\s+/);
  const v = {visual};
  for (const p of rest) {
    const [k, val] = p.split(/=(.*)/s);
    if (k === 'zoom') v.zoom = Number(val);
    else if (k === 'items') v.items = val.replace(/_/g, ' ').split('|');
    else if (k === 'ticks') v.tickWords = val.split('|');
    else v[k] = val;
  }
  return v;
};

const items = [];
for (const line of spec.lines) {
  for (const t of line.match(/\[[^\]]+\]|\{\w+\}|\S+/g)) {
    if (t.startsWith('[')) items.push({kind: 'scene', ...parseVisual(t)});
    else if (/^\{\w+\}$/.test(t)) items.push({kind: 'sfx', name: t.slice(1, -1)});
    else {
      const mark = '*^!'.includes(t[0]) ? t[0] : '';
      const body = mark ? t.slice(1) : t;
      const [disp, spokenRaw] = body.split(/=(.*)/s);
      items.push({kind: 'word', text: disp, big: !!mark, blue: mark === '^', red: mark === '!', spoken: spokenRaw ? spokenRaw.replace(/_/g, ' ') : disp});
    }
  }
}
const words = items.filter((i) => i.kind === 'word');

// spoken text + char ranges per word
let text = '';
for (const w of words) {
  if (text) text += ' ';
  w.c0 = text.length;
  text += w.spoken;
  w.c1 = text.length;
}

// ---------- voice ----------
const audioDir = path.join(ROOT, 'public/audio');
const cacheDir = path.join(ROOT, 'cache');
fs.mkdirSync(audioDir, {recursive: true});
fs.mkdirSync(cacheDir, {recursive: true});
const voiceOpts = {model_id: 'eleven_multilingual_v2', voice_settings: {stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: spec.options?.speed ?? 1.15}};
const VOICE = process.env.PREVIEW_VOICE || need('VOICE_ID');
const hash = crypto.createHash('md5').update(text + JSON.stringify(voiceOpts) + VOICE).digest('hex').slice(0, 10);
const rawMp3 = path.join(cacheDir, `${name}-${hash}.mp3`);
const alignPath = path.join(cacheDir, `${name}-${hash}.json`);

if (!fs.existsSync(rawMp3)) {
  console.log('Generating voice...', text.length, 'chars');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {'xi-api-key': need('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json'},
    body: JSON.stringify({text, ...voiceOpts}),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 400)}`);
  const j = await r.json();
  fs.writeFileSync(rawMp3, Buffer.from(j.audio_base64, 'base64'));
  fs.writeFileSync(alignPath, JSON.stringify(j.alignment));
} else console.log('Voice cached');
const al = JSON.parse(fs.readFileSync(alignPath, 'utf8'));

for (const w of words) {
  let s = Infinity, e = 0;
  for (let c = w.c0; c < w.c1; c++) {
    if (/\s/.test(text[c])) continue;
    s = Math.min(s, al.character_start_times_seconds[c]);
    e = Math.max(e, al.character_end_times_seconds[c]);
  }
  w.t0 = s; w.t1 = e;
}

// ---------- trim silences ----------
const PRE = 0.04, POST = 0.07, MAXGAP = spec.options?.maxGap ?? 0.16;
const cuts = [];
if (words[0].t0 > PRE + 0.02) cuts.push([0, words[0].t0 - PRE]);
for (let i = 0; i + 1 < words.length; i++) {
  const a = words[i].t1, b = words[i + 1].t0;
  if (b - a > MAXGAP) cuts.push([a + POST, b - PRE]);
}
const rawEnd = words.at(-1).t1 + 0.3;
const remap = (t) => {
  let shift = 0;
  for (const [a, b] of cuts) {
    if (t >= b) shift += b - a;
    else if (t > a) shift += t - a;
  }
  return +(t - shift).toFixed(3);
};
const keep = [];
let pos = 0;
for (const [a, b] of cuts) { if (a > pos) keep.push([pos, a]); pos = b; }
keep.push([pos, rawEnd]);
// decode to raw PCM (Remotion's ffmpeg has no fade filters), splice in JS with tiny fades
const SR = 44100;
const tmpWav = rawMp3.replace(/.mp3$/, '.wav');
if (!fs.existsSync(tmpWav)) execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', rawMp3, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', tmpWav]);
const wavIn = fs.readFileSync(tmpWav);
const dataAt = wavIn.indexOf('data') + 8;
const src = new Int16Array(wavIn.buffer.slice(wavIn.byteOffset + dataAt, wavIn.byteOffset + wavIn.length - ((wavIn.length - dataAt) % 2)));
const parts = keep.map(([a, b]) => {
  const seg = Float32Array.from(src.subarray(Math.round(a * SR), Math.min(src.length, Math.round(b * SR))));
  const fi = Math.min(seg.length, Math.round(0.008 * SR)), fo = Math.min(seg.length, Math.round(0.012 * SR));
  for (let i = 0; i < fi; i++) seg[i] *= i / fi;
  for (let i = 0; i < fo; i++) seg[seg.length - 1 - i] *= i / fo;
  return seg;
});
const total = parts.reduce((n, p) => n + p.length, 0);
const wavBuf = Buffer.alloc(44 + total * 2);
wavBuf.write('RIFF', 0); wavBuf.writeUInt32LE(36 + total * 2, 4); wavBuf.write('WAVEfmt ', 8);
wavBuf.writeUInt32LE(16, 16); wavBuf.writeUInt16LE(1, 20); wavBuf.writeUInt16LE(1, 22); wavBuf.writeUInt32LE(SR, 24);
wavBuf.writeUInt32LE(SR * 2, 28); wavBuf.writeUInt16LE(2, 32); wavBuf.writeUInt16LE(16, 34); wavBuf.write('data', 36); wavBuf.writeUInt32LE(total * 2, 40);
let o = 44;
for (const p of parts) for (const v of p) { wavBuf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v))), o); o += 2; }
const outAudio = `audio/${name}.wav`;
fs.writeFileSync(path.join(ROOT, 'public', outAudio), wavBuf);
for (const w of words) { w.t = remap(w.t0); w.end = remap(w.t1); }
const end = remap(rawEnd);

// ---------- scenes + sfx ----------
const scenes = [], sfx = [];
let pendingScene = [], pendingSfx = [];
for (const it of items) {
  if (it.kind === 'scene') pendingScene.push(it);
  else if (it.kind === 'sfx') pendingSfx.push(it.name);
  else {
    for (const s of pendingScene) { s.start = scenes.length === 0 ? 0 : +(it.t - 0.05).toFixed(3); scenes.push(s); }
    for (const n of pendingSfx) sfx.push({name: n, t: it.t});
    pendingScene = []; pendingSfx = [];
  }
}
const tail = spec.options?.tail ?? 0.8;
// sfx level: "full" (whoosh, pops, ticks, scene sfx) or "minimal" (only a very soft whoosh on swipes)
const minimal = (spec.options?.sfx ?? 'minimal') === 'minimal';
scenes.forEach((s, i) => {
  s.end = i + 1 < scenes.length ? scenes[i + 1].start : +(end + tail).toFixed(3);
  delete s.kind;
  if (s.sfx && !minimal) sfx.push({name: s.sfx, t: s.start});
  else if (i > 0 && s.transition !== 'none') sfx.push({name: 'whoosh', t: Math.max(0, s.start - 0.06), vol: minimal ? 0.12 : 0.5});
  delete s.sfx;
  if (s.tickWords) {
    s.ticks = s.tickWords.map((tw) => {
      const hit = words.find((w) => w.t >= s.start && w.text.toLowerCase().replace(/[.,?!]/g, '') === tw.toLowerCase());
      if (hit && !minimal) sfx.push({name: 'tick', t: hit.t, vol: 0.6});
      return hit ? +(hit.t - s.start).toFixed(3) : null;
    });
    delete s.tickWords;
  }
});
if (!minimal) for (const w of words) if (w.blue || w.red) sfx.push({name: 'pop', t: w.t, vol: 0.35});

// ---------- caption groups (max 3 words, break on punctuation, big words, scene starts) ----------
const starts = scenes.map((s) => s.start);
const groups = [];
let cur = [];
words.forEach((w, i) => {
  const crossesScene = cur.length && starts.some((st) => words[cur.at(-1)].t < st && st <= w.t);
  if (cur.length && (cur.length >= 3 || (w.big && cur.length >= 2) || crossesScene)) { groups.push(cur); cur = []; }
  cur.push(i);
  if (/[.,?!:]$/.test(w.text)) { groups.push(cur); cur = []; }
});
if (cur.length) groups.push(cur);
const groupsOut = groups.map((g, j) => ({words: g, start: words[g[0]].t, end: j + 1 < groups.length ? words[groups[j + 1][0]].t : +(end + tail).toFixed(3)}));

const props = {
  audio: outAudio,
  words: words.map(({text, big, blue, red, t, end}) => ({text, big, blue, red, t, end})),
  groups: groupsOut,
  scenes,
  sfx: sfx.sort((a, b) => a.t - b.t),
  duration: +(end + tail).toFixed(3),
  ...(spec.props ?? {}),
};
const outProps = specPath.replace(/\.spec\.json$/, '.props.json');
fs.writeFileSync(outProps, JSON.stringify(props, null, 1));
console.log(`OK ${path.basename(outProps)}: ${words.length} words, ${scenes.length} scenes, ${props.duration}s (raw ${rawEnd.toFixed(2)}s, cut ${cuts.length} gaps)`);
