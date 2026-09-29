import fs from "node:fs";import path from "node:path";
const root=process.cwd(),issues=[],warnings=[];
const canonicalPath=path.join(root,"systems/commerce/catalog.json"),deployedPath=path.join(root,"connect-demo/catalog.json");
const canonical=JSON.parse(fs.readFileSync(canonicalPath,"utf8"));
if(!fs.existsSync(deployedPath))issues.push("deployed catalog missing");
else if(fs.readFileSync(canonicalPath,"utf8")!==fs.readFileSync(deployedPath,"utf8"))issues.push("canonical and deployed catalogs differ");
for(const o of Object.values(canonical.offers||{})){
 const fulfillment=o.fulfillment||{};
 if(fulfillment.kind==="FILE"){
  const p=path.join(root,"connect-demo",fulfillment.path);
  if(!fs.existsSync(p))issues.push(o.id+": deployed deliverable missing: "+fulfillment.path);
 }
 if(o.status==="DRAFT")warnings.push(o.id+": DRAFT — artifact may exist but checkout must remain disabled");
}
const required=["systems/capital/armada.json","systems/commerce/production-agents.json","systems/commerce/storefronts.json","systems/salvage/ledger.json","systems/salvage/dealer.json"];
for(const p of required)if(!fs.existsSync(path.join(root,p)))issues.push("system file missing: "+p);
const report={ok:issues.length===0,schema:"mint.fleet.readiness.v1",generatedAt:new Date().toISOString(),catalog:{offers:Object.keys(canonical.offers||{}).length,active:Object.values(canonical.offers||{}).filter(x=>x.status==="ACTIVE").length,draft:Object.values(canonical.offers||{}).filter(x=>x.status==="DRAFT").length},issues,warnings,truth:"READY means repository configuration/artifacts pass local structural checks; it does not prove deployment, marketplace publication, customer traffic, sales, settlement, supplier readiness, or external eligibility."};
fs.mkdirSync(path.join(root,"automation/state"),{recursive:true});fs.writeFileSync(path.join(root,"automation/state/fleet-readiness.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
