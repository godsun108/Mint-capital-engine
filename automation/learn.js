import fs from "node:fs";
import path from "node:path";
import {portfolioDecision} from "../agents/product-loop.js";

const root=process.cwd();
const statePath=path.join(root,"automation","state","learning.json");
const inputPath=path.join(root,"automation","state","commerce-observations.json");
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):null;
const input=read(inputPath)||{schema:"mint.commerce.observations.v1",offers:{}};
const previous=read(statePath)||{schema:"mint.learning.state.v1",offers:{}};
const now=new Date().toISOString();
const offers={...previous.offers};

for(const [offerId,m] of Object.entries(input.offers||{})){
 const metrics={
  paid:Number(m.paid)||0,fulfilled:Number(m.fulfilled)||0,refunds:Number(m.refunds)||0,
  settledNetUsd:Number(m.settledNetUsd)||0,verifiedObservations:Number(m.verifiedObservations)||0,
  deliveryFailure:m.deliveryFailure===true
 };
 const decision=portfolioDecision(metrics);
 offers[offerId]={offerId,metrics,decision,updatedAt:now,
  semantics:"VERIFIED_INPUTS_ONLY_NO_FORECASTS",
  learnings:{
   acquisitionProven:metrics.paid>0,
   fulfillmentProven:metrics.fulfilled>0,
   settlementProven:metrics.settledNetUsd>0,
   scaleEligible:decision.state==="SCALING"
  }};
}
fs.mkdirSync(path.dirname(statePath),{recursive:true});
fs.writeFileSync(statePath,JSON.stringify({schema:"mint.learning.state.v1",generatedAt:now,offers},null,2)+"\n");
console.log(JSON.stringify({ok:true,generatedAt:now,offers:Object.values(offers)},null,2));
