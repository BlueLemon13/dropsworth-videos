// Print the input fields of Apify actors. usage: node tools/schema.mjs user/name user/name ...
import {need} from './env.mjs';
const H = {Authorization: `Bearer ${need('APIFY_TOKEN')}`};
for (const id of process.argv.slice(2)) {
  try {
    const a = (await (await fetch(`https://api.apify.com/v2/acts/${id.replace('/', '~')}`, {headers: H})).json()).data;
    const build = a.taggedBuilds?.latest?.buildId;
    const b = (await (await fetch(`https://api.apify.com/v2/actor-builds/${build}`, {headers: H})).json()).data;
    const schema = typeof b.inputSchema === 'string' ? JSON.parse(b.inputSchema) : b.inputSchema;
    const props = Object.entries(schema?.properties ?? {}).map(([k, v]) => {
      const extra = v.enum ? `[${v.enum.join('|')}]` : v.default !== undefined ? `=${JSON.stringify(v.default).slice(0, 40)}` : '';
      return `${k}:${v.type}${extra}`;
    });
    console.log(`\n${id}  (modified ${a.modifiedAt?.slice(0, 10)})\n  ${props.join('\n  ')}`);
  } catch (e) { console.log(`\n${id}: ${e.message}`); }
}
