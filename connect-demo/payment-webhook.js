import {mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

// Records access availability, never claims the customer downloaded the file.
// One atomic file per session avoids lost updates between concurrent sessions.
export async function processPaymentEvent(event,{stripe,stateDir,root,findOffer}) {
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return {ignored:true};
  if(!stateDir)throw new Error('Durable payment storage is required');
  const id=event.data?.object?.id;
  if(!/^cs_(live|test)_[a-zA-Z0-9]+$/.test(id||''))throw new Error('Invalid checkout session');
  const session=await stripe.checkout.sessions.retrieve(id);
  if(session.livemode!==event.livemode)throw new Error('Payment event mode mismatch');
  if(session.payment_status!=='paid'||session.status!=='complete')return {pending:true};
  // Test events cannot provision a live catalog purchase.
  if(session.livemode!==true)return {ignored:true,reason:'test_mode'};
  const offer=await findOffer(session.metadata?.mint_offer_id);
  if(!offer||session.metadata?.mint_mandate_id!==offer.mandate_id)throw new Error('Unrecognized paid offer');
  if(session.amount_total!==offer.price.unit_amount||session.currency!==offer.price.currency)throw new Error('Payment amount or currency mismatch');
  if(offer.fulfillment?.kind!=='FILE')throw new Error('Automatic physical fulfillment is not enabled');
  const artifact=path.resolve(root,offer.fulfillment.path);
  if(!artifact.startsWith(path.resolve(root)+path.sep))throw new Error('Invalid artifact path');
  if(!(await stat(artifact)).isFile())throw new Error('Download artifact unavailable');
  const dir=path.join(stateDir,'payment-entitlements');mkdirSync(dir,{recursive:true});
  const file=path.join(dir,id+'.json');
  try {const prior=JSON.parse(readFileSync(file,'utf8'));return {ready:true,idempotent:true,sessionId:prior.sessionId};}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const receipt={schema:'mint.payment.entitlement.v1',sessionId:id,offerId:offer.id,livemode:true,paidVerified:true,state:'READY_FOR_DOWNLOAD',artifact:offer.fulfillment.path,eventId:event.id,readyAt:new Date().toISOString(),customerDeliveryVerified:false};
  const tmp=file+'.'+randomUUID()+'.tmp';
  try {writeFileSync(tmp,JSON.stringify(receipt)+'\n',{mode:0o600});renameSync(tmp,file);}
  finally {try{unlinkSync(tmp)}catch(e){if(e.code!=='ENOENT')throw e;}}
  return {ready:true,sessionId:id};
}

export async function paymentWebhook(req,res,{stripe,secret,...deps}) {
  const reply=(code,data)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(!secret)return reply(503,{error:'Payment webhook is not configured'});
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>1048576)return reply(413,{error:'Payload too large'});chunks.push(chunk);}
  let event;
  try {event=stripe.webhooks.constructEvent(Buffer.concat(chunks),req.headers['stripe-signature'],secret);}
  catch {return reply(400,{error:'Invalid webhook signature'});}
  try {const result=await processPaymentEvent(event,{stripe,...deps});return reply(200,{received:true,...result});}
  catch(e){console.error('MINT_PAYMENT_WEBHOOK_FAILED',event.id,e.message);return reply(500,{error:'Payment processing failed; retry required'});}
}
