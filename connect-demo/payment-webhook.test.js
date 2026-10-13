import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import Stripe from 'stripe';
import {paymentWebhook,processPaymentEvent} from './payment-webhook.js';
function fixture(t){
 const root=mkdtempSync(path.join(os.tmpdir(),'mint-webhook-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(path.join(root,'deliverables'));writeFileSync(path.join(root,'deliverables','product.zip'),'fixture');
 const session={id:'cs_live_fixture',livemode:true,status:'complete',payment_status:'paid',amount_total:1900,currency:'usd',metadata:{mint_offer_id:'bundle',mint_mandate_id:'approved'}};
 const event={id:'evt_fixture',type:'checkout.session.completed',livemode:true,data:{object:{id:session.id}}};
 const offer={id:'bundle',status:'ACTIVE',type:'DIGITAL_DOWNLOAD',mandate_id:'approved',price:{unit_amount:1900,currency:'usd'},fulfillment:{kind:'FILE',path:'deliverables/product.zip'}};
 const stripe=new Stripe('sk_test_fixture');stripe.checkout.sessions.retrieve=async()=>session;
 return {session,event,offer,deps:{stripe,root,stateDir:root,findOffer:async()=>offer}};
}
test('paid duplicate/concurrent events create one readiness record, never a delivery receipt',async t=>{
 const {event,deps}=fixture(t);await Promise.all(Array.from({length:8},()=>processPaymentEvent(event,deps)));
 const files=readdirSync(path.join(deps.root,'payment-entitlements'));assert.equal(files.length,1);
 const r=JSON.parse(readFileSync(path.join(deps.root,'payment-entitlements',files[0])));assert.equal(r.state,'READY_FOR_DOWNLOAD');assert.equal(r.customerDeliveryVerified,false);
 assert.equal((await processPaymentEvent(event,deps)).idempotent,true);
});
test('simulated paid webhook produces a downloadable approved artifact without claiming delivery',async t=>{
 const {event,deps}=fixture(t);
 const result=await processPaymentEvent(event,deps);
 assert.equal(result.ready,true);
 const receipt=JSON.parse(readFileSync(path.join(deps.stateDir,'payment-entitlements',event.data.object.id+'.json'),'utf8'));
 assert.equal(receipt.paidVerified,true);
 assert.equal(receipt.customerDeliveryVerified,false);
 const {approvedArtifactPath}=await import('./artifact-path.js');
 const resolved=await approvedArtifactPath(deps.root,receipt.artifact);
 assert.equal(readFileSync(resolved,'utf8'),'fixture');
});
test('unpaid completion waits; asynchronous paid success becomes ready',async t=>{
 const {event,deps,session}=fixture(t);session.payment_status='unpaid';assert.deepEqual(await processPaymentEvent(event,deps),{pending:true});
 session.payment_status='paid';event.type='checkout.session.async_payment_succeeded';assert.equal((await processPaymentEvent(event,deps)).ready,true);
});
for(const variant of ['amount','currency','mode','mandate','artifact','storage','physical'])test('rejects '+variant,async t=>{
 const {event,deps,session,offer}=fixture(t);
 if(variant==='amount')session.amount_total=1;if(variant==='currency')session.currency='eur';if(variant==='mode')event.livemode=false;
 if(variant==='mandate')session.metadata.mint_mandate_id='wrong';if(variant==='artifact')offer.fulfillment.path='missing.zip';if(variant==='storage')deps.stateDir='';if(variant==='physical')offer.fulfillment.kind='PRINTFUL_POD';
 await assert.rejects(processPaymentEvent(event,deps));
});
test('real SDK signature verification accepts valid payload and rejects forgery/stale timestamp',async t=>{
 const {event,deps}=fixture(t);const secret='whsec_local_fixture_only';const payload=JSON.stringify(event);
 async function call(sig){const req=Readable.from([Buffer.from(payload)]);req.headers={'stripe-signature':sig};let code,body;await paymentWebhook(req,{writeHead:c=>code=c,end:b=>body=JSON.parse(b)},{...deps,secret});return {code,body};}
 assert.equal((await call('bad')).code,400);
 assert.equal((await call(deps.stripe.webhooks.generateTestHeaderString({payload,secret,timestamp:1}))).code,400);
 assert.equal((await call(deps.stripe.webhooks.generateTestHeaderString({payload,secret}))).code,200);
});
test('webhook rejects a symlink artifact escaping deliverables',async t=>{
 const {event,deps,offer}=fixture(t);
 writeFileSync(path.join(deps.root,'outside.txt'),'private');
 const {symlinkSync}=await import('node:fs');
 symlinkSync(path.join(deps.root,'outside.txt'),path.join(deps.root,'deliverables','escape.txt'));
 offer.fulfillment.path='deliverables/escape.txt';
 await assert.rejects(processPaymentEvent(event,deps));
 assert.equal(readdirSync(deps.root).includes('payment-entitlements'),false);
});
test('webhook rejects inactive catalog offer',async t=>{
 const {event,deps,offer}=fixture(t);
 offer.status='STAGED';
 await assert.rejects(processPaymentEvent(event,deps));
 assert.equal(readdirSync(deps.root).includes('payment-entitlements'),false);
});
test('test payment does not create live entitlement',async t=>{const {event,deps,session}=fixture(t);session.livemode=event.livemode=false;assert.equal((await processPaymentEvent(event,deps)).ignored,true);});
