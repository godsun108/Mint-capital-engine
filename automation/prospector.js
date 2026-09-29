import fs from "node:fs";import path from "node:path";
const root=process.cwd(),stateDir=path.join(root,"automation/state");
fs.mkdirSync(stateDir,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,"systems/commerce/catalog.json"),"utf8"));
const offers=Object.values(catalog.offers||{}).filter(o=>o.status==="ACTIVE");
const hypotheses=offers.flatMap(o=>(o.channels||[]).map(channel=>({
 offer_id:o.id,offer_name:o.name,channel,
 problem:o.acquisition?.headline||o.description,
 promise:o.acquisition?.body||o.description,
 price:o.price,
 evidence_required:["IMPRESSION","REAL_VISIT","CHECKOUT","PAID","FULFILLED"],
 next_action:"Prepare a zero-spend, non-impersonating distribution experiment; consequential outreach remains owner-authorized."
})));
const report={schema:"mint.prospector.opportunity.v1",generated_at:new Date().toISOString(),mode:"ZERO_SPEND_PREPARE_ONLY",count:hypotheses.length,hypotheses,truth:"These are distribution hypotheses, not customers, leads, demand, sales, or revenue. No outreach was performed."};
fs.writeFileSync(path.join(stateDir,"prospector.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
