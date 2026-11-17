// Build the 4 explainers from the owner's own Pinterest saves (public/bvideo/mine), owner's latest rules.
// usage: node tools/make-mine.mjs [1,2,3,4]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT} from './env.mjs';

const ID = {
  key: '1089589703636819229', balcony: '1089589703636819493', urus: '1089589703636819557', heli: '1089589703636819701',
  wheel: '1089589703636819757', jet: '1089589703636819778', redcar: '1089589703636820013',
  phoneA: '1089589703636819985', phoneB: '1089589703636819880', phoneC: '1089589703636820004', phoneD: '1089589703636819616', phoneE: '1089589703636819643',
};
const V = (k, extra = '') => `[vid:mine/${ID[k]}.mp4 grade=bright${extra}]`;
const bg = (k) => `bgvid=mine/${ID[k]}.mp4`;
const enc = (s) => s.replace(/\s+/g, '_');
const AGE = 'Age 14 - 25';
const CTA_TXT = enc('Comment what the hardest step of validating is for you, and DM me "VALIDATE".') + '|' + enc("I'll be happy to send over my validation workflow.");
const CTA = (k) => `${V(k, ` step=0 cap=none card=1 hook=${CTA_TXT}`)} Comment what the hardest step of validating is for you, and DM me ^VALIDATE. I'll be happy to send over my validation workflow.`;

const videos = [
  {n: 1, pov: true, intro: 'key', hook: 'phoneA', contents: 'wheel', demand: 'balcony', comp: ['wheel', 'heli'], sup: ['urus', 'jet'], cta: 'phoneC',
    lines: {contents: 'Start with product research, and validating your product. This includes ^demand, competition, and supplier.', demand: 'Demand. This shows how many sell every day. If the line keeps going up, the product is ^scaling.', comp: ['Competition. A product can sell like crazy, but if 65+=sixty_five_plus stores', "sell it, it's !saturated."], sup: ['Supplier. A good supplier means a', 'good ^margin on every sale.']}},
  {n: 2, pov: false, hook: 'phoneB', contents: 'jet', demand: 'redcar', comp: ['redcar', 'balcony'], sup: ['key', 'heli'], cta: 'phoneE',
    lines: {contents: 'Start with product research, and validating your product. This includes ^demand, competition, and supplier.', demand: 'Demand. Every bar is how many sold that day. A line that keeps climbing means it is ^scaling.', comp: ['Competition. High sales mean nothing if 65+=sixty_five_plus stores', "already sell it. That's !saturated."], sup: ['Supplier. Find a solid supplier,', 'so every sale leaves a real ^margin.']}},
  {n: 3, pov: true, intro: 'urus', hook: 'phoneD', contents: 'heli', demand: 'jet', comp: ['jet', 'key'], sup: ['wheel', 'redcar'], cta: 'phoneB',
    lines: {contents: 'Start with product research, and validating your product. This includes ^demand, competition, and supplier.', demand: 'Demand. This is daily sales. If it keeps going up week after week, the product is ^scaling.', comp: ['Competition. Even a best seller is a trap if 65+=sixty_five_plus stores', "are selling it. That's !saturated."], sup: ['Supplier. The right supplier gives you a', 'healthy ^margin on every single sale.']}},
  {n: 4, pov: false, hook: 'phoneC', contents: 'urus', demand: 'heli', comp: ['heli', 'wheel'], sup: ['balcony', 'jet'], cta: 'phoneA',
    lines: {contents: 'Start with product research, and validating your product. This includes ^demand, competition, and supplier.', demand: 'Demand. You are looking at sales every day. A line that keeps rising means it is ^scaling.', comp: ['Competition. If 65+=sixty_five_plus stores already sell it,', "it doesn't matter how well it sells. It's !saturated."], sup: ['Supplier. A good supplier is what gives you a', 'good ^margin on every sale.']}},
];

const only = (process.argv[2] || '1,2,3,4').split(',').map(Number);
const outDir = path.join(ROOT, 'output/mine');
fs.mkdirSync(outDir, {recursive: true});
for (const v of videos.filter((x) => only.includes(x.n))) {
  const L = v.lines;
  const hookLine = v.pov ? "F*ck=Fuck it. Here's how you start ^AI dropshipping." : "Here's how you can start ^AI dropshipping.";
  const hookCard = v.pov ? '' : ` cap=none hook=${enc("Here’s how you can start AI dropshipping.")}|${enc(AGE)}`;
  const lines = [
    `${V(v.hook, ` step=0${hookCard}`)} ${hookLine}`,
    `[g-contents ${bg(v.contents)} ticks=demand|competition|supplier] ${L.contents}`,
    `[g-demandsimple ${bg(v.demand)} step=1] ${L.demand}`,
    `${V(v.comp[0], ' step=2')} ${L.comp[0]} ${V(v.comp[1])} ${L.comp[1]}`,
    `${V(v.sup[0], ' step=3')} ${L.sup[0]} ${V(v.sup[1])} ${L.sup[1]}`,
    CTA(v.cta),
  ];
  const options = {sfx: 'minimal', tail: 0.15, voice: 'pNInz6obpgDQGcFmaJgB', speed: 1.1, stability: 0.6, style: 0.1};
  if (v.pov) options.intro = {visual: `vid:mine/${ID[v.intro]}.mp4`, seconds: 2.8, hook: ['POV: You make $15k a month with AI dropshipping the actual way.', AGE]};
  const spec = path.join(outDir, `explainer${v.n}.spec.json`);
  fs.writeFileSync(spec, JSON.stringify({name: `mine-explainer-${v.n}`, lines, options, props: {uniformText: true, softCuts: true}}, null, 2));
  execFileSync('node', ['tools/build.mjs', spec], {cwd: ROOT, stdio: 'inherit'});
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'Reel', path.join(outDir, `explainer${v.n}.mp4`), `--props=${spec.replace('.spec.json', '.props.json')}`, '--timeout=120000', '--log=error'], {cwd: ROOT, stdio: 'inherit', shell: true});
  console.log(`DONE explainer${v.n}`);
}
