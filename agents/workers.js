import { ROLE_SYSTEM } from "./adapters/model.js";
import { evidenceFromSource } from "./adapters/research.js";
import { opportunityCandidate } from "./mission.js";

export function createWorkers({model,research,code}){
 return {
  scout:async({job,api,context})=>{
   const query=context.query||job.objective;
   const sources=await research.search(query,{limit:8});
   sources.forEach(s=>api.evidence(evidenceFromSource(s,"Candidate opportunity source")));
   const result=await model.run({system:ROLE_SYSTEM.scout,task:"Using only supplied sources, identify up to 3 concrete customer problems worth verifying. Return structured candidates and distinguish fact from hypothesis.",context:{query,sources}});
   api.cost(result.cost||0,"model");
   api.output({type:"candidate_analysis",data:result.data||result});
   return result.data||result;
  },
  "research-desk":async({job,api,context})=>{
   const sources=context.sources||[];
   const result=await model.run({system:ROLE_SYSTEM["research-desk"],task:job.objective,context:{...context,sources}});
   api.cost(result.cost||0,"model"); api.output({type:"verification",data:result.data||result}); return result.data||result;
  },
  oracle:async({job,api,context})=>{
   const result=await model.run({system:ROLE_SYSTEM.oracle,task:job.objective,context});
   api.cost(result.cost||0,"model"); api.output({type:"experiment_design",data:result.data||result}); return result.data||result;
  },
  builder:async({job,api,context})=>{
   const result=await model.run({system:ROLE_SYSTEM.builder,task:"Produce a minimal sandbox artifact specification and files required. No production deployment.",context});
   api.cost(result.cost||0,"model");
   if(code&&result.files)for(const f of result.files){await code.write(f.path,f.content,{approvedSandbox:true});}
   api.output({type:"sandbox_build",data:result.data||result}); return result.data||result;
  },
  merchant:async({job,api,context})=>{
   const result=await model.run({system:ROLE_SYSTEM.merchant,task:"Prepare an offer draft and fulfillment checklist. Do not publish.",context});
   api.cost(result.cost||0,"model");api.output({type:"offer_draft",data:result.data||result});return result.data||result;
  },
  auditor:async({job,api,context})=>{
   const result=await model.run({system:ROLE_SYSTEM.auditor,task:"Audit evidence, unsupported claims, economics, permissions, stop conditions and launch readiness.",context});
   api.cost(result.cost||0,"model");api.output({type:"audit",data:result.data||result});return result.data||result;
  }
 };
}

export function candidateFromWorker(x,i=0){
 return opportunityCandidate({id:x.id||`candidate-${i+1}`,title:x.title||"Untitled candidate",problem:x.problem||"Unspecified",customer:x.customer,evidence:x.evidence||[],revenuePath:x.revenuePath,upfrontCash:x.upfrontCash||0,timeToCashDays:x.timeToCashDays,risks:x.risks||[]});
}
