// Settlement evidence ledger — the missing middle between Stripe PAID and MINT SETTLED.
//
// Purpose: moneyState() reports aggregate totals only (no locators, by privacy design),
// so automation/observe-commerce.js never sees per-offer observations and the North
// Star "first settled dollar" proof can never be recorded even after real money moves.
// This module writes durable, atomic, privacy-light per-session evidence that:
//   - preserves PAID != SETTLED (Stripe balance_transaction availability is
//     PROVIDER_AVAILABLE, never bank settlement);
//   - records only non-PII fields (session id, offer id, amounts, state, timestamps);
//   - is idempotent per session id (duplicate webhook/notification = no-op);
//   - supports independent destination-cash evidence later without reworking stores.
import fs from "node:fs";
import path from "node:path";

const SCHEMA="mint.settlement.evidence.v1";
export function evidencePath(stateDir){return path.join(stateDir,"settlement-evidence.json");}

export function readEvidence(stateDir){
 try{return JSON.parse(fs.readFileSync(evidencePath(stateDir),"utf8"));}
 catch{return {schema:SCHEMA,sessions:{},updatedAt:null,semantics:"PROVIDER_AVAILABLE_IS_NOT_BANK_SETTLEMENT"};}
}

function atomicWrite(file,x){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const tmp=file+".tmp";
 fs.writeFileSync(tmp,JSON.stringify(x,null,2)+"\n");
 fs.renameSync(tmp,file);
}

// state: "PAID_PROVIDER_AVAILABLE" | "PAID_PENDING" | "REFUNDED"
// Stripe session + charge/balance_transaction objects as expanded by moneyState.
export function recordSession(stateDir,{sessionId,offerId,amountTotal,currency,livemode,state,balanceTransaction=null,chargeId=null,at=new Date().toISOString()}){
 if(!sessionId||typeof sessionId!=="string")throw new Error("session_id_required");
 if(!["PAID_PROVIDER_AVAILABLE","PAID_PENDING","REFUNDED"].includes(state))throw new Error("invalid_state");
 if(!Number.isInteger(amountTotal)||amountTotal<0)throw new Error("invalid_amount");
 const ledger=readEvidence(stateDir);
 const existing=ledger.sessions[sessionId];
 // Idempotency: never downgrade or duplicate. Only transition forward PAID_PENDING -> PAID_PROVIDER_AVAILABLE, or to REFUNDED.
 if(existing){
  if(existing.state===state)return {recorded:false,reason:"duplicate",sessionId};
  if(existing.state==="PAID_PROVIDER_AVAILABLE"&&state==="PAID_PENDING")return {recorded:false,reason:"stale_transition_ignored",sessionId};
  if(existing.state==="REFUNDED")return {recorded:false,reason:"terminal_refunded",sessionId};
 }
 ledger.sessions[sessionId]={offerId:offerId||null,amountTotal,currency:currency||null,livemode:Boolean(livemode),state,
  chargeId:chargeId||null,
  balanceTransactionId:balanceTransaction?.id||null,
  balanceTransactionStatus:balanceTransaction?.status||null,
  providerAvailableAt:state==="PAID_PROVIDER_AVAILABLE"?at:(existing?.providerAvailableAt||null),
  firstPaidAt:existing?.firstPaidAt||at,
  updatedAt:at};
 // explicit non-settlement semantics on every row
 ledger.sessions[sessionId].settledDefinition="Requires independent destination-cash evidence; availability alone is not SETTLED.";
 ledger.sessions[sessionId].settled=false;
 ledger.updatedAt=at;
 atomicWrite(evidencePath(stateDir),ledger);
 return {recorded:true,sessionId,state};
}

// Independent settlement confirmation: recorded only when a separate destination-cash
// evidence source (bank line, transfer record, manual attestation) asserts settlement.
export function confirmSettlement(stateDir,{sessionId,destinationEvidenceRef,at=new Date().toISOString()}){
 if(!destinationEvidenceRef||typeof destinationEvidenceRef!=="string")return {confirmed:false,reason:"destination_evidence_ref_required"};
 const ledger=readEvidence(stateDir);
 const s=ledger.sessions[sessionId];
 if(!s)return {confirmed:false,reason:"unknown_session"};
 if(s.state!=="PAID_PROVIDER_AVAILABLE")return {confirmed:false,reason:"not_provider_available",state:s.state};
 if(s.settled)return {confirmed:false,reason:"already_settled"};
 s.settled=true;
 s.settledAt=at;
 s.destinationEvidenceRef=destinationEvidenceRef;
 ledger.updatedAt=at;
 atomicWrite(evidencePath(stateDir),ledger);
 return {confirmed:true,sessionId,settledAt:at};
}

// Observer projection: per-offer aggregates in exactly the shape
// automation/observe-commerce.js expects, PLUS settledNetUsd only from
// independently confirmed settlements.
export function observerProjection(stateDir){
 const ledger=readEvidence(stateDir);
 const transactions=[];const offers={};
 for(const [sessionId,s] of Object.entries(ledger.sessions||{})){
  const tx={sessionId,offerId:s.offerId,paymentStatus:s.state==="REFUNDED"?"refunded":"paid",
   state:s.state==="PAID_PROVIDER_AVAILABLE"?"provider_available":"pending",
   settled:Boolean(s.settled),settledNetUsd:s.settled?amountUsd(s):0,source:s.livemode?"stripe_live":"stripe_test"};
  transactions.push(tx);
  if(!s.offerId)continue;
  const m=offers[s.offerId]||={verifiedObservations:0,paid:0,fulfilled:0,refunds:0,settledNetUsd:0,deliveryFailure:false,providerAvailable:0,sources:{}};
  m.verifiedObservations++;if(tx.paymentStatus==="paid")m.paid++;
  if(tx.state==="provider_available")m.providerAvailable++;
  if(s.state==="REFUNDED")m.refunds++;
  m.settledNetUsd+=tx.settledNetUsd;
  m.sources[tx.source]=(m.sources[tx.source]||0)+1;
 }
 return {transactions,offers};
}

function amountUsd(s){
 const cents=Number(s.amountTotal)||0;
 const cur=(s.currency||"usd").toLowerCase();
 if(cur==="usd")return cents/100;
 return 0; // non-USD never invents a USD number
}
