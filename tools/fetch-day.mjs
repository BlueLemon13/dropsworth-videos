// Morning: download the latest nightly run's locked videos, unlock them, and save them to
// E:\all dropsworth videos here\<date>\ (falls back to output/<date>/ if E: isn't plugged in).
// usage: node tools/fetch-day.mjs [runId]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT} from './env.mjs';
import {unlock} from './crypt.mjs';

const GH = process.env.GH_BIN || 'C:\\Program Files\\GitHub CLI\\gh.exe';
const REPO = 'BlueLemon13/dropsworth-videos';
const SAVE_ROOT = 'E:\\all dropsworth videos here';

let runId = process.argv[2];
if (!runId) {
  const runs = JSON.parse(execFileSync(GH, ['run', 'list', '--repo', REPO, '--workflow', 'nightly.yml', '--limit', '5', '--json', 'databaseId,status,conclusion,createdAt'], {encoding: 'utf8'}));
  const done = runs.find((r) => r.status === 'completed');
  if (!done) throw new Error('No finished nightly run yet');
  runId = String(done.databaseId);
  console.log(`latest run ${runId} (${done.conclusion}, ${done.createdAt})`);
}
const tmp = path.join(ROOT, 'cache', 'fetch', runId);
fs.rmSync(tmp, {recursive: true, force: true});
execFileSync(GH, ['run', 'download', runId, '--repo', REPO, '--name', 'videos', '--dir', tmp], {stdio: 'inherit'});

const found = [];
const walk = (d) => fs.readdirSync(d, {withFileTypes: true}).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.enc') && found.push(path.join(d, e.name))));
walk(tmp);
if (!found.length) throw new Error('No locked files in that run');
const date = found.map((f) => f.match(/\d{4}-\d{2}-\d{2}/)?.[0]).find(Boolean) || 'unknown-date';

// review area on the PC; E: only gets videos once they're posted (tools/save-posted.mjs, owner's folder layout)
const base = path.join(ROOT, 'output');
const dest = path.join(base, date);
fs.mkdirSync(dest, {recursive: true});
for (const f of found) {
  const name = path.basename(f).replace(/\.enc$/, '');
  unlock(f, path.join(dest, name));
  console.log('  saved', name);
}
console.log(`\n${found.length} files -> ${dest}`);
