import { companySnapshot } from "./dashboard.js";
export function buildPublicSnapshot(state,registry,{generatedAt=new Date().toISOString(),sourceCommit=null}={}){
 const s=companySnapshot(state,registry);
 return {
  schema:"mint.agent-company.public.v1",
  generatedAt,sourceCommit,
  truth:{liveBackend:false,readOnly:true,settlementAuthority:"MINT"},
  company:{agents:s.agents,jobs:s.jobs,status:s.status,pendingApprovals:s.pendingApprovals,experiments:s.experiments,settledRevenue:s.settledRevenue,totalTrackedCost:s.totalTrackedCost,systemHalted:s.systemHalted},
  missions:publicMissions(state),
  approvals:(state.approvals||[]).filter(a=>a.status==="PENDING").map(a=>({id:a.id,jobId:a.jobId||null,action:a.action||null,status:"PENDING"}))
 };
}
function publicMissions(state){
 return (state.missions||[]).map(m=>({id:m.id,objective:m.objective,status:m.status||"UNKNOWN",budget:m.budget||0,successCriteria:m.successCriteria||[],stopConditions:m.stopConditions||[]}));
}
export function assertPublicSnapshot(x){
 if(x?.schema!=="mint.agent-company.public.v1")throw new Error("unsupported public snapshot schema");
 if(x.truth?.readOnly!==true)throw new Error("public snapshot must be read-only");
 if(typeof x.generatedAt!=="string")throw new Error("generatedAt required");
 return x;
}
