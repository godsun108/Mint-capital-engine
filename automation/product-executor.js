import fs from "node:fs";
import path from "node:path";
import { nextJobs } from "../agents/orchestrator.js";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const write=(p,v)=>{const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(v,null,2)+"\n");};
const statePath="automation/state/product-cycle.json";
const registry=read("agents/registry.json");
const state=fs.existsSync(statePath)?read(statePath):{schema:"mint.product.cycle.state.v1",runs:[],queue:[]};
const jobs=(state.queue||[]).map(j=>({...j}));
const orchestrationState={jobs,kills:state.kills||{},approvals:state.approvals||[]};
const runnable=nextJobs(orchestrationState,registry);
const now=new Date().toISOString();

function execute(job){
  if(job.agent==="oracle"){
    return {status:"BLOCKED_ADAPTER",reason:"verified research output required before deterministic economics",evidence:[]};
  }
  if(["research-desk","builder","merchant","auditor","market"].includes(job.agent)){
    return {status:"BLOCKED_ADAPTER",reason:`${job.agent} evidence-producing adapter not connected`,evidence:[]};
  }
  return {status:"BLOCKED_ADAPTER",reason:"no executor registered",evidence:[]};
}

let attempted=0;
for(const job of runnable.slice(0,1)){
  const result=execute(job); attempted++;
  const target=jobs.find(j=>j.id===job.id);
  Object.assign(target,{...result,lastAttemptAt:now});
}
const next={...state,queue:jobs,lastExecutorRunAt:now};
write(statePath,next);
console.log(JSON.stringify({ok:true,at:now,runnable:runnable.length,attempted,complete:jobs.filter(j=>j.status==="COMPLETE").length,blocked:jobs.filter(j=>j.status==="BLOCKED_ADAPTER").length},null,2));
