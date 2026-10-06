// PRESS durable physical-order state machine.
// Pure transitions: persistence belongs to the caller so state can survive process restarts.
export const PHYSICAL_ORDER_STATES=Object.freeze([
  "PAID","CONTRACT_READY","DRAFT_CREATED","PROVIDER_PENDING","SHIPPED","FULFILLED","EXCEPTION","CANCELED","FROZEN"
]);
const ALLOWED=Object.freeze({
  PAID:["CONTRACT_READY","EXCEPTION","FROZEN"],
  CONTRACT_READY:["DRAFT_CREATED","EXCEPTION","FROZEN"],
  DRAFT_CREATED:["PROVIDER_PENDING","CANCELED","EXCEPTION","FROZEN"],
  PROVIDER_PENDING:["SHIPPED","FULFILLED","CANCELED","EXCEPTION","FROZEN"],
  SHIPPED:["FULFILLED","EXCEPTION","FROZEN"],
  FULFILLED:[],
  EXCEPTION:["FROZEN"],
  CANCELED:[],
  FROZEN:[]
});
export function createPhysicalOrder({sessionId,offerId,externalId}={}){
  if(!sessionId||!offerId||!externalId)throw new Error("sessionId, offerId, externalId required");
  return {schema:"mint.physical-order.v1",sessionId,offerId,externalId,state:"PAID",providerOrderId:null,history:[{state:"PAID",at:new Date().toISOString(),evidence:"STRIPE_PAID_COMPLETE"}]};
}
export function transitionPhysicalOrder(order,next,{evidence=null,providerOrderId=null}={}){
  if(!order||!PHYSICAL_ORDER_STATES.includes(order.state))throw new Error("Valid physical order required");
  if(!PHYSICAL_ORDER_STATES.includes(next))throw new Error("Unknown next state");
  if(!(ALLOWED[order.state]||[]).includes(next))throw new Error("Illegal physical-order transition "+order.state+" -> "+next);
  if(order.providerOrderId&&providerOrderId&&order.providerOrderId!==providerOrderId)throw new Error("Provider order identity mismatch");
  return {...order,state:next,providerOrderId:order.providerOrderId||providerOrderId||null,history:[...(order.history||[]),{state:next,at:new Date().toISOString(),evidence}]};
}
export function assertIdempotentIdentity(existing,{sessionId,externalId}={}){
  if(!existing)return true;
  if(existing.sessionId!==sessionId||existing.externalId!==externalId)throw new Error("Idempotency identity conflict");
  return true;
}
export const capabilities=Object.freeze({durableByContract:true,idempotentIdentity:true,duplicateProviderOrderGuard:true,exceptionFreeze:true,spend:false});
