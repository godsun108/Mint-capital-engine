// PRESS Printful order submission boundary.
// Default mode is DRY_RUN: validates the contract and performs zero network writes / zero spend.
const API=process.env.PRINTFUL_API_BASE||"https://api.printful.com";
function headers(){const h={"content-type":"application/json",accept:"application/json"};if(process.env.PRINTFUL_TOKEN)h.authorization="Bearer "+process.env.PRINTFUL_TOKEN;if(process.env.PRINTFUL_STORE_ID)h["X-PF-Store-Id"]=process.env.PRINTFUL_STORE_ID;return h}
export async function submitPrintfulOrder(contract,{mode="DRY_RUN"}={}){
  if(!contract?.external_id||!Array.isArray(contract.items)||contract.items.length!==1)throw new Error("Validated one-item order contract required");
  if(contract.safety?.spend!==false)throw new Error("Contract must originate from zero-spend safety state");
  if(mode==="DRY_RUN")return {ok:true,mode,external_id:contract.external_id,orderCreated:false,confirmed:false,spend:false};
  if(mode!=="CREATE_DRAFT")throw new Error("Unsupported mode; confirmation/spend is intentionally unavailable");
  if(!process.env.PRINTFUL_TOKEN)throw new Error("PRINTFUL_TOKEN required");
  const payload={external_id:contract.external_id,recipient:contract.recipient,items:contract.items};
  const r=await fetch(API+"/orders",{method:"POST",headers:headers(),body:JSON.stringify(payload)});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error("Printful draft order create failed HTTP "+r.status);
  return {ok:true,mode,external_id:contract.external_id,orderCreated:true,confirmed:false,spend:false,providerOrderId:body?.result?.id||null,providerStatus:body?.result?.status||null};
}
export const capabilities=Object.freeze({dryRun:true,createDraft:true,confirm:false,spend:false});
