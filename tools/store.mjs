// List every Pinterest actor on the Apify Store that mentions video / mp4 / media / download.
const seen = new Map();
for (const q of ['pinterest video', 'pinterest downloader', 'pinterest scraper', 'pinterest mp4', 'pinterest media']) {
  for (let offset = 0; offset < 200; offset += 100) {
    const r = await fetch(`https://api.apify.com/v2/store?search=${encodeURIComponent(q)}&limit=100&offset=${offset}`);
    const j = await r.json();
    const items = j.data?.items ?? [];
    for (const a of items) if (/pinterest/i.test(a.title + a.name + a.description)) seen.set(`${a.username}/${a.name}`, a);
    if (items.length < 100) break;
  }
}
const rows = [...seen.values()].map((a) => {
  const p = a.currentPricingInfo || {};
  let price = p.pricingModel || '?';
  if (p.pricePerUnitUsd && p.pricingModel !== 'FLAT_PRICE_PER_MONTH') price = `$${(p.pricePerUnitUsd * 1000).toFixed(2)}/1k ${p.unitName || ''}`;
  if (p.pricingModel === 'PAY_PER_EVENT') {
    const ev = Object.values(p.pricingPerEvent?.actorChargeEvents || {}).filter((e) => !/start/i.test(e.eventTitle)).map((e) => `${e.eventTitle}:$${(e.eventPriceUsd * 1000).toFixed(2)}/1k`);
    price = ev.join(', ') || price;
  }
  if (p.pricingModel === 'FLAT_PRICE_PER_MONTH') price = `$${p.pricePerUnitUsd}/mo`;
  const s = a.stats || {};
  return {
    id: `${a.username}/${a.name}`,
    video: /video|mp4|media|download/i.test(a.title + ' ' + a.description),
    users30: s.totalUsers30Days ?? 0,
    ok: s.publicActorRunStats30Days?.SUCCEEDED ?? 0,
    fail: s.publicActorRunStats30Days?.FAILED ?? 0,
    rating: a.actorReviewRating ?? '',
    modified: (a.modifiedAt || '').slice(0, 10),
    price,
  };
}).sort((a, b) => b.users30 - a.users30);
console.log(rows.length, 'pinterest actors;', rows.filter((r) => r.video).length, 'mention video/mp4/media/download');
for (const r of rows.filter((r) => r.video)) console.log([r.id, r.users30 + 'u', r.ok + 'ok/' + r.fail + 'fail', r.rating, r.modified, r.price].join(' | '));
