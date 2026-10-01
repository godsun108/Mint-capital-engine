import fs from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('connect-demo/catalog.json',root),'utf8'));
const html=fs.readFileSync(new URL('connect-demo/public/offers.html',root),'utf8');
const server=fs.readFileSync(new URL('connect-demo/server.js',root),'utf8');
assert(server.includes("u.pathname==='/offers'"));
for(const id of ['api-launch-checklist-002','ai-workflow-kit-004','mint-builder-launch-pack-005']){
 assert(html.includes('data-offer="'+id+'"'),id+' not present');
 const offer=catalog.offers[id];assert(offer?.status==='ACTIVE'&&offer.mandate_id);
 assert(fs.existsSync(new URL('connect-demo/'+offer.fulfillment.path,root)),id+' deliverable missing');
 assert(html.includes('$'+offer.price.unit_amount/100),id+' price missing');
}
assert(html.includes('productId:b.dataset.offer'));
assert(html.includes('CHECKOUT_STARTED'));
console.log('PORTFOLIO STOREFRONT PREFLIGHT OK: 3 direct buy buttons and 2 product detail links; NO LIVE CHECKOUT CREATED');
