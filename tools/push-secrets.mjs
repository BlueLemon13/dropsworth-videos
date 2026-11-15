// Copy API keys from the local env files into GitHub Actions secrets (encrypted).
// Values are piped to `gh secret set` over stdin and never printed.
// usage: node tools/push-secrets.mjs KEY1 KEY2 ...
import {spawnSync} from 'node:child_process';
import './env.mjs';

const GH = process.env.GH_BIN || 'C:\\Program Files\\GitHub CLI\\gh.exe';
for (const key of process.argv.slice(2)) {
  const value = process.env[key];
  if (!value) { console.log(`${key}: not found in env, skipped`); continue; }
  const r = spawnSync(GH, ['secret', 'set', key, '--repo', 'BlueLemon13/dropsworth-videos'], {input: value, encoding: 'utf8'});
  console.log(`${key}: ${r.status === 0 ? 'set ✓' : 'FAILED ' + (r.stderr || '').trim().slice(0, 120)}`);
}
