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

const SHOTS = ['opener', 'tired', 'working', 'phone', 'product', 'supercar', 'sales', 'penthouse', 'money', 'g-stores', 'g-score', 'g-trend', 'app-drop', 'app-demand', 'app-competition', 'app-supplier', 'app-score', 'app-tour', 'app-tabs', 'yacht', 'friends'];
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
  hook_text: z.array(z.string()).describe('Explainers only: the on-screen title over the first voiced shot, in normal capitals with punctuation. POV slots (A1, B1): ["F*ck it. Here is how you start AI dropshipping."]. Direct slots (A2, B2): ["Here is how you can start AI dropshipping."] (small wording variations ok, must contain "AI dropshipping"). Empty for sauce.'),
  intro_text: z.string().describe('POV slots (A1, B1) only: silent opening title over a clip of rich young friends with a Lamborghini, e.g. "POV: You and your friends got rich from AI dropshipping." Proper capitals and punctuation, must contain "AI dropshipping". Empty otherwise.'),
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
- TWO HOOK TYPES. POV slots A1 and B1: a silent intro clip (rich friends with a Lamborghini) shows intro_text ("POV: You and your friends got rich from AI dropshipping."), then a hard cut and the FIRST spoken line is "F*ck it. Here's how you start AI dropshipping." Direct slots A2 and B2: the FIRST spoken line is "Here's how you can start AI dropshipping." (optionally "...in three steps.").
- The FIRST spoken line's shot is ALWAYS "sales" (Shopify sales notifications on a phone), so it's instantly clear this is about making sales.
- ANY other line that mentions sales, orders, selling or making money (and isn't a step shown in the app) uses shot "sales".
- Right after the hook (and "save this"), ONE simple line with shot "app-tabs" (the 4 tabs of the app with a mouse pointing at each) that says these are the main parts of validating a product, e.g. "Every product comes down to four things: ^demand, competition, supplier, and the product score." Keep it super simple.
- Each step line is SHORT (max 16 words). Step 1 demand uses "app-demand" (only the demand graph with a steady-climb line): say you want a steady climb, not a spike. Competition: one short line. Easy to understand, not slow.
- Colour words: ^word = GREEN for good/winning words (profit, winning, growing, sales, money, scale); !word = RED for bad words (saturated, late, dead, losing, burn). 3-6 green and 1-3 red per explainer. Don't use *word in explainers.
- All b-roll is POV (first person): supercar = POV driving, penthouse = POV view from a penthouse, yacht = POV on a yacht/boat.
- 100% positive: NO sad, struggling, losing-money or "most beginners fail" beats. Confident how-to energy.
- Shots ONLY: sales, supercar, penthouse, yacht (mix them), app-drop/app-demand/app-competition/app-supplier/app-score (REAL Dropsworth app screens: find a product, demand chart, competition, supplier & profit, product score), and "working" at most ONCE. Nothing else.
Structure: a hook promising a how-to, "save this", 2-4 numbered steps where each step line uses the matching app-* shot so the viewer SEES Dropsworth doing it, then a short payoff line. 90-130 spoken words. Vary the angle between the 4 explainers (e.g. full 4-step validation, just reading demand properly, spotting saturated products with the competition step, the profit math with the supplier step).
SAUCE POSTS (owner, 2026-11-18): the goal is to sound WISE, like someone who learned the real lesson. Talk about VALIDATING products ("then i started validating"), not vague "checked demand". Name the unglamorous truth plainly (e.g. "the fees, refunds and chargebacks are the bit nobody talks about in dropshipping. i priced every one of my products with all these factors in mind first, and now i'm making 10k a month"). First person, lowercase, calm, ends on the result.
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
const EXPLAINER_SHOTS = new Set(['app-tabs', 'app-tour', 'sales', 'supercar', 'penthouse', 'yacht', 'working', 'app-drop', 'app-demand', 'app-competition', 'app-supplier', 'app-score']);
function slotHash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h; }
const DASH = /[–—]/g;
for (const v of plan.videos) {
  v.sauce_text = v.sauce_text.replace(DASH, ',').replace(/\s+-\s+/g, ', ').trim();
  for (const l of v.lines) l.text = l.text.replace(DASH, ',').replace(/\s+/g, ' ').trim();
  if (v.format !== 'sauce') {
    if (!v.lines.length) throw new Error(`${v.slot} has no lines`);
    // explainer rules (owner, 2026-11-16): two hook types, first voiced shot = Shopify sales, sales lines = sales shot
    const pov = v.slot[1] === '1';
    v.hook_type = pov ? 'pov' : 'direct';
    const SALES = /(sales?|sold|selling|orders?|revenue|money|profit)/i;
    let working = 0, alt = 0;
    v.lines.forEach((l, i) => {
      if (i === 0) { l.shot = 'sales'; return; }
      if (!l.shot.startsWith('app-') && SALES.test(l.text)) { l.shot = 'sales'; return; }
      if (!EXPLAINER_SHOTS.has(l.shot) || l.shot === 'friends' || (l.shot === 'working' && ++working > 1)) l.shot = ['penthouse', 'yacht', 'supercar'][alt++ % 3];
      if (l.shot === v.lines[i - 1].shot && !l.shot.startsWith('app-')) l.shot = l.shot === 'penthouse' ? 'yacht' : 'penthouse';
    });
    const first = pov ? "F*ck it. Here's how you start AI dropshipping." : "Here's how you can start AI dropshipping.";
    // ---- v5: fixed SHORT structure, no brand name, light wording variety ----
    const pick = (arr) => arr[(slotHash(v.slot + date) >>> 0) % arr.length];
    const L = [];
    L.push({shot: 'sales', step: 0, text: pov ? "F*ck=Fuck it. Here's how you start ^AI dropshipping." : "Here's how you can start ^AI dropshipping."});
    L.push({shot: 'contents', step: 0, text: pick(["First, you need to validate. This is the basic structure. ^Demand, competition, supplier.", "First, you validate. Here's the basic structure. ^Demand, competition, supplier."])});
    L.push({shot: 'demandline', step: 1, text: pick(["Demand. You want a steady line going up. That means the product is ^scaling, and people keep buying it.", "Demand. Look for a line that climbs steadily. That means it's ^scaling, and buyers keep coming back."])});
    L.push({shot: 'pov', step: 2, text: pick(["Competition. A product can sell like crazy, but if 65+=sixty_five_plus stores {pov} sell it, it's !saturated.", "Competition. High sales mean nothing if 65+=sixty_five_plus stores {pov} already sell it. That's !saturated."])});
    L.push({shot: 'pov', step: 3, text: pick(["Supplier. A good supplier {pov} means a good ^margin on every sale.", "Supplier. Find a solid supplier, {pov} so every sale leaves a real ^margin."])});
    L.push({shot: 'sales', step: 0, text: "If you made it this far, comment the hardest part of product research, {sales} and DM me ^VALIDATE for my full validation workflow."});
    v.lines = L;
    v.hook_text = [pov ? "F*ck it. Here\u2019s how you start AI dropshipping." : "Here\u2019s how you can start AI dropshipping."];
    if (false && (!/AI dropshipping/i.test(v.lines[0].text))) v.lines.unshift({shot: 'sales', step: 0, text: first.replace('AI dropshipping', '^AI dropshipping')});
    const fixCaps = (t) => t.replace(/ai dropshipping/gi, 'AI dropshipping').replace(/pov:?/i, 'POV:').replace(/^./, (c) => c.toUpperCase());
    v.intro_text = pov ? fixCaps(v.intro_text && /AI dropshipping/i.test(v.intro_text) ? v.intro_text : 'POV: You and your friends got rich from AI dropshipping.') : '';
    if (pov && !/[.!?]$/.test(v.intro_text)) v.intro_text += '.';
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
