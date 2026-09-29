import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";
const root=process.cwd(),stateDir=path.join(root,"automation/state");
const read=n=>{try{return JSON.parse(fs.readFileSync(path.join(stateDir,n),"utf8"))}catch{return null}};
const watch=read("watchtower.json"),prospect=read("prospector.json"),merchant=read("merchant.json"),queue=read("factory-queue.json");
const stages={
 readiness:{ok:Boolean(queue)&&!queue.tasks?.some(t=>["FAILED_RETRYABLE","FAILED_TERMINAL","BLOCKED_EXTERNAL","BLOCKED_OWNER"].includes(t.status))},
 production:{ok:watch?.ok===true,observed_at:watch?.observed_at||null},
 prospecting:{ok:(prospect?.count||0)>0,count:prospect?.count||0},
 merchandising:{ok:(merchant?.count||0)>0,count:merchant?.count||0},
 commerce:{ok:false,status:"UNPROVEN",required:["REAL_VISIT","CHECKOUT","PAID","FULFILLED"]}
};
const canonical=JSON.stringify({stages,watch:watch?.results?.map(x=>({id:x.id,ok:x.ok,http_status:x.http_status,semantic:x.semantic}))||[]});
const report={schema:"mint.auditor.funnel.v1",generated_at:new Date().toISOString(),stages,evidence_sha256:crypto.createHash("sha256").update(canonical).digest("hex"),next_constraint:!stages.readiness.ok?"READINESS":!stages.production.ok?"PRODUCTION":!stages.prospecting.ok?"PROSPECTING":!stages.merchandising.ok?"MERCHANDISING":"REAL_CUSTOMER_EVIDENCE",truth:"Green preparation stages do not imply traffic, checkout, payment, fulfillment, settlement, or revenue. Commerce remains UNPROVEN until external evidence exists."};
fs.writeFileSync(path.join(stateDir,"auditor.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!stages.readiness.ok||!stages.production.ok||!stages.prospecting.ok||!stages.merchandising.ok)process.exitCode=1;
