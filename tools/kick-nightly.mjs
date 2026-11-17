// Backup for GitHub's unreliable cron (scheduled runs have fired ~9h late or not at all).
// Run by Windows Task Scheduler at night: if today's batch isn't made and no run is going, start one.
// usage: node tools/kick-nightly.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT} from './env.mjs';

const GH = process.env.GH_BIN || 'C:\\Program Files\\GitHub CLI\\gh.exe';
const REPO = 'BlueLemon13/dropsworth-videos';
const log = (m) => fs.appendFileSync(path.join(ROOT, 'cache', 'kick.log'), `${new Date().toISOString()} ${m}\n`);
fs.mkdirSync(path.join(ROOT, 'cache'), {recursive: true});

const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Australia/Sydney'}).format(new Date());
const gh = (args) => execFileSync(GH, args, {encoding: 'utf8'});
try {
  const last = Buffer.from(JSON.parse(gh(['api', `repos/${REPO}/contents/state/last_batch.txt`])).content, 'base64').toString().trim();
  if (last === today) { log(`batch for ${today} already made`); process.exit(0); }
  const running = JSON.parse(gh(['run', 'list', '--repo', REPO, '--workflow', 'nightly.yml', '--limit', '5', '--json', 'status']))
    .some((r) => r.status === 'in_progress' || r.status === 'queued');
  if (running) { log('a run is already going'); process.exit(0); }
  gh(['workflow', 'run', 'nightly.yml', '--repo', REPO]);
  log(`started run for ${today} (last batch was ${last})`);
} catch (e) {
  log('error: ' + e.message.split('\n')[0]);
  process.exit(1);
}
