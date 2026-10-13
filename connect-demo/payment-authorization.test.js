import test from 'node:test';
import assert from 'node:assert/strict';
import {isApprovedLivePurchase} from './payment-authorization.js';

const offer={id:'kit',status:'ACTIVE',type:'DIGITAL_DOWNLOAD',mandate_id:'mandate:approved',price:{unit_amount:1900,currency:'usd'},fulfillment:{kind:'FILE'}};
const session={livemode:true,status:'complete',payment_status:'paid',amount_total:1900,currency:'usd',metadata:{mint_offer_id:'kit',mint_mandate_id:'mandate:approved'}};
test('approved live purchase passes',()=>assert.equal(isApprovedLivePurchase(session,offer),true));
const mutations=[
 ['unpaid',s=>s.payment_status='unpaid'],
 ['incomplete',s=>s.status='open'],
 ['test mode',s=>s.livemode=false],
 ['wrong price',s=>s.amount_total=900],
 ['wrong currency',s=>s.currency='eur'],
 ['wrong offer',s=>s.metadata.mint_offer_id='other'],
 ['wrong mandate',s=>s.metadata.mint_mandate_id='wrong']
];
for(const [name,mutate] of mutations)test('rejects '+name,()=>{
 const s=structuredClone(session);mutate(s);
 assert.equal(isApprovedLivePurchase(s,offer),false);
});
for(const [name,mutate] of [
 ['inactive offer',o=>o.status='STAGED'],
 ['physical product',o=>o.type='PHYSICAL'],
 ['wrong fulfillment',o=>o.fulfillment.kind='PRINTFUL_POD'],
 ['missing mandate',o=>delete o.mandate_id]
])test('rejects '+name,()=>{
 const o=structuredClone(offer);mutate(o);
 assert.equal(isApprovedLivePurchase(session,o),false);
});
