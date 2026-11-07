import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {recordSession,confirmSettlement,observerProjection,readEvidence,evidencePath} from './settlement-evidence.js';

function tmp(){const d=mkdtempSync(path.join(tmpdir(),'mint-settle-'));return {dir:d,cleanup:()=>rmSync(d,{recursive:true,force:true})};}
const paid=at=>({sessionId:'cs_test_1',offerId:'ai-workflow-kit-004',amountTotal:2900,currency:'usd',livemode:false,state:'PAID_PROVIDER_AVAILABLE',balanceTransaction:{id:'txn_1',status:'available'},chargeId:'ch_1',at});

test('records paid provider-available evidence without marking settled',()=>{
 const {dir,cleanup}=tmp();try{
  const r=recordSession(dir,paid());
  assert.equal(r.recorded,true);
  const ledger=readEvidence(dir);
  const s=ledger.sessions['cs_test_1'];
  assert.equal(s.state,'PAID_PROVIDER_AVAILABLE');
  assert.equal(s.settled,false,'availability alone must never equal settled');
  assert.match(s.settledDefinition,/destination-cash/);
 }finally{cleanup()}
});

test('duplicate and stale transitions are no-ops; refunds are terminal',()=>{
 const {dir,cleanup}=tmp();try{
  recordSession(dir,paid());
  assert.equal(recordSession(dir,paid()).reason,'duplicate');
  assert.equal(recordSession(dir,{...paid(),state:'PAID_PENDING'}).reason,'stale_transition_ignored');
  // valid forward transition pending->available
  recordSession(dir,{sessionId:'cs_2',offerId:'o',amountTotal:100,currency:'usd',livemode:false,state:'PAID_PENDING'});
  const up=recordSession(dir,{sessionId:'cs_2',offerId:'o',amountTotal:100,currency:'usd',livemode:false,state:'PAID_PROVIDER_AVAILABLE'});
  assert.equal(up.recorded,true);
  // refund is terminal
  assert.equal(recordSession(dir,{sessionId:'cs_2',offerId:'o',amountTotal:100,currency:'usd',livemode:false,state:'REFUNDED'}).recorded,true);
  assert.equal(recordSession(dir,{sessionId:'cs_2',offerId:'o',amountTotal:100,currency:'usd',livemode:false,state:'PAID_PROVIDER_AVAILABLE'}).reason,'terminal_refunded');
 }finally{cleanup()}
});

test('settlement requires prior provider availability and independent evidence ref',()=>{
 const {dir,cleanup}=tmp();try{
  assert.equal(confirmSettlement(dir,{sessionId:'nope',destinationEvidenceRef:'bank-line-1'}).reason,'unknown_session');
  recordSession(dir,{sessionId:'cs_p',offerId:'o',amountTotal:100,currency:'usd',livemode:false,state:'PAID_PENDING'});
  assert.equal(confirmSettlement(dir,{sessionId:'cs_p',destinationEvidenceRef:'bank-line-1'}).reason,'not_provider_available');
  recordSession(dir,paid());
  assert.equal(confirmSettlement(dir,{sessionId:'cs_test_1',destinationEvidenceRef:null}).reason,'destination_evidence_ref_required');
  const ok=confirmSettlement(dir,{sessionId:'cs_test_1',destinationEvidenceRef:'bank-statement-2026-11#line-42'});
  assert.equal(ok.confirmed,true);
  assert.equal(confirmSettlement(dir,{sessionId:'cs_test_1',destinationEvidenceRef:'bank-statement-2026-11#line-42'}).reason,'already_settled');
  assert.equal(readEvidence(dir).sessions['cs_test_1'].settled,true);
 }finally{cleanup()}
});

test('observer projection feeds observe-commerce exactly, settled USD only when confirmed',()=>{
 const {dir,cleanup}=tmp();try{
  recordSession(dir,paid()); // $29.00 available, NOT settled
  recordSession(dir,{sessionId:'cs_3',offerId:'ai-workflow-kit-004',amountTotal:1900,currency:'usd',livemode:false,state:'PAID_PENDING'});
  let p=observerProjection(dir);
  assert.equal(p.transactions.length,2);
  const offer=p.offers['ai-workflow-kit-004'];
  assert.equal(offer.paid,2);assert.equal(offer.providerAvailable,1);
  assert.equal(offer.settledNetUsd,0,'no settlement confirmation, no settled USD');
  confirmSettlement(dir,{sessionId:'cs_test_1',destinationEvidenceRef:'bank-line-9'});
  p=observerProjection(dir);
  assert.equal(p.offers['ai-workflow-kit-004'].settledNetUsd,29,'first settled dollar');
  // non-USD never invents a USD number
  recordSession(dir,{sessionId:'cs_4',offerId:'o2',amountTotal:5000,currency:'eur',livemode:false,state:'PAID_PROVIDER_AVAILABLE'});
  confirmSettlement(dir,{sessionId:'cs_4',destinationEvidenceRef:'bank-line-10'});
  assert.equal(observerProjection(dir).offers.o2.settledNetUsd,0);
 }finally{cleanup()}
});

test('ledger is durable, atomic and never contains PII or locators beyond ids',()=>{
 const {dir,cleanup}=tmp();try{
  recordSession(dir,paid());
  const raw=readFileSync(evidencePath(dir),'utf8');
  assert.ok(!existsSync(evidencePath(dir)+'.tmp'),'atomic rename leaves no temp file');
  for(const forbidden of ['email','customer_name','address','phone'])assert.ok(!raw.toLowerCase().includes(forbidden),'no PII field: '+forbidden);
  assert.equal(JSON.parse(raw).schema,'mint.settlement.evidence.v1');
 }finally{cleanup()}
});
