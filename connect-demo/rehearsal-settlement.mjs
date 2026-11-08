// MINT first-settled-dollar REHEARSAL — the full pipeline with a simulated
// Stripe layer, producing REAL durable evidence rows through the REAL
// settlement-evidence module and REAL observer projection. No network, no
// keys. The rehearsal proves the machinery; the live run replaces the stub.
import {recordSession,confirmSettlement,observerProjection,readEvidence,evidencePath} from "./settlement-evidence.js";
import {mkdtempSync,rmSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";

const stateDir=mkdtempSync(join(tmpdir(),"mint-rehearsal-"));
const out=[];
const step=(n,msg)=>{out.push(`${n}. ${msg}`);console.log(`${n}. ${msg}`)};

try{
 // 1. Buyer pays $29.00 for ai-workflow-kit-004 (Stripe test session paid,
 //    balance transaction still PENDING — provider has the money, bank doesn't).
 step(1,"Stripe: checkout session cs_test_rehearsal_001 PAID, balance txn pending");
 recordSession(stateDir,{
  sessionId:"cs_test_rehearsal_001",
  offerId:"ai-workflow-kit-004",
  amountTotal:2900,currency:"usd",livemode:false,
  state:"PAID_PENDING",
  balanceTransaction:{id:"txn_pending_1",status:"pending"},
  chargeId:"ch_rehearsal_1",
 });
 let ev=readEvidence(stateDir);
 assert.equal(ev.sessions["cs_test_rehearsal_001"].settled,false);
 assert.equal(ev.sessions["cs_test_rehearsal_001"].state,"PAID_PENDING");
 console.log("   → ledger row: settled=false (PAID != SETTLED holds) ✅");

 // 2. Stripe marks the balance transaction available (T+1 settlement batch).
 step(2,"Stripe: balance txn now available (provider-available)");
 recordSession(stateDir,{
  sessionId:"cs_test_rehearsal_001",
  offerId:"ai-workflow-kit-004",
  amountTotal:2900,currency:"usd",livemode:false,
  state:"PAID_PROVIDER_AVAILABLE",
  balanceTransaction:{id:"txn_pending_1",status:"available"},
  chargeId:"ch_rehearsal_1",
 });
 ev=readEvidence(stateDir);
 assert.equal(ev.sessions["cs_test_rehearsal_001"].settled,false,"availability is STILL not settled");
 assert.match(ev.sessions["cs_test_rehearsal_001"].providerAvailableAt,/\d{4}-\d{2}-\d{2}T/);
 console.log("   → ledger row: provider_available, settled=FALSE (PAID ≠ SETTLED still holds) ✅");

 // 3. Duplicate webhook arrives (Stripe retries). Must be a no-op.
 step(3,"Stripe: duplicate webhook delivery (retry)");
 const dup=recordSession(stateDir,{
  sessionId:"cs_test_rehearsal_001",
  offerId:"ai-workflow-kit-004",
  amountTotal:2900,currency:"usd",livemode:false,
  state:"PAID_PROVIDER_AVAILABLE",
  balanceTransaction:{id:"txn_pending_1",status:"available"},
  chargeId:"ch_rehearsal_1",
 });
 assert.equal(dup.recorded,false);assert.equal(dup.reason,"duplicate");
 console.log("   → idempotent: duplicate ignored ✅");

 // 4. Observer sees PAID but settledNetUsd = 0 (honesty enforced).
 step(4,"Observer run: sees 1 paid session, settledNetUsd = $0.00");
 let proj=observerProjection(stateDir);
 assert.equal(proj.transactions.length,1);
 assert.equal(proj.offers["ai-workflow-kit-004"].paid,1);
 assert.equal(proj.offers["ai-workflow-kit-004"].settledNetUsd,0,"no settlement evidence yet");
 console.log("   → projection: paid=1, settledNetUsd=0 ✅");

 // 5. Operator independently confirms destination cash (bank statement line).
 //    This is THE step that changes settledNetUsd. In live mode, the ref is the
 //    actual bank-statement line / transfer record the operator pulls by hand.
 step(5,"Operator: independently confirms destination cash (bank line ref)");
 const conf=confirmSettlement(stateDir,{
  sessionId:"cs_test_rehearsal_001",
  destinationEvidenceRef:"bank-statement-2026-11#debit-USD-28.10-payout-2026-11-08",
 });
 assert.equal(conf.confirmed,true);
 ev=readEvidence(stateDir);
 assert.equal(ev.sessions["cs_test_rehearsal_001"].settled,true);
 assert.match(ev.sessions["cs_test_rehearsal_001"].settledAt,/\d{4}-\d{2}-\d{2}T/);
 console.log("   → ledger row: settled=TRUE with destination evidence ref ✅");

 // 6. Observer now records the FIRST SETTLED DOLLAR.
 step(6,"Observer run: FIRST SETTLED DOLLAR recorded");
 proj=observerProjection(stateDir);
 assert.equal(proj.offers["ai-workflow-kit-004"].settledNetUsd,29);
 console.log("   → projection: settledNetUsd=$29.00 — first settled dollar PROVEN in rehearsal ✅");

 // 7. Double-confirmation attempt refused (idempotent settlement).
 step(7,"Operator: accidental duplicate confirmation attempt");
 const dupConf=confirmSettlement(stateDir,{sessionId:"cs_test_rehearsal_001",destinationEvidenceRef:"bank-statement-2026-11#again"});
 assert.equal(dupConf.confirmed,false);assert.equal(dupConf.reason,"already_settled");
 console.log("   → refused: already_settled ✅");

 // 8. Second offer, different currency: never invents a USD number.
 step(8,"EUR offer settles: USD projection must remain $29.00 (no invented conversion)");
 recordSession(stateDir,{sessionId:"cs_test_rehearsal_002",offerId:"eu-kit",amountTotal:2500,currency:"eur",livemode:false,state:"PAID_PROVIDER_AVAILABLE"});
 confirmSettlement(stateDir,{sessionId:"cs_test_rehearsal_002",destinationEvidenceRef:"bank-statement-eu#line-3"});
 proj=observerProjection(stateDir);
 assert.equal(proj.offers["eu-kit"].settledNetUsd,0,"EUR never invents USD");
 console.log("   → EUR settled row exists, USD math untouched ✅");

 // 9. Refund terminality: refunded session can't resurrect.
 step(9,"Refund on a settled session: terminal");
 recordSession(stateDir,{sessionId:"cs_test_rehearsal_001",offerId:"ai-workflow-kit-004",amountTotal:2900,currency:"usd",livemode:false,state:"REFUNDED"});
 const afterRefund=recordSession(stateDir,{sessionId:"cs_test_rehearsal_001",offerId:"ai-workflow-kit-004",amountTotal:2900,currency:"usd",livemode:false,state:"PAID_PROVIDER_AVAILABLE"});
 assert.equal(afterRefund.recorded,false);assert.equal(afterRefund.reason,"terminal_refunded");
 console.log("   → refund is terminal; no resurrection ✅");

 // 10. Final evidence file: schema-valid, PII-free, atomic-write leftovers none.
 step(10,"Evidence file audit");
 const raw=readFileSync(evidencePath(stateDir),"utf8");
 const parsed=JSON.parse(raw);
 assert.equal(parsed.schema,"mint.settlement.evidence.v1");
 for(const bad of ["email","customer_name","address_line","phone"]) assert.ok(!raw.toLowerCase().includes(bad));
 console.log("   → schema mint.settlement.evidence.v1, PII-free ✅");

 console.log("\n==========================================");
 console.log("REHEARSAL COMPLETE — 10/10 steps passed");
 console.log("The machinery between 'buyer pays' and 'first settled dollar'");
 console.log("is proven. Replace the stubbed Stripe steps with a live test-mode");
 console.log("checkout (sk_test key) and the SAME code path records the real one.");
 console.log("==========================================");
}finally{
 rmSync(stateDir,{recursive:true,force:true});
}
