// Check the Anthropic API key works and has credit (one tiny Haiku call, ~$0.0001).
import {need} from './env.mjs';
const r = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {'x-api-key': need('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
  body: JSON.stringify({model: 'claude-haiku-5-5', max_tokens: 16, messages: [{role: 'user', content: 'Reply with the word OK.'}]}),
});
const j = await r.json();
if (r.ok) console.log('Key works ✓  model:', j.model, ' reply:', j.content?.find((b) => b.type === 'text')?.text);
else console.log('Key problem:', r.status, j.error?.type, '-', j.error?.message?.slice(0, 160));
