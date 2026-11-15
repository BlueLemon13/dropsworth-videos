// Synthesised sound-effect kit (no API needed). Writes public/sfx/*.wav
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './env.mjs';
const SR = 44100;
const dir = path.join(ROOT, 'public/sfx');
fs.mkdirSync(dir, {recursive: true});
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(name, data) {
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(data.length * 2, 40);
  const peak = Math.max(...data.map(Math.abs)) || 1;
  data.forEach((v, i) => buf.writeInt16LE(Math.round((v / peak) * 0.9 * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(dir, `${name}.wav`), buf);
}
const gen = (sec, fn) => Array.from({length: Math.round(sec * SR)}, (_, i) => fn(i / SR, sec));

// whoosh: noise through a sweeping resonant band-pass, swelling then fading
{
  let lp = 0, bp = 0; const out = [];
  const n = Math.round(0.42 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const fc = 300 + 2600 * Math.sin(Math.PI * Math.min(1, t * 1.3)) ** 2;
    const k = 2 * Math.sin(Math.PI * fc / SR), q = 0.35;
    const x = rnd();
    lp += k * bp; const hp = x - lp - q * bp; bp += k * hp;
    const env = Math.sin(Math.PI * Math.min(1, t ** 0.7)) ** 2;
    out.push(bp * env);
  }
  wav('whoosh', out);
}
// pop: quick downward sine chirp
wav('pop', gen(0.12, (t) => Math.sin(2 * Math.PI * (900 * t - 2600 * t * t)) * Math.exp(-t * 38)));
// tick: bright click + short tone
wav('tick', gen(0.09, (t) => (Math.sin(2 * Math.PI * 2400 * t) * 0.7 + Math.sin(2 * Math.PI * 3600 * t) * 0.3) * Math.exp(-t * 60) + rnd() * Math.exp(-t * 400) * 0.4));
// cash: drawer clunk + two bells
wav('cash', gen(1.0, (t) => {
  const clunk = rnd() * Math.exp(-t * 60) * 0.5 + Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 30) * 0.4;
  const b = (f0, d) => (t > d ? (Math.sin(2 * Math.PI * f0 * (t - d)) + 0.4 * Math.sin(2 * Math.PI * f0 * 2.76 * (t - d))) * Math.exp(-(t - d) * 5) : 0);
  return clunk + 0.5 * b(2093, 0.06) + 0.5 * b(2637, 0.16);
}));
// fail: two descending buzzy tones
wav('fail', gen(0.6, (t) => {
  const f0 = t < 0.25 ? 220 : 165;
  const s = Math.sign(Math.sin(2 * Math.PI * f0 * t)) * 0.5 + Math.sin(2 * Math.PI * f0 * t) * 0.5;
  const local = t < 0.25 ? t : t - 0.27;
  return t > 0.25 && t < 0.27 ? 0 : s * Math.exp(-local * 4) * Math.min(1, local * 200);
}));
console.log('sfx:', fs.readdirSync(dir).join(', '));
