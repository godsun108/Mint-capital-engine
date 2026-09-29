import fs from "node:fs";
import path from "node:path";

const base=process.env.MINT_COMMERCE_URL;
if(!base) throw new Error("MINT_COMMERCE_URL is required");
const response=await fetch(base.replace(/\/$/,"")+"/api/money-state");
if(!response.ok) throw new Error("money-state request failed");
const data=await response.json();
const offers={};
for(const tx of data.transactions||[]){
 if(!tx.offerId) continue;
 const m=offers[tx.offerId]||={verifiedObservations:0,paid:0,fulfilled:0,refunds:0,settledNetUsd:0,deliveryFailure:false,providerAvailable:0,sources:{}};
 m.verifiedObservations++;
 if(tx.paymentStatus==="paid")m.paid++;
 if(tx.state==="provider_available")m.providerAvailable++;
 const source=tx.source||"unknown";m.sources[source]=(m.sources[source]||0)+1;
}
const out=path.join(process.cwd(),"automation","state","commerce-observations.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({schema:"mint.commerce.observations.v1",generatedAt:new Date().toISOString(),semantics:"PROVIDER_OBSERVATIONS_NOT_SETTLEMENT_EVIDENCE",offers},null,2)+"\n");
console.log(JSON.stringify({ok:true,offers},null,2));
