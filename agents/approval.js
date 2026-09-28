export function approve(state,{approvalId,actor="human",note=""}){
 const approvals=(state.approvals||[]).map(a=>a.id===approvalId?{...a,status:"APPROVED",actor,note,resolvedAt:new Date().toISOString()}:a);
 return {...state,approvals};
}
export function reject(state,{approvalId,actor="human",note=""}){
 const approvals=(state.approvals||[]).map(a=>a.id===approvalId?{...a,status:"REJECTED",actor,note,resolvedAt:new Date().toISOString()}:a);
 return {...state,approvals};
}
export function pending(state){return (state.approvals||[]).filter(a=>a.status==="PENDING");}
