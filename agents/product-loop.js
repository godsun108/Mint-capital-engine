import { plan } from "./orchestrator.js";

export const PRODUCT_STATES = Object.freeze([
  "DISCOVERED","VALIDATING","BUILDING","AUDITING","LIVE","SCALING","RETIRING","RETIRED"
]);

export function eligibleCandidate(candidate, mandate) {
  const reasons=[];
  if(!mandate?.enabled) reasons.push("mandate_disabled");
  if(mandate?.scope!=="owned_nonregulated_digital_products") reasons.push("outside_scope");
  if(candidate?.regulated===true) reasons.push("regulated");
  if((Number(candidate?.upfrontCostUsd)||0)>Number(mandate?.max_upfront_usd_per_job||0)) reasons.push("upfront_cost");
  if(!Array.isArray(candidate?.evidence)||candidate.evidence.length===0) reasons.push("missing_demand_evidence");
  const verified=(candidate?.evidence||[]).filter(e=>e?.verified===true && (e?.url||e?.sourceId||e?.citation));
  if(verified.length===0) reasons.push("missing_verified_demand_evidence");
  if(!candidate?.problem||!candidate?.customer) reasons.push("missing_customer_problem");
  return {ok:reasons.length===0,reasons};
}

export function productCycle({cycleId,candidate,mandate}) {
  const gate=eligibleCandidate(candidate,mandate);
  if(!gate.ok) return {cycleId,status:"REJECTED",gate,jobs:[]};
  const prefix=`product-${cycleId}`;
  const jobs=[
    plan({id:`${prefix}-verify`,agent:"research-desk",objective:"Verify candidate demand, customer problem, alternatives, claims constraints and evidence. Reject unsupported demand.",budget:0}),
    plan({id:`${prefix}-economics`,agent:"oracle",objective:"Define a falsifiable zero-upfront-cost product experiment and bounded economics.",budget:0,dependsOn:[`${prefix}-verify`]}),
    plan({id:`${prefix}-build`,agent:"builder",objective:"Build the smallest useful owned non-regulated digital product that satisfies the verified problem.",budget:0,dependsOn:[`${prefix}-economics`]}),
    plan({id:`${prefix}-package`,agent:"merchant",objective:"Package truthful offer, price, delivery, refund terms and fulfillment mapping within the standing mandate.",budget:0,dependsOn:[`${prefix}-build`]}),
    plan({id:`${prefix}-audit`,agent:"auditor",objective:"Verify evidence, product behavior, delivery, claims, permissions and mandate fit. Halt on uncertainty.",budget:0,dependsOn:[`${prefix}-package`]}),
    plan({id:`${prefix}-market`,agent:"market",objective:"Prepare attributable zero-spend acquisition for the audited approved offer using only mandate-authorized channels.",budget:0,dependsOn:[`${prefix}-audit`]})
  ];
  return {cycleId,status:"VALIDATING",gate,jobs};
}

export function portfolioDecision(metrics={}) {
  const paid=Number(metrics.paid)||0;
  const fulfilled=Number(metrics.fulfilled)||0;
  const refunds=Number(metrics.refunds)||0;
  const settledNetUsd=Number(metrics.settledNetUsd)||0;
  const observations=Number(metrics.verifiedObservations)||0;
  if(metrics.deliveryFailure===true) return {state:"RETIRING",reason:"delivery_failure"};
  if(refunds>0 && paid>0 && refunds/paid>=0.25 && observations>=4) return {state:"RETIRING",reason:"refund_signal"};
  if(settledNetUsd>0 && fulfilled>0) return {state:"SCALING",reason:"verified_customer_value_and_settled_cash"};
  if(observations>=20 && paid===0) return {state:"VALIDATING",reason:"demand_not_yet_proven"};
  return {state:"LIVE",reason:"insufficient_evidence_to_change"};
}
