import { createExecutor, replaceJob } from "./executor.js";
import { nextJobs } from "./orchestrator.js";
import { registry, bootstrapCompany } from "./company.js";
import { initialState } from "./store.js";

const handlers={
 scout:async({job,api})=>{api.evidence({type:"simulation",note:"Synthetic opportunity used only to validate orchestration."});api.output({problem:"Small service businesses lose time turning inquiries into consistent quotes."});api.cost(.01);return {candidate:"quote workflow"};},
 "research-desk":async({api})=>{api.evidence({type:"simulation",note:"Demand is intentionally not asserted as real."});api.output({finding:"Requires external evidence before pilot."});api.cost(.02);},
 oracle:async({api})=>{api.output({hypothesis:"A bounded quoting assistant may reduce response time.",success:"Pilot users complete quotes faster than baseline."});api.cost(.02);},
 builder:async({api})=>{api.output({artifact:"sandbox quote-assistant prototype specification"});api.cost(.05);},
 merchant:async({api})=>{api.output({offer:"DRAFT ONLY — human approval required before launch."});api.cost(.01);},
 auditor:async({api})=>{api.output({verdict:"Simulation pipeline valid; no market claim or launch authorization created."});api.cost(.01);}
};
export async function runSimulation(){
 let state=initialState(); state.jobs=bootstrapCompany().jobs;
 const exec=createExecutor({handlers});
 let guard=0;
 while(guard++<50){
  const runnable=nextJobs(state,registry); if(!runnable.length)break;
  for(const job of runnable){const r=await exec(job,state,{mode:"simulation"});state=r.state;state=replaceJob(state,r.job);}
 }
 return state;
}
