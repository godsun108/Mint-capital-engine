// PRESS read-only Printful order reconciliation. Never creates, confirms, cancels, or spends.
const API=process.env.PRINTFUL_API_BASE||"https://api.printful.com";
function headers(){const h={accept:"application/json"};if(process.env.PRINTFUL_TOKEN)h.authorization="Bearer "+process.env.PRINTFUL_TOKEN;if(process.env.PRINTFUL_STORE_ID)h["X-PF-Store-Id"]=process.env.PRINTFUL_STORE_ID;return h}
export async function reconcilePrintfulOrder(providerOrderId){
  if(!process.env.PRINTFUL_TOKEN)throw new Error("PRINTFUL_TOKEN required");
  if(!providerOrderId)throw new Error("providerOrderId required");
  const r=await fetch(API+"/orders/"+encodeURIComponent(providerOrderId),{headers:headers()});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error("Printful order lookup failed HTTP "+r.status);
  const o=body?.result||{};
  const shipments=(o.shipments||[]).map(s=>({id:s.id||null,carrier:s.carrier||null,service:s.service||null,tracking_number:s.tracking_number||null,tracking_url:s.tracking_url||null,shipped_at:s.shipped_at||null}));
  const raw=String(o.status||"unknown").toLowerCase();
  const state=raw==="draft"?"DRAFT":raw==="pending"?"PROVIDER_PENDING":raw==="failed"?"EXCEPTION":raw==="canceled"||raw==="cancelled"?"CANCELED":raw==="fulfilled"?"FULFILLED":shipments.length?"SHIPPED":"PROVIDER_"+raw.toUpperCase();
  return {ok:true,provider:"printful",providerOrderId:o.id||providerOrderId,externalId:o.external_id||null,providerStatus:o.status||null,state,shipments,exception:state==="EXCEPTION",readOnly:true,spend:false,observedAt:new Date().toISOString()};
}
export const capabilities=Object.freeze({read:true,tracking:true,create:false,confirm:false,cancel:false,spend:false});
