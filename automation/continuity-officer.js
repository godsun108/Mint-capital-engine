import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),"utf8"))}catch{return null}};
const acquisition=read("automation/state/acquisition-observations.json");
const commerce=read("automation/state/commerce-observations.json");
const learning=read("automation/state/learning.json");
const allocation=read("automation/state/allocation.json");
const motion=read("automation/state/market-motion.json");
const payment=read("automation/payment_truth.json");
const router=read("automation/state/demand-router.json");
const experiments=read("automation/state/message-experiments.json");

const totals=payment?.totals||{};
const acq=acquisition?.totals||{};
const allocations=Object.values(allocation?.allocations||{});
const readyRoutes=(router?.routes||[]).filter(x=>x.permission==="AUTHORIZED"&&x.action==="PUBLISH_AND_MEASURE").length;
const reviews=(motion?.results||[]).filter(x=>x.reviewRecommended).length;
const experimentBriefs=(experiments?.briefs||[]).length;
const durableAcquisitionMemory=acquisition?.durableStorageConfigured===true || acquisition?.captureSemantics==="SNAPSHOT_OF_DURABLE_AGGREGATES_NOT_UNIQUE_VISITORS";
const signals={
 durableAcquisitionMemory,
 evidenceAvailable:Boolean(acquisition&&commerce&&learning&&allocation&&motion&&payment),
 authorizedZeroSpendRoutes:readyRoutes,
 visits:Number(acq.VISITED)||0,
 checkoutStarted:Number(acq.CHECKOUT_STARTED)||0,
 paid:Number(totals.paid)||0,
 settled:Number(totals.settled)||0,
 net:Number(totals.net)||0,
 activeAllocations:allocations.filter(x=>x.attentionWeight>0).length,
 reviewRecommended:reviews,
 messageExperimentsReady:experimentBriefs
};
let status="HEALTHY",nextConstraint="OBSERVE_REAL_MARKET_RESPONSE";
const reasons=[];
if(!signals.evidenceAvailable){status="CRITICAL";nextConstraint="RESTORE_EVIDENCE_PIPELINE";reasons.push("required continuity evidence missing");}
else if(!signals.durableAcquisitionMemory){status="ATTENTION";nextConstraint="CERTIFY_DURABLE_EVIDENCE_MEMORY";reasons.push("acquisition memory is not yet certified durable in persisted runtime evidence");}
else if(signals.authorizedZeroSpendRoutes===0){status="ATTENTION";nextConstraint="RESTORE_AUTHORIZED_DISTRIBUTION";reasons.push("no authorized zero-spend acquisition route");}
else if(signals.visits===0&&signals.checkoutStarted===0&&signals.paid===0){status="ATTENTION";nextConstraint=signals.reviewRecommended?"ADAPT_OFFER_MESSAGE":"ACQUIRE_REAL_VISITS";reasons.push("no observed customer behavior in the current acquisition snapshot");}
if(signals.messageExperimentsReady>0){status=status==="CRITICAL"?status:"ATTENTION";nextConstraint="RUN_BOUNDED_MESSAGE_EXPERIMENT";reasons.push("reversible message experiment ready");}
const ownerGates=[
 "paid_spend_increase",
 "borrowing_or_credit",
 "regulated_activity",
 "identity_or_legal_attestation",
 "financial_account_changes",
 "permission_escalation"
];
const out={schema:"mint.continuity.officer.v1",generatedAt:new Date().toISOString(),
 semantics:"OWNER_CONTINUITY_SUMMARY_NOT_REVENUE_INFERENCE",
 sixMonthAbsenceTest:{status,nextConstraint,reasons},
 signals,ownerGates,
 doctrine:["truth_before_theater","evidence_before_confidence","operational_before_victory","reversible_autonomy_before_irreversible_action"],
 evidenceNotes:[acquisition?.semantics||"acquisition telemetry semantics unavailable","acquisition aggregates are not unique visitors","payment truth semantics control revenue claims","zero behavior does not prove zero demand"]};
const file=path.join(root,"automation","state","continuity.json");fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out,null,2));
