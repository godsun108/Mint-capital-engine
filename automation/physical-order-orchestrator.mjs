import {buildPrintfulOrderContract} from "./providers/printful-order-contract.mjs";
import {submitPrintfulOrder} from "./providers/printful-order-submit.mjs";
import {createPhysicalOrder,transitionPhysicalOrder,assertIdempotentIdentity} from "./physical-order-state-machine.mjs";

// Zero-spend PRESS orchestrator. Provider creation is intentionally not enabled here yet.
export async function orchestratePhysicalOrder({session,offer,existing=null}={}){
  if(!session?.id||!offer?.id)throw new Error("session and offer required");
  const externalId="mint-"+session.id;
  if(existing)assertIdempotentIdentity(existing,{sessionId:session.id,externalId});
  let order=existing||createPhysicalOrder({sessionId:session.id,offerId:offer.id,externalId});
  if(order.state==="PAID"){
    const contract=buildPrintfulOrderContract({session,fulfillment:offer.fulfillment});
    order=transitionPhysicalOrder(order,"CONTRACT_READY",{evidence:"PRINTFUL_ORDER_CONTRACT_VALIDATED"});
    const dryRun=await submitPrintfulOrder(contract,{mode:"DRY_RUN"});
    return {ok:true,mode:"ZERO_SPEND_SIMULATION",order,contract,dryRun,next:"DRAFT_CREATE_REQUIRES_SEPARATE_EXPLICIT_ENABLEMENT",spend:false};
  }
  return {ok:true,mode:"RESUME",order,next:"RECONCILE_OR_ADVANCE_FROM_CURRENT_STATE",spend:false};
}
