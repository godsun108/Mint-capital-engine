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

function researchReceipt(job){
  const candidate=job.inputs?.candidate;
  const evidence=Array.isArray(candidate?.evidence)?candidate.evidence:[];
  const verified=evidence.filter(e=>e?.verified===true && (e?.url||e?.sourceId||e?.citation));
  if(!candidate?.customer||!candidate?.problem) return {status:"BLOCKED_EVIDENCE",reason:"missing customer/problem",evidence:[]};
  if(verified.length===0) return {status:"BLOCKED_EVIDENCE",reason:"no attributable verified evidence",evidence:[]};
  return {status:"COMPLETE",reason:"candidate receipts validated",evidence:verified.map(e=>({kind:"source_receipt",source:e.source||e.sourceId||"public",url:e.url||null,citation:e.citation||null,observedAt:e.observedAt||null,verified:true}))};
}

function execute(job){
  if(job.agent==="research-desk") return researchReceipt(job);
  if(job.agent==="oracle"){
    const deps=(job.dependsOn||[]).map(id=>jobs.find(j=>j.id===id)).filter(Boolean);
    const receipts=deps.flatMap(d=>d.evidence||[]).filter(e=>e?.verified===true);
    if(receipts.length===0) return {status:"BLOCKED_EVIDENCE",reason:"no verified research receipt",evidence:[]};
    return {status:"COMPLETE",reason:"zero-upfront experiment bounded from verified research",evidence:[{
      kind:"economics_receipt",verified:true,upfrontCostUsd:0,
      hypothesis:"A smallest-useful product addressing the verified problem can generate attributable checkout behavior.",
      successMetric:"verified paid sessions and fulfilled orders",
      settlementMetric:"independently supported settled net cash",
      stopRule:"do not scale from visits or checkout starts alone"
    }]};
  }
  if(["builder","merchant","auditor","market"].includes(job.agent)){
    return {status:"BLOCKED_ADAPTER",reason:`${job.agent} evidence-producing adapter not connected`,evidence:[]};
  }
  return {status:"BLOCKED_ADAPTER",reason:"no executor registered",evidence:[]};
}

let attempted=0;
for(let step=0;step<6;step++){
  const ready=nextJobs({jobs,kills:state.kills||{},approvals:state.approvals||[]},registry);
  const job=ready[0];
  if(!job) break;
  const result=execute(job);
  attempted++;
  const target=jobs.find(j=>j.id===job.id);
  Object.assign(target,{...result,lastAttemptAt:now});
  if(result.status!=="COMPLETE") break;
}
const next={...state,queue:jobs,lastExecutorRunAt:now};
write(statePath,next);
console.log(JSON.stringify({ok:true,at:now,runnable:runnable.length,attempted,complete:jobs.filter(j=>j.status==="COMPLETE").length,blocked:jobs.filter(j=>j.status==="BLOCKED_ADAPTER").length},null,2));
