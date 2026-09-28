import { gateAction, requestApproval } from "./orchestrator.js";
export function createExecutor({handlers={}}={}){
 return async function execute(job,state,context={}){
  const handler=handlers[job.agent]||handlers["*"];
  if(!handler)return {state,job:{...job,status:"BLOCKED",error:"no_executor"}};
  let current={...job,status:"EXECUTING",startedAt:new Date().toISOString()};
  const api={
   evidence(item){current={...current,evidence:[...(current.evidence||[]),item]};},
   output(item){current={...current,outputs:[...(current.outputs||[]),item]};},
   cost(amount,kind="compute"){current={...current,costs:[...(current.costs||[]),{amount:Number(amount)||0,kind,at:new Date().toISOString()}]};},
   action(action){
    const approval=(current.approvals||[]).some(a=>a.action===action.type&&a.status==="APPROVED");
    const gate=gateAction(current,action,approval);
    if(!gate.ok&&gate.reason==="human_approval_required"){state=requestApproval(state,current,action);current={...current,status:"WAITING_FOR_HUMAN_APPROVAL"};}
    return gate;
   }
  };
  try{
   const result=await handler({job:current,api,context});
   if(current.status==="WAITING_FOR_HUMAN_APPROVAL")return {state,job:current};
   return {state,job:{...current,status:"COMPLETE",result,completedAt:new Date().toISOString()}};
  }catch(error){return {state,job:{...current,status:"BLOCKED",error:String(error?.message||error)}};
  }
 };
}
export function replaceJob(state,job){return {...state,jobs:state.jobs.map(x=>x.id===job.id?job:x)};}
