// Transcribe an audio file with ElevenLabs speech-to-text (word timings included).
// usage: node tools/transcribe.mjs <file> [out.json]
import fs from 'node:fs';
import path from 'node:path';
import {need} from './env.mjs';
const [file, out] = process.argv.slice(2);
const form = new FormData();
form.append('model_id', 'scribe_v1');
form.append('file', new Blob([fs.readFileSync(file)]), path.basename(file));
const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {method: 'POST', headers: {'xi-api-key': need('ELEVENLABS_API_KEY')}, body: form});
const txt = await r.text();
if (!r.ok) { console.log('STT failed', r.status, txt.slice(0, 300)); process.exit(1); }
const j = JSON.parse(txt);
if (out) fs.writeFileSync(out, JSON.stringify(j, null, 1));
const words = (j.words || []).filter((w) => w.type === 'word');
const dur = words.length ? words.at(-1).end : 0;
console.log(`duration ~${dur.toFixed(1)}s, ${words.length} words, ${(words.length / (dur || 1) * 60).toFixed(0)} wpm\n`);
// print as lines broken on pauses > 0.35s, with timestamps
let line = [], start = 0, prevEnd = 0;
for (const w of words) {
  if (line.length && w.start - prevEnd > 0.35) { console.log(`[${start.toFixed(1)}s] ${line.join(' ')}`); line = []; }
  if (!line.length) start = w.start;
  line.push(w.text);
  prevEnd = w.end;
}
if (line.length) console.log(`[${start.toFixed(1)}s] ${line.join(' ')}`);
