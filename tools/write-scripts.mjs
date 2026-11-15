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

const SHOTS = ['opener', 'tired', 'working', 'phone', 'product', 'supercar', 'sales', 'penthouse', 'money', 'g-stores', 'g-score', 'g-trend', 'app-drop', 'app-demand', 'app-competition', 'app-supplier'];
const SLOTS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
const FORMAT_OF = (slot) => (slot[1] === '1' || slot[1] === '2' ? 'explainer' : 'sauce');
const Line = z.object({
  shot: z.enum(SHOTS),
  step: z.number().int().describe('Step number 1-5 on the line that starts a step; 0 otherwise'),
  text: z.string().describe('One spoken sentence or two, with *BIG / ^BLUE markup and display=spoken_words for numbers'),
});
const Video = z.object({
  slot: z.enum(SLOTS),
  format: z.enum(['explainer', 'sauce']),
  topic: z.string(),
  hook_style: z.string(),
  hook_text: z.array(z.string()).describe('Explainers only: 1-2 short lowercase on-screen hook lines shown over the opening supercar, e.g. ["the first step to ai dropshipping", "age 16 - 29"]. Empty for sauce.'),
  lines: z.array(Line).describe('Voiced formats only (empty for sauce). Do NOT include the CTA, it is appended automatically.'),
  sauce_text: z.string().describe('Sauce posts only (empty otherwise)'),
  caption: z.string().describe('TikTok caption, 1-2 short lines, no hashtags'),
  hashtags: z.array(z.string()),
});
const Plan = z.object({videos: z.array(Video)});

const used = JSON.parse(read('state/used.json') || '{"topics":[]}');
const recent = used.topics.filter((t) => (Date.parse(date) - Date.parse(t.date)) / 864e5 < 14).map((t) => `${t.date} ${t.slot}: ${t.topic} (hook: ${t.hook})`);
const examples = ['scripts/f5-guide.spec.json', 'scripts/f4-steps.spec.json'].map((f) => {
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
app-drop / app-demand / app-competition / app-supplier = the REAL Dropsworth app showing that step (dropping in a TikTok link; daily sales + demand score; competitor stores + their top ads; supplier prices + profit per sale). Use these for the step lines of every explainer.
g-stores = graphic: hundreds of stores selling the same product · g-score = graphic: demand/margin/competition scorecard (use only when the line says those three words) · g-trend = graphic: slow climb vs crashed spike
Use graphics at most twice per video. Change shot every line or two; never the same shot twice in a row.`;

const notes = read('notes.md').trim();
const user = `Write tomorrow's 8 videos for ${date}: slots A1 A2 A3 A4 B1 B2 B3 B4. A1, A2, B1, B2 are explainers; A3, A4, B3, B4 are sauce posts.
Explainers are STEP-BY-STEP GUIDES (like scripts/f5-guide), never "judging" videos. OWNER'S RULES FOR EVERY EXPLAINER:
- Opens on a SUPERCAR (first line shot "supercar") with hook_text on screen, e.g. ["the first step to ai dropshipping", "age 16 - 29"], ["how to find a winning product", "beginners only"], ["the 4 step validation method", "save this"].
- 100% positive: NO sad, struggling, losing-money or "most beginners fail" beats. Confident how-to energy.
- Shots ONLY: supercar, penthouse (use lots), app-drop/app-demand/app-competition/app-supplier (the real Dropsworth app for each step), and "working" at most ONCE. Nothing else.
Structure: a hook promising a how-to, "save this", 2-4 numbered steps where each step line uses the matching app-* shot so the viewer SEES Dropsworth doing it, then a short payoff line. 90-130 spoken words. Vary the angle between the 4 explainers (e.g. full 4-step validation, just reading demand properly, spotting saturated products with the competition step, the profit math with the supplier step).
Topics used in the last 14 days (do NOT repeat these topics or hooks):
${recent.length ? recent.join('\n') : '(none yet)'}
${notes ? `\nOwner's notes for this batch (follow them):\n${notes}` : ''}
Account A and B must have different topics. Every voiced video's first line uses shot "opener". Set step numbers on the line that starts each step. Do not write the CTA.`;

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
const EXPLAINER_SHOTS = new Set(['supercar', 'penthouse', 'working', 'sales', 'app-drop', 'app-demand', 'app-competition', 'app-supplier']);
const DASH = /[–—]/g;
for (const v of plan.videos) {
  v.sauce_text = v.sauce_text.replace(DASH, ',').replace(/\s+-\s+/g, ', ').trim();
  for (const l of v.lines) l.text = l.text.replace(DASH, ',').replace(/\s+/g, ' ').trim();
  if (v.format !== 'sauce') {
    if (!v.lines.length) throw new Error(`${v.slot} has no lines`);
    // explainer rules: supercar hook, only allowed shots, "working" at most once, alternate supercar/penthouse otherwise
    let working = 0, alt = 0;
    v.lines.forEach((l, i) => {
      if (i === 0) { l.shot = 'supercar'; return; }
      if (!EXPLAINER_SHOTS.has(l.shot) || (l.shot === 'working' && ++working > 1)) l.shot = alt++ % 2 ? 'supercar' : 'penthouse';
      if (l.shot === v.lines[i - 1].shot && !l.shot.startsWith('app-')) l.shot = l.shot === 'penthouse' ? 'supercar' : 'penthouse';
    });
    v.hook_text = (v.hook_text || []).map((h) => h.replace(DASH, '-').toLowerCase().trim()).filter(Boolean).slice(0, 2);
    if (!v.hook_text.length) v.hook_text = ['the first step to ai dropshipping'];
  } else if (!v.sauce_text) throw new Error(`${v.slot} sauce has no text`);
  v.hashtags = v.hashtags.map((h) => '#' + h.replace(/^#+/, '').replace(/\s+/g, '')).slice(0, 6);
}
for (const v of plan.videos) v.format = FORMAT_OF(v.slot);
const slots = plan.videos.map((v) => v.slot).sort().join(',');
if (slots !== SLOTS.join(',')) throw new Error('Wrong slots: ' + slots);

const outDir = path.join(ROOT, 'output', date);
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify({date, model: MODEL, usage: res.usage, ...plan}, null, 2));
const u = res.usage;
console.log(`plan written: ${plan.videos.map((v) => `${v.slot}:${v.format}`).join(' ')}  (${u.input_tokens} in / ${u.output_tokens} out tokens)`);
