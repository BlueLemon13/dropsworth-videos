// Generate an original background music track with ElevenLabs Music (commercial use on paid plans).
// usage: node tools/music.mjs <outName> <seconds> "<prompt>"
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, need} from './env.mjs';

const [name, secs, prompt] = process.argv.slice(2);
const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
  method: 'POST',
  headers: {'xi-api-key': need('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json'},
  body: JSON.stringify({prompt, music_length_ms: Number(secs) * 1000, force_instrumental: true}),
});
if (!r.ok) { console.log('music failed', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
const dir = path.join(ROOT, 'public/music');
fs.mkdirSync(dir, {recursive: true});
const out = path.join(dir, `${name}.mp3`);
fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
console.log('saved', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
