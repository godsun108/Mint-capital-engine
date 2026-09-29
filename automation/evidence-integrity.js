import fs from "node:fs";import path from "node:path";
const root=process.cwd(),stateDir=path.join(root,"automation/state");
const names=["fleet-readiness.json","watchtower.json","prospector.json","merchant.json","auditor.json","factory-run.json","factory-queue.json"];
const files=[];
for(const name of names){
 const p=path.join(stateDir,name);
 if(!fs.existsSync(p)){files.push({name,present:false});continue}
 const st=fs.statSync(p),age_ms=Date.now()-st.mtimeMs;
 let valid_json=true;try{JSON.parse(fs.readFileSync(p,"utf8"))}catch{valid_json=false}
 files.push({name,present:true,valid_json,bytes:st.size,mtime:new Date(st.mtimeMs).toISOString(),age_ms});
}
const required=files.filter(x=>x.name!=="auditor.json");
const stale=required.filter(x=>x.present&&x.age_ms>24*60*60*1000).map(x=>x.name);
const missing=required.filter(x=>!x.present).map(x=>x.name);
const invalid=required.filter(x=>x.present&&!x.valid_json).map(x=>x.name);
const report={schema:"mint.evidence.integrity.v1",generated_at:new Date().toISOString(),ok:!missing.length&&!invalid.length&&!stale.length,missing,invalid,stale,files,truth:"Integrity green means required local evidence files exist, parse as JSON, and are fresh within 24 hours. It does not prove the external claims inside them."};
fs.writeFileSync(path.join(stateDir,"evidence-integrity.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;
