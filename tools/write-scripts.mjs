// Nightly script writer: Claude writes the day's 6 videos as structured JSON.
// Reads BRIEF.md, STYLE.md, CONTENT_PLAN.md, approved example scripts, recent topics (state/used.json)
// and the owner's notes (notes.md). Writes output/<date>/plan.json.
// usage: node tools/write-scripts.mjs [YYYY-MM-DD]
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import {z} from 'zod';
import {zodOutputFormat} from '@anthropic-ai/sdk/helpers/zod';
import {ROOT, need} from './env.mjs';

const MODEL = process.env.SCRIPT_MODEL || 'claude-haiku-5-5'; // owner chose the cheapest model
const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const read = (p) => (fs.existsSync(path.join(ROOT, p)) ? fs.readFileSync(path.join(ROOT, p), 'utf8') : '');

const SHOTS = ['opener', 'tired', 'working', 'phone', 'product', 'supercar', 'sales', 'penthouse', 'money', 'g-stores', 'g-score', 'g-trend'];
const Line = z.object({
  shot: z.enum(SHOTS),
  step: z.number().int().describe('Step number 1-5 for the line that starts a step in a steps video; 0 otherwise'),
  text: z.string().describe('One spoken sentence or two, with *BIG / ^BLUE markup and display=spoken_words for numbers'),
});
const Video = z.object({
  slot: z.enum(['A1', 'A2', 'A3', 'B1', 'B2', 'B3']),
  format: z.enum(['explainer', 'steps', 'sauce']),
  topic: z.string(),
  hook_style: z.string(),
  lines: z.array(Line).describe('Voiced formats only (empty for sauce). Do NOT include the CTA, it is appended automatically.'),
  sauce_text: z.string().describe('Sauce posts only (empty otherwise)'),
  caption: z.string().describe('TikTok caption, 1-2 short lines, no hashtags'),
  hashtags: z.array(z.string()),
});
const Plan = z.object({videos: z.array(Video)});

const used = JSON.parse(read('state/used.json') || '{"topics":[]}');
const recent = used.topics.filter((t) => (Date.parse(date) - Date.parse(t.date)) / 864e5 < 14).map((t) => `${t.date} ${t.slot}: ${t.topic} (hook: ${t.hook})`);
const examples = ['scripts/f1-explainer.spec.json', 'scripts/f4-steps.spec.json'].map((f) => {
  const s = JSON.parse(read(f));
  return `--- ${f}\n` + s.lines.map((l) => l.replace(/\[[^\]]*\]\s*/g, '')).join('\n');
}).join('\n\n');

const system = `You write short-form TikTok scripts for Dropsworth. Follow the brief, style guide and content plan exactly.

${read('BRIEF.md')}

${read('STYLE.md')}

${read('CONTENT_PLAN.md')}

# Approved example scripts (spoken lines; copy the pacing and punch)
${examples}

# Markup for spoken text
- *WORD = big emphasis word on screen; ^WORD = big + blue (use 1-3 per video, for the key payoff words); !WORD = big + red (for losses).
- Numbers/symbols: write display=spoken_words with underscores, e.g. ^$500=five_hundred_dollars, 3x=three_x. No spaces inside a token.
- 2-4 big words per explainer, more for steps. Never mark small words like "the".

# Shots (pick by MEANING, per the style guide)
opener = a person with a car/penthouse/computer (MUST be the first line of every voiced video)
tired = struggling guy at laptop · working = guy at computer · phone = scrolling TikTok · product = real viral product
supercar = winners · sales = Shopify sales notifications · penthouse = made it · money = cash
g-stores = graphic: hundreds of stores selling the same product · g-score = graphic: demand/margin/competition scorecard (use only when the line says those three words) · g-trend = graphic: slow climb vs crashed spike
Use graphics at most twice per video. Change shot every line or two; never the same shot twice in a row.`;

const notes = read('notes.md').trim();
const user = `Write tomorrow's 6 videos for ${date}: slots A1 A2 A3 B1 B2 B3, formats per the daily mix (A1/B1 explainer, A2/B2 steps, A3/B3 sauce).
Topics used in the last 14 days (do NOT repeat these topics or hooks):
${recent.length ? recent.join('\n') : '(none yet)'}
${notes ? `\nOwner's notes for this batch (follow them):\n${notes}` : ''}
Account A and B must have different topics. Every voiced video's first line uses shot "opener". Steps videos put "supercar" shots between steps and set step numbers on the line that starts each step. Do not write the CTA.`;

const client = new Anthropic({apiKey: need('ANTHROPIC_API_KEY')});
// Low effort: script writing doesn't need deep reasoning, and thinking tokens were eating the output budget.
let res, plan;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    res = await client.messages.parse({
      model: MODEL,
      max_tokens: 20000,
      system,
      messages: [{role: 'user', content: user}],
      output_config: {effort: 'low', format: zodOutputFormat(Plan)},
    });
    if (res.stop_reason === 'refusal') throw new Error('Model declined: ' + JSON.stringify(res.stop_details));
    plan = res.parsed_output;
    if (!plan) throw new Error('Could not parse plan (stop_reason ' + res.stop_reason + ')');
    break;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw e;
    console.log(`script attempt ${attempt} failed: ${String(e.message).slice(0, 160)}`);
    if (attempt === 3) throw e;
  }
}

// ---- validation / clean-up (never trust, always fix) ----
const DASH = /[–—]/g;
for (const v of plan.videos) {
  v.sauce_text = v.sauce_text.replace(DASH, ',').replace(/\s+-\s+/g, ', ').trim();
  for (const l of v.lines) l.text = l.text.replace(DASH, ',').replace(/\s+/g, ' ').trim();
  if (v.format !== 'sauce') {
    if (!v.lines.length) throw new Error(`${v.slot} has no lines`);
    v.lines[0].shot = 'opener';
    for (let i = 1; i < v.lines.length; i++) if (v.lines[i].shot === v.lines[i - 1].shot && !v.lines[i].step) v.lines[i].shot = v.lines[i].shot === 'working' ? 'supercar' : 'working';
  } else if (!v.sauce_text) throw new Error(`${v.slot} sauce has no text`);
  v.hashtags = v.hashtags.map((h) => '#' + h.replace(/^#+/, '').replace(/\s+/g, '')).slice(0, 6);
}
const slots = plan.videos.map((v) => v.slot).sort().join(',');
if (slots !== 'A1,A2,A3,B1,B2,B3') throw new Error('Wrong slots: ' + slots);

const outDir = path.join(ROOT, 'output', date);
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify({date, model: MODEL, usage: res.usage, ...plan}, null, 2));
const u = res.usage;
console.log(`plan written: ${plan.videos.map((v) => `${v.slot}:${v.format}`).join(' ')}  (${u.input_tokens} in / ${u.output_tokens} out tokens)`);
