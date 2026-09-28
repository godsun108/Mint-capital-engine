import { summarizeExperiment } from "./experiments.js";
export function companySnapshot(state,registry){
 const status={}; for(const j of state.jobs||[])status[j.status]=(status[j.status]||0)+1;
 const costs=(state.jobs||[]).flatMap(j=>j.costs||[]).reduce((n,c)=>n+(Number(c.amount)||0),0);
 const experiments=(state.experiments||[]).map(summarizeExperiment);
 const settledRevenue=experiments.reduce((n,x)=>n+x.settledRevenue,0);
 return {
  agents:registry.agents.length,jobs:(state.jobs||[]).length,status,
  pendingApprovals:(state.approvals||[]).filter(a=>a.status==="PENDING").length,
  experiments:experiments.length,settledRevenue,totalTrackedCost:costs+experiments.reduce((n,x)=>n+x.totalCost,0),
  systemHalted:Boolean(state.kills?.system)
 };
}
export function renderCompanyDashboard(root,snapshot){
 if(!root)return;
 root.innerHTML=`<section class="agent-company"><h2>AI COMPANY</h2><p>${snapshot.agents} agents · ${snapshot.jobs} jobs · ${snapshot.pendingApprovals} approvals waiting</p><div class="agent-metrics"><strong>Settled revenue: $${snapshot.settledRevenue.toFixed(2)}</strong><span>Tracked cost: $${snapshot.totalTrackedCost.toFixed(2)}</span><span>System: ${snapshot.systemHalted?"HALTED":"READY"}</span></div><pre>${escapeHtml(JSON.stringify(snapshot.status,null,2))}</pre></section>`;
}
function escapeHtml(x){return x.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
