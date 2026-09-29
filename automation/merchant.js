import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";
const root=process.cwd(),stateDir=path.join(root,"automation/state");
const input=JSON.parse(fs.readFileSync(path.join(stateDir,"prospector.json"),"utf8"));
const base="https://godsun108.github.io/Mint-capital-engine/shop/";
const assets=(input.hypotheses||[]).map((h,i)=>{
 const experiment_id="exp-"+crypto.createHash("sha256").update([h.offer_id,h.channel,h.problem].join("|")).digest("hex").slice(0,12);
 const params=new URLSearchParams({utm_source:h.channel,utm_medium:"owned-prepared",utm_campaign:"mint-zero-spend",utm_content:experiment_id,offer:h.offer_id});
 return {experiment_id,offer_id:h.offer_id,channel:h.channel,headline:h.problem,copy:h.promise,cta:"View offer",destination:base+"?"+params.toString(),status:"PREPARED_NOT_PUBLISHED",evidence_ladder:["IMPRESSION","REAL_VISIT","CHECKOUT","PAID","FULFILLED"],hard_stop:"Publishing/outreach requires an authorized channel action; this worker only prepares assets."};
});
const report={schema:"mint.merchant.assets.v1",generated_at:new Date().toISOString(),count:assets.length,assets,truth:"Prepared assets and attribution URLs do not prove publication, impressions, visits, checkout, payment, fulfillment, or revenue."};
fs.writeFileSync(path.join(stateDir,"merchant.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
