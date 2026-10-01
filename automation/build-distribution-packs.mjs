import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const base=path.resolve('connect-demo');
const catalog=JSON.parse(readFileSync(path.join(base,'catalog.json'),'utf8'));
const output=path.join(base,'exports','generated');
mkdirSync(output,{recursive:true});
const records=[];
for(const offer of Object.values(catalog.offers)){
 if(offer.status!=='ACTIVE'||!offer.mandate_id)continue;
 const file=path.join(base,offer.fulfillment.path);
 if(!existsSync(file))throw Error('Missing deliverable '+offer.id);
 const price=(offer.price.unit_amount/100).toFixed(2);
 const slug=offer.id.replace(/[^a-z0-9-]/g,'');
 const content=['# '+offer.name,'','Status: DRAFT — NOT PUBLISHED','Canonical offer ID: '+offer.id,'Price: $'+price+' '+offer.price.currency.toUpperCase()+' (verify channel fees and final listing price)','Format: '+offer.fulfillment.content_type,'Source deliverable: '+offer.fulfillment.path,'','## Listing summary',offer.description,'','## Customer-facing headline',offer.acquisition.headline,'','## Description',offer.acquisition.body,'','## Delivery','Digital file; disclose exact marketplace file type and fulfillment method before publishing.','No guaranteed business, revenue, ranking, security or performance outcome.','','## Prepublication checks','- [ ] Preview and QA the exact downloadable file','- [ ] Verify seller account and platform listing eligibility','- [ ] Confirm customer support, refund and licensing terms','- [ ] Check naming and rights clearance for any alternate brand','- [ ] Obtain owner approval for listing, final price and channel','- [ ] Use platform-owned checkout where required','- [ ] Record provider transaction ID, fees, refunds and fulfillment independently','','## Educational post draft',offer.acquisition.headline+' '+offer.description+' Learn more: https://mint-stripe-connect-v4-production.up.railway.app/offers?src=organic_'+slug,'','Do not publish or claim endorsements, testimonials, verified demand or sales without evidence.',''].join('\n');
 writeFileSync(path.join(output,slug+'.md'),content);
 records.push({offer_id:offer.id,file:'connect-demo/exports/generated/'+slug+'.md',state:'DRAFT_NOT_PUBLISHED',price_cents:offer.price.unit_amount});
}
writeFileSync(path.join(output,'manifest.json'),JSON.stringify({schema:'mint.distribution.pack.v1',state:'DRAFT_NOT_PUBLISHED',offers:records},null,2)+'\n');
console.log('Generated '+records.length+' offer-specific distribution packs; no external publishing.');
