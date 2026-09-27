import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Stripe from 'stripe';

// One Stripe Client for every Stripe-related request in this application.
// PLACEHOLDER: set STRIPE_SECRET_KEY in the environment; never commit a real key.
const secretKey=process.env.STRIPE_SECRET_KEY;
const stripeConfigured=Boolean(secretKey&&!secretKey.includes('REPLACE_ME'));
// Construct the client only when configured. This lets /health report a useful
// configuration state instead of crashing the entire deployment before secrets exist.
const stripeClient=stripeConfigured?new Stripe(secretKey):null;
function requireStripe(){if(!stripeClient)throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in the deployment secret store using a Stripe TEST secret key first.');return stripeClient;} // SDK v22.6.2 automatically selects its pinned API version.
async function requireTestStripe(){const s=requireStripe();const balance=await s.balance.retrieve();if(balance.livemode!==false)throw new Error('MINT safety gate: this operation is TEST-only and the configured Stripe credentials are live.');return s;}

const PORT=Number(process.env.PORT||4242);
const APP_URL=process.env.APP_URL||('http://localhost:'+PORT);
const feeBps=Number(process.env.APPLICATION_FEE_BPS||1000);
if(!Number.isFinite(feeBps)||feeBps<0||feeBps>10000)throw new Error('APPLICATION_FEE_BPS must be between 0 and 10000.');

// Demo-only user -> Stripe account mapping. MINT currently has no application DB.
// Replace this Map with your DB table in production: {user_id, stripe_account_id}.
const userToAccount=new Map();

const send=(res,status,data,headers={})=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data))};
async function body(req){let raw='';for await(const chunk of req)raw+=chunk;if(!raw)return {};try{return JSON.parse(raw)}catch{throw new Error('Request body must be valid JSON.')}}

function onboardingState(account){
  const transferStatus=account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status||'unknown';
  const requirementsStatus=account?.requirements?.summary?.minimum_deadline?.status||null;
  return {
    transferStatus,
    readyToReceivePayments:transferStatus==='active',
    requirementsStatus,
    onboardingComplete:requirementsStatus!=='currently_due'&&requirementsStatus!=='past_due'
  };
}

async function createConnectedAccount(req,res){
  await requireTestStripe();
  const b=await body(req);
  if(!b.userId||!b.displayName||!b.email)return send(res,400,{error:'userId, displayName, and email are required.'});
  // Per the requested V2 Connect contract: do not add top-level type.
  const account=await stripeClient.v2.core.accounts.create({
    display_name:b.displayName,
    contact_email:b.email,
    identity:{country:'us'},
    dashboard:'express',
    defaults:{responsibilities:{fees_collector:'application',losses_collector:'application'}},
    configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}}
  });
  userToAccount.set(String(b.userId),account.id);
  send(res,201,{account,userId:b.userId});
}

async function accountStatus(accountId,res){
  // Always fetch current onboarding status directly from Stripe; no cached DB status.
  const account=await stripeClient.v2.core.accounts.retrieve(accountId,{include:['configuration.recipient','requirements']});
  send(res,200,{accountId,...onboardingState(account),account});
}

async function onboardingLink(accountId,res){
  // Account Links are single-use. The refresh URL regenerates a link through this app.
  const accountLink=await stripeClient.v2.core.accountLinks.create({
    account:accountId,
    use_case:{type:'account_onboarding',account_onboarding:{
      configurations:['recipient'],
      refresh_url:APP_URL+'/refresh-onboarding?accountId='+encodeURIComponent(accountId),
      return_url:APP_URL+'/?accountId='+encodeURIComponent(accountId)
    }}
  });
  send(res,200,{url:accountLink.url});
}

async function createProduct(req,res){
  await requireTestStripe();
  const b=await body(req);
  if(!b.name||!b.connectedAccountId||!Number.isFinite(b.price)||b.price<0.5)return send(res,400,{error:'name, connectedAccountId and price >= 0.50 are required.'});
  const currency=String(b.currency||'usd').toLowerCase();
  const priceInCents=Math.round(b.price*100);
  // Product is deliberately created on the PLATFORM. Seller mapping is durable in metadata.
  const product=await stripeClient.products.create({
    name:b.name,
    description:b.description||undefined,
    metadata:{connected_account_id:b.connectedAccountId},
    default_price_data:{unit_amount:priceInCents,currency}
  });
  send(res,201,{product});
}

async function storefront(res){
  // List V2 connected accounts from Stripe itself and retrieve current status for each.
  const accountPage=await stripeClient.v2.core.accounts.list();
  const accounts=[];
  for(const a of accountPage.data||[]){
    const current=await stripeClient.v2.core.accounts.retrieve(a.id,{include:['configuration.recipient','requirements']});
    accounts.push({...current,...onboardingState(current)});
  }
  // Expand default_price so the browser can render the platform catalog without another secret-key request.
  const products=await stripeClient.products.list({limit:100,active:true,expand:['data.default_price']});
  send(res,200,{accounts,products:products.data});
}

async function checkout(req,res){
  await requireTestStripe();
  const b=await body(req);
  if(!b.productId)return send(res,400,{error:'productId is required.'});
  const product=await stripeClient.products.retrieve(b.productId,{expand:['default_price']});
  const destination=product.metadata?.connected_account_id;
  const price=product.default_price;
  if(!destination)return send(res,400,{error:'Product has no connected_account_id metadata mapping.'});
  if(!price||typeof price==='string'||!Number.isInteger(price.unit_amount))return send(res,400,{error:'Product needs a one-time default price with unit_amount.'});

  // Refuse checkout until the destination account is actually capable of receiving transfers.
  const account=await stripeClient.v2.core.accounts.retrieve(destination,{include:['configuration.recipient','requirements']});
  const state=onboardingState(account);
  if(!state.readyToReceivePayments)return send(res,409,{error:'Seller is not ready to receive Stripe transfers. Complete onboarding first.',status:state});

  const applicationFeeAmount=Math.round(price.unit_amount*feeBps/10000);
  // Destination charge: customer pays the platform; Stripe transfers the destination amount
  // to the connected account and leaves the configured application fee with the platform.
  const session=await stripeClient.checkout.sessions.create({
    line_items:[{price:price.id,quantity:1}],
    payment_intent_data:{
      application_fee_amount:applicationFeeAmount,
      transfer_data:{destination}
    },
    mode:'payment',
    success_url:APP_URL+'/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:APP_URL+'/?checkout=cancelled'
  });
  send(res,201,{id:session.id,url:session.url});
}

async function verifyCheckout(sessionId,res){
  // Read-only TEST reconciliation endpoint. Never creates, captures, refunds, or transfers funds.
  const s=await requireTestStripe();
  const session=await s.checkout.sessions.retrieve(sessionId,{expand:['payment_intent.latest_charge','payment_intent.latest_charge.balance_transaction']});
  const pi=typeof session.payment_intent==='object'?session.payment_intent:null;
  const charge=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
  const bt=charge&&typeof charge.balance_transaction==='object'?charge.balance_transaction:null;
  let fee=null,transfer=null;
  if(charge?.application_fee){
    const x=await s.applicationFees.retrieve(typeof charge.application_fee==='string'?charge.application_fee:charge.application_fee.id);
    fee={id:x.id,amount:x.amount,currency:x.currency,balance_transaction:typeof x.balance_transaction==='string'?x.balance_transaction:x.balance_transaction?.id||null};
  }
  if(charge?.transfer){
    const x=await s.transfers.retrieve(typeof charge.transfer==='string'?charge.transfer:charge.transfer.id);
    transfer={id:x.id,amount:x.amount,currency:x.currency,destination:typeof x.destination==='string'?x.destination:x.destination?.id||null};
  }
  return send(res,200,{
    session:{id:session.id,status:session.status,payment_status:session.payment_status,amount_total:session.amount_total,currency:session.currency,livemode:session.livemode,payment_intent:pi?.id||session.payment_intent||null},
    payment_intent:pi?{id:pi.id,status:pi.status,amount:pi.amount,currency:pi.currency}:null,
    charge:charge?{id:charge.id,status:charge.status,paid:charge.paid,amount:charge.amount,currency:charge.currency,application_fee:typeof charge.application_fee==='string'?charge.application_fee:charge.application_fee?.id||null,application_fee_amount:charge.application_fee_amount,transfer:typeof charge.transfer==='string'?charge.transfer:charge.transfer?.id||null,destination:typeof charge.destination==='string'?charge.destination:charge.destination?.id||null,balance_transaction:bt?.id||(typeof charge.balance_transaction==='string'?charge.balance_transaction:null)}:null,
    application_fee:fee,
    transfer,
    balance_transaction:bt?{id:bt.id,amount:bt.amount,fee:bt.fee,net:bt.net,type:bt.type,status:bt.status}:null
  });
}

async function moneyState(res){
  // Read-only machine ledger derived from Stripe. TEST-only while MINT is proving the rail.
  const s=await requireTestStripe();
  const sessions=await s.checkout.sessions.list({limit:25,expand:['data.payment_intent.latest_charge','data.payment_intent.latest_charge.balance_transaction']});
  const rows=[];
  let totals={created:0,paid:0,pending:0,settled:0,gross:0,processorFees:0,net:0,applicationFees:0};
  for(const session of sessions.data){
    const pi=typeof session.payment_intent==='object'?session.payment_intent:null;
    const ch=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
    const bt=ch&&typeof ch.balance_transaction==='object'?ch.balance_transaction:null;
    const state=session.payment_status!=='paid'?'created':bt?.status==='available'?'settled':'pending';
    totals[state]=(totals[state]||0)+1;
    if(session.payment_status==='paid')totals.paid++;
    if(ch?.paid){totals.gross+=ch.amount||0;totals.applicationFees+=ch.application_fee_amount||0;}
    if(bt){totals.processorFees+=bt.fee||0;totals.net+=bt.net||0;}
    rows.push({sessionId:session.id,state,paymentStatus:session.payment_status,amount:session.amount_total,currency:session.currency,livemode:session.livemode,paymentIntent:pi?.id||null,charge:ch?.id||null,destination:typeof ch?.destination==='string'?ch.destination:ch?.destination?.id||null,applicationFeeAmount:ch?.application_fee_amount||0,balanceTransaction:bt?{id:bt.id,status:bt.status,fee:bt.fee,net:bt.net,available_on:bt.available_on}:null});
  }
  return send(res,200,{ok:true,mode:'test',generatedAt:new Date().toISOString(),totals,transactions:rows});
}

async function fulfillCheckout(sessionId,res){
  const s=await requireTestStripe();
  const session=await s.checkout.sessions.retrieve(sessionId,{expand:['line_items.data.price.product']});
  if(session.livemode!==false)return send(res,409,{error:'MINT fulfillment safety gate: TEST sessions only.'});
  if(session.payment_status!=='paid'||session.status!=='complete')return send(res,402,{error:'Verified successful payment is required before fulfillment.',payment_status:session.payment_status,status:session.status});
  const items=session.line_items?.data||[];
  const product=items[0]?.price?.product;
  const productId=typeof product==='string'?product:product?.id;
  if(productId!=='prod_VL4ZGypBcYFCWH')return send(res,404,{error:'No automatic fulfillment mapping exists for this product.'});
  const file=path.join(root,'..','products','foundry-express-ts','README.md');
  await stat(file);
  res.writeHead(200,{'content-type':'text/markdown; charset=utf-8','content-disposition':'attachment; filename="foundry-express-ts-README.md"','x-mint-fulfillment':'verified-test-payment'});
  createReadStream(file).pipe(res);
}

async function thinWebhook(req,res){
  const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!webhookSecret||webhookSecret.includes('REPLACE_ME'))return send(res,500,{error:'Missing STRIPE_WEBHOOK_SECRET. Set the signing secret from your Stripe event destination or Stripe CLI.'});
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);
  const sig=req.headers['stripe-signature'];
  if(!sig)return send(res,400,{error:'Missing Stripe-Signature header.'});
  let thinEvent;
  try{thinEvent=stripeClient.parseThinEvent(raw.toString('utf8'),sig,webhookSecret)}
  catch(e){return send(res,400,{error:'Invalid thin-event signature: '+e.message})}

  // Thin notifications contain references, not a versioned snapshot. Retrieve the event.
  const event=await stripeClient.v2.core.events.retrieve(thinEvent.id);
  switch(event.type){
    case 'v2.core.account[requirements].updated':
      console.log('Connected-account requirements changed:',event.id,event.data);
      break;
    case 'v2.core.account[recipient].capability_status_updated':
    case 'v2.core.account[.recipient].capability_status_updated':
      console.log('Recipient capability status changed:',event.id,event.data);
      break;
    default:
      console.log('Unhandled Stripe thin event:',event.type,event.id);
  }
  send(res,200,{received:true,eventId:event.id,type:event.type});
}

async function serveFile(res,file,type){const data=await readFile(file);res.writeHead(200,{'content-type':type});res.end(data)}
const root=path.dirname(fileURLToPath(import.meta.url));

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,APP_URL);
    if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,stripeConfigured,webhookConfigured:Boolean(process.env.STRIPE_WEBHOOK_SECRET)});
    if(req.method==='GET'&&u.pathname==='/api/stripe-check') { const s=requireStripe(); const balance=await s.balance.retrieve(); const products=await s.products.list({limit:1}); return send(res,200,{ok:true,stripeAuthenticated:true,livemode:balance.livemode,testMode:balance.livemode===false,catalogReadable:true}); }
    if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/refresh-onboarding')||u.pathname.startsWith('/webhooks/'))requireStripe();
    if(req.method==='GET'&&u.pathname==='/')return serveFile(res,path.join(root,'public/index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/success')return serveFile(res,path.join(root,'public/success.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/api/storefront')return storefront(res);
    if(req.method==='GET'&&u.pathname==='/api/money-state')return moneyState(res);
    if(req.method==='POST'&&u.pathname==='/api/accounts')return createConnectedAccount(req,res);
    let m=u.pathname.match(/^\/api\/accounts\/([^/]+)\/status$/);
    if(req.method==='GET'&&m)return accountStatus(decodeURIComponent(m[1]),res);
    m=u.pathname.match(/^\/api\/accounts\/([^/]+)\/onboarding-link$/);
    if(req.method==='POST'&&m)return onboardingLink(decodeURIComponent(m[1]),res);
    if(req.method==='GET'&&u.pathname==='/refresh-onboarding'){
      const id=u.searchParams.get('accountId');if(!id)return send(res,400,{error:'accountId is required.'});
      const link=await stripeClient.v2.core.accountLinks.create({account:id,use_case:{type:'account_onboarding',account_onboarding:{configurations:['recipient'],refresh_url:APP_URL+'/refresh-onboarding?accountId='+encodeURIComponent(id),return_url:APP_URL+'/?accountId='+encodeURIComponent(id)}}});
      res.writeHead(303,{location:link.url});return res.end();
    }
    if(req.method==='POST'&&u.pathname==='/api/products')return createProduct(req,res);
    if(req.method==='POST'&&u.pathname==='/api/checkout')return checkout(req,res);
    m=u.pathname.match(/^\/api\/checkout\/([^/]+)\/verify$/);
    if(req.method==='GET'&&m)return verifyCheckout(decodeURIComponent(m[1]),res);
    m=u.pathname.match(/^\/api\/fulfill\/([^/]+)$/);
    if(req.method==='GET'&&m)return fulfillCheckout(decodeURIComponent(m[1]),res);
    if(req.method==='POST'&&u.pathname==='/webhooks/stripe')return thinWebhook(req,res);
    send(res,404,{error:'Not found'});
  }catch(e){console.error(e);send(res,500,{error:e?.message||'Unexpected server error.'})}
});
server.listen(PORT,()=>console.log('MINT Stripe Connect demo listening on '+APP_URL));
