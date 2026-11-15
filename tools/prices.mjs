// Print current pricing for given actors. usage: node tools/prices.mjs user/name ...
import {need} from './env.mjs';
const H = {Authorization: `Bearer ${need('APIFY_TOKEN')}`};
for (const id of process.argv.slice(2)) {
  const a = (await (await fetch(`https://api.apify.com/v2/acts/${id.replace('/', '~')}`, {headers: H})).json()).data;
  const p = (a.pricingInfos ?? []).at(-1) ?? {};
  let out = p.pricingModel ?? 'free/usage';
  if (p.pricingModel === 'PAY_PER_EVENT') {
    out = Object.values(p.pricingPerEvent?.actorChargeEvents ?? {}).map((e) => {
      const price = e.eventPriceUsd ?? e.eventTieredPricingUsd?.FREE?.tieredEventPriceUsd ?? Object.values(e.eventTieredPricingUsd ?? {})[0]?.tieredEventPriceUsd;
      return `${e.eventTitle}: $${price != null ? (price * 1000).toFixed(2) : '?'}/1k`;
    }).join(' · ');
  } else if (p.pricePerUnitUsd) out = `$${(p.pricePerUnitUsd * 1000).toFixed(2)}/1k ${p.unitName ?? ''}`;
  console.log(`${id}\n   ${out}`);
}
