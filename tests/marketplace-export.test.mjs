import fs from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const catalog=read('connect-demo/catalog.json');
const exportPlan=read('connect-demo/marketplace-export.json');
assert.equal(exportPlan.schema,'mint.marketplace.export.v1');
assert.equal(exportPlan.status,'PREPARED_NOT_PUBLISHED');
const offer=catalog.offers[exportPlan.canonical_offer_id];
assert(offer&&offer.status==='ACTIVE'&&offer.mandate_id);
assert.equal(offer.price.unit_amount,500);
assert(fs.existsSync(new URL('connect-demo/'+offer.fulfillment.path,root)));
assert(exportPlan.channels.every(c=>c.id==='mint-direct'||!c.state.includes('PUBLISHED')));
assert(exportPlan.publishing_requires.includes('owner_channel_approval'));
for(const channel of exportPlan.channels)if(channel.export)assert(fs.existsSync(new URL('connect-demo/'+channel.export,root)));
const brands=read('connect-demo/brand-registry.json');
assert.equal(brands.schema,'mint.portfolio.brands.v1');
assert.equal(brands.status,'INTERNAL_HYPOTHESES_NOT_CLEARED');
assert.equal(new Set(brands.brands.map(b=>b.id)).size,brands.brands.length);
for(const brand of brands.brands){
 assert(brand.id&&brand.display_name&&brand.state);
 for(const id of brand.offers)assert(catalog.offers[id],`Unknown canonical offer ${id} for brand ${brand.id}`);
}
assert(brands.rules.public_rebrand_requires.includes('owner_approval'));
assert.deepEqual(brands.rules.sales_dedupe,['provider','provider_transaction_id']);
console.log('MARKETPLACE EXPORT PREFLIGHT OK (NO EXTERNAL PUBLISHING)');
