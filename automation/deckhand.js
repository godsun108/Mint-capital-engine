import fs from "node:fs";import path from "node:path";import {spawnSync} from "node:child_process";
const root=process.cwd();
const canonical=path.join(root,"systems/commerce/catalog.json"),runtime=path.join(root,"connect-demo/catalog.json");
const catalog=JSON.parse(fs.readFileSync(canonical,"utf8"));
for(const [id,o] of Object.entries(catalog.offers||{})){
 if(o.id!==id)throw new Error("catalog id mismatch: "+id);
 if(o.status==="ACTIVE"&&o.fulfillment?.kind==="FILE"){
  const p=path.join(root,"connect-demo",o.fulfillment.path);
  if(!fs.existsSync(p))throw new Error("refusing sync; active deliverable missing: "+p);
 }
}
fs.copyFileSync(canonical,runtime);
const scripts=["automation/validate-catalog.js","automation/red-team.js","automation/generate-storefronts.js","automation/fleet-readiness.js"];
for(const s of scripts){
 const r=spawnSync(process.execPath,[path.join(root,s)],{cwd:root,stdio:"inherit"});
 if(r.status!==0)process.exit(r.status??1);
}
console.log(JSON.stringify({ok:true,schema:"mint.deckhand.run.v1",offers:Object.keys(catalog.offers||{}).length,active:Object.values(catalog.offers||{}).filter(x=>x.status==="ACTIVE").length,truth:"Local deterministic preparation completed; external deployment is not implied."},null,2));
