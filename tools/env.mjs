// Load API keys. In the cloud (GitHub Actions) they come from encrypted secrets as env vars.
// Locally: project .env first, then the sibling dropshipping app's .env.local.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [path.join(ROOT, '.env'), path.join(ROOT, '..', 'dropshipping', '.env.local')];

for (const src of SOURCES) {
  if (!fs.existsSync(src)) continue;
  for (let line of fs.readFileSync(src, 'utf8').split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!(k in process.env)) process.env[k] = v;
  }
}

export const need = (k) => {
  if (!process.env[k]) throw new Error(`Missing ${k} in .env`);
  return process.env[k];
};
