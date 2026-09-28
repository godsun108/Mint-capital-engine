import { authorize, makeWorkOrder } from "./runtime.js";
export function canRun(job,state,registry){
 const agent=registry.agents.find(a=>a.id===job.agent); if(!agent)return {ok:false,reason:"unknown_agent"};
 if(state.kills?.system)return {ok:false,reason:"system_halted"};
 if(state.kills?.divisions?.[agent.division])return {ok:false,reason:"division_halted"};
 if(state.kills?.agents?.[agent.id])return {ok:false,reason:"agent_halted"};
 const unmet=(job.dependsOn||[]).filter(id=>!state.jobs.some(j=>j.id===id&&j.status==="COMPLETE"));
 return unmet.length?{ok:false,reason:"dependencies",unmet}:{ok:true};
}
export function plan({id,agent,objective,actions=[],budget=0,dependsOn=[]}){return {...makeWorkOrder({id,agent,objective,actions,budget}),dependsOn};}
export function nextJobs(state,registry){return state.jobs.filter(j=>["PROPOSED","APPROVED"].includes(j.status)).filter(j=>canRun(j,state,registry).ok);}
export function gateAction(job,action,approved=false){
 const spent=(job.costs||[]).reduce((n,x)=>n+(Number(x.amount)||0),0);
 return authorize({action:action.type||action,approved,estimatedCost:Number(action.estimatedCost)||0,budgetRemaining:Math.max(0,(job.budget||0)-spent)});
}
export function requestApproval(state,job,action){
 const id=`${job.id}:${action.type}`; if(state.approvals.some(a=>a.id===id&&a.status==="PENDING"))return state;
 return {...state,approvals:[...state.approvals,{id,jobId:job.id,action:action.type,status:"PENDING",createdAt:new Date().toISOString()}]};
}
