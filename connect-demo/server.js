import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createReadStream,existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Stripe from 'stripe';
import {handleRequestError} from './request-error.js';
import {startRuntime,getRuntimeState} from './fge-runtime.js';

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
// Privacy-light, process-local acquisition counters. These intentionally store no IPs, user agents, cookies, or personal identifiers.
// Railway restarts reset them; the API labels that limitation explicitly and the learning heartbeat may snapshot aggregates externally.
const durableStateConfigured=Boolean(process.env.MINT_STATE_DIR);
const fulfillmentDir=process.env.MINT_STATE_DIR||path.join(process.cwd(),'.mint-state');
const fulfillmentPath=path.join(fulfillmentDir,'fulfillment-receipts.json');
function readFulfillmentReceipts(){try{return JSON.parse(readFileSync(fulfillmentPath,'utf8'))}catch{return {schema:'mint.fulfillment.receipts.v1',receipts:{}}}}
function writeFulfillmentReceipts(x){mkdirSync(fulfillmentDir,{recursive:true});const tmp=fulfillmentPath+'.tmp';writeFileSync(tmp,JSON.stringify(x,null,2)+'\n');renameSync(tmp,fulfillmentPath)}
const acquisitionStartedAt=new Date().toISOString();

// Gumroad OAuth bridge. Credentials belong in the deployment secret store, never Git.
// The callback is intentionally useful before credentials exist: Gumroad can register
// this stable HTTPS redirect URI now; token exchange is enabled only after secrets land.
const gumroadAccessToken=process.env.GUMROAD_ACCESS_TOKEN||'';
const gumroadClientId=process.env.GUMROAD_CLIENT_ID||'';
const gumroadClientSecret=process.env.GUMROAD_CLIENT_SECRET||'';
const gumroadRedirectUri=process.env.GUMROAD_REDIRECT_URI||(APP_URL+'/integrations/gumroad/callback');
const gumroadOauthConfigured=Boolean(gumroadClientId&&gumroadClientSecret);
const gumroadConfigured=Boolean(gumroadAccessToken||gumroadOauthConfigured);

async function gumroadApi(pathname){
  if(!gumroadAccessToken)throw new Error('Gumroad access token is not configured.');
  const response=await fetch('https://api.gumroad.com/v2'+pathname,{headers:{authorization:'Bearer '+gumroadAccessToken,accept:'application/json'}});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload?.success===false)throw new Error('Gumroad API request failed with HTTP '+response.status+'.');
  return payload;
}
async function gumroadCheck(res){
  if(!gumroadAccessToken)return send(res,503,{ok:false,provider:'gumroad',configured:false,error:'GUMROAD_ACCESS_TOKEN is not configured.'});
  try{
    const user=await gumroadApi('/user');
    return send(res,200,{ok:true,provider:'gumroad',configured:true,authenticated:true,user:{id:user?.user?.user_id||user?.user?.id||null,name:user?.user?.name||null}});
  }catch(e){
    return send(res,502,{ok:false,provider:'gumroad',configured:true,authenticated:false,error:e.message});
  }
}

async function gumroadProducts(res){
  if(!gumroadAccessToken)return send(res,503,{ok:false,provider:'gumroad',configured:false,error:'GUMROAD_ACCESS_TOKEN is not configured.'});
  try{
    const payload=await gumroadApi('/products');
    const products=(payload?.products||[]).map(p=>({id:p.id,name:p.name,permalink:p.custom_permalink||p.url||p.short_url||null,price:p.formatted_price||null,published:p.published??null}));
    return send(res,200,{ok:true,provider:'gumroad',count:products.length,products});
  }catch(e){return send(res,502,{ok:false,provider:'gumroad',error:e.message});}
}

async function gumroadSales(res){
  if(!gumroadAccessToken)return send(res,503,{ok:false,provider:'gumroad',configured:false,error:'GUMROAD_ACCESS_TOKEN is not configured.'});
  try{
    const payload=await gumroadApi('/sales');
    const sales=(payload?.sales||[]).map(s=>({id:s.id,product_id:s.product_id,product_name:s.product_name,price:s.formatted_display_price||null,currency:s.currency||null,created_at:s.created_at,refunded:Boolean(s.refunded),chargeback:Boolean(s.chargebacked)}));
    return send(res,200,{ok:true,provider:'gumroad',count:sales.length,sales});
  }catch(e){return send(res,502,{ok:false,provider:'gumroad',error:e.message});}
}

const acquisitionPath=path.join(fulfillmentDir,'acquisition-aggregates.json');
function readAcquisitionCounters(){
  if(!durableStateConfigured)return new Map();
  try{
    const x=JSON.parse(readFileSync(acquisitionPath,'utf8'));
    return new Map(Object.entries(x.counters||{}).map(([k,v])=>[k,Number(v)||0]));
  }catch{return new Map();}
}
const acquisitionCounters=readAcquisitionCounters();
function persistAcquisitionCounters(){
  if(!durableStateConfigured)return;
  mkdirSync(fulfillmentDir,{recursive:true});
  const out={schema:'mint.acquisition.aggregates.v1',updatedAt:new Date().toISOString(),privacy:'Aggregate offer/source/event counts only. No IP, cookie, user-agent, or personal identifier.',counters:Object.fromEntries(acquisitionCounters)};
  const tmp=acquisitionPath+'.tmp';writeFileSync(tmp,JSON.stringify(out,null,2)+'\n');renameSync(tmp,acquisitionPath);
}
function countAcquisition(event,source,offerId){const key=offerId+'|'+source+'|'+event;acquisitionCounters.set(key,(acquisitionCounters.get(key)||0)+1);persistAcquisitionCounters();}

async function gumroadCallback(u,res){
  const error=u.searchParams.get('error');
  if(error)return send(res,400,{ok:false,provider:'gumroad',error});
  const code=u.searchParams.get('code');
  if(!code)return send(res,200,{ok:true,provider:'gumroad',callbackReady:true,configured:gumroadConfigured,redirectUri:gumroadRedirectUri,message:'Gumroad OAuth callback is reachable. Authorization code required for token exchange.'});
  if(!gumroadOauthConfigured)return send(res,503,{ok:false,provider:'gumroad',callbackReady:true,configured:false,error:'Set GUMROAD_CLIENT_ID and GUMROAD_CLIENT_SECRET in the deployment secret store before OAuth authorization.'});
  const form=new URLSearchParams({client_id:gumroadClientId,client_secret:gumroadClientSecret,code,grant_type:'authorization_code',redirect_uri:gumroadRedirectUri});
  const response=await fetch('https://app.gumroad.com/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:form});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.access_token)return send(res,502,{ok:false,provider:'gumroad',error:'OAuth token exchange failed.',status:response.status});
  // Deliberately do not print, persist, or return the access token. Durable secret
  // storage is a separate deployment concern; fail closed rather than leak a token.
  return send(res,200,{ok:true,provider:'gumroad',authorized:true,tokenReceived:true,tokenPersisted:false,next:'Store the returned token through the deployment secret workflow; this callback intentionally does not expose it.'});
}

const PAGES_ORIGIN='https://godsun108.github.io';
const acquisitionCors={'access-control-allow-origin':PAGES_ORIGIN,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'};
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
  // Connected-account status is supplementary to the owned product catalog. If
  // Stripe withholds that permission, keep the public storefront usable and
  // expose a truthful degraded status instead of returning a generic 500.
  const accounts=[];
  let accountsStatus='available';
  try{
    const accountPage=await stripeClient.v2.core.accounts.list();
    for(const a of accountPage.data||[]){
      const current=await stripeClient.v2.core.accounts.retrieve(a.id,{include:['configuration.recipient','requirements']});
      accounts.push({...current,...onboardingState(current)});
    }
  }catch(e){
    accountsStatus='unavailable';
    console.warn('MINT_STOREFRONT_DEGRADED',JSON.stringify({type:e?.type||'unknown',code:e?.code||'unknown'}));
  }
  // Expand default_price so the browser can render the platform catalog without another secret-key request.
  const products=await stripeClient.products.list({limit:100,active:true,expand:['data.default_price']});
  send(res,200,{accounts,accountsStatus,products:products.data});
}

async function checkout(req,res){
  const s=requireStripe();
  const balance=await s.balance.retrieve();
  const b=await body(req);
  const source=typeof b.source==='string'&&/^[a-z0-9_-]{1,48}$/.test(b.source)?b.source:'direct';
  // LIVE rail is deliberately direct-to-platform: no Connect account, transfer,
  // application fee, payout, or customer-management privileges are required.
  if(balance.livemode===true){
    // Fail closed: live offers must exist in the repository catalog, be ACTIVE, and carry an explicit mandate.
    const offer=await liveOffer(String(b.productId||''));
    if(!offer)return send(res,403,{error:'Offer is not active and mandate-approved for live checkout.'});
    const session=await s.checkout.sessions.create({
      line_items:[{price_data:{currency:offer.price.currency,unit_amount:offer.price.unit_amount,product_data:{name:offer.name,description:offer.description}},quantity:1}],
      mode:'payment',
      ...(offer.type==='PHYSICAL_POD'?{shipping_address_collection:{allowed_countries:['US']}}:{}),
      metadata:{mint_offer_id:offer.id,mint_mandate_id:offer.mandate_id,mint_source:source},
      payment_intent_data:{metadata:{mint_offer_id:offer.id,mint_mandate_id:offer.mandate_id,mint_source:source}},
      success_url:APP_URL+'/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:APP_URL+'/?checkout=cancelled'
    });
    console.log('MINT_COMMERCE',JSON.stringify({event:'CHECKOUT_SESSION_CREATED',source,offerId:offer.id,sessionId:session.id,at:new Date().toISOString()}));
    return send(res,201,{id:session.id,url:session.url,mode:'live',offerId:offer.id});
  }
  await requireTestStripe();
  if(!b.productId)return send(res,400,{error:'productId is required.'});
  if(b.productId!=='prod_VL4ZGypBcYFCWH')return send(res,403,{error:'Public TEST checkout is limited to the mandate-approved Foundry product.'});
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
  const s=requireStripe();
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
  // Read-only machine ledger derived from Stripe. Provider availability is not
  // represented as bank settlement; MINT preserves PAID != SETTLED.
  const s=requireStripe();
  // Determine mode from Stripe even when no checkout sessions exist.
  const balance=await s.balance.retrieve();
  if(typeof balance.livemode!=='boolean')throw new Error('Stripe did not return an authoritative account mode.');
  const sessions=await s.checkout.sessions.list({limit:25,expand:['data.payment_intent.latest_charge','data.payment_intent.latest_charge.balance_transaction']});
  const rows=[];
  let totals={created:0,paid:0,pending:0,provider_available:0,settled:0,gross:0,processorFees:0,net:0,applicationFees:0};
  for(const session of sessions.data){
    const pi=typeof session.payment_intent==='object'?session.payment_intent:null;
    const ch=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
    const bt=ch&&typeof ch.balance_transaction==='object'?ch.balance_transaction:null;
    const state=session.payment_status!=='paid'?'created':bt?.status==='available'?'provider_available':'pending';
    totals[state]=(totals[state]||0)+1;
    if(session.payment_status==='paid')totals.paid++;
    if(ch?.paid){totals.gross+=ch.amount||0;totals.applicationFees+=ch.application_fee_amount||0;}
    if(bt){totals.processorFees+=bt.fee||0;totals.net+=bt.net||0;}
    rows.push({sessionId:session.id,state,source:session.metadata?.mint_source||'unknown',offerId:session.metadata?.mint_offer_id||null,paymentStatus:session.payment_status,amount:session.amount_total,currency:session.currency,livemode:session.livemode,paymentIntent:pi?.id||null,charge:ch?.id||null,destination:typeof ch?.destination==='string'?ch.destination:ch?.destination?.id||null,applicationFeeAmount:ch?.application_fee_amount||0,balanceTransaction:bt?{id:bt.id,status:bt.status,fee:bt.fee,net:bt.net,available_on:bt.available_on}:null});
  }
  return send(res,200,{ok:true,mode:(balance.livemode?'live':'test'),settledDefinition:'Requires independent destination-cash evidence; Stripe availability alone is not SETTLED.',generatedAt:new Date().toISOString(),totals,transactions:rows});
}

async function fulfillCheckout(sessionId,res){
  if(!durableStateConfigured)return send(res,503,{error:'Durable fulfillment storage is not configured. Set MINT_STATE_DIR to a persistent mounted path before live fulfillment.',code:'MINT_DURABLE_STORAGE_REQUIRED'});
  const s=requireStripe();
  const session=await s.checkout.sessions.retrieve(sessionId,{expand:['line_items.data.price.product']});
  if(session.payment_status!=='paid'||session.status!=='complete')return send(res,402,{error:'Verified successful payment is required before fulfillment.',payment_status:session.payment_status,status:session.status});
  const items=session.line_items?.data||[];
  const product=items[0]?.price?.product;
  const productId=typeof product==='string'?product:product?.id;
  let fulfillment=null;
  if(session.livemode===true){
    const offer=await liveOffer(session.metadata?.mint_offer_id);
    if(offer?.fulfillment?.kind==='FILE'||offer?.fulfillment?.kind==='PRINTFUL_POD') fulfillment=offer.fulfillment;
  } else if(productId==='prod_VL4ZGypBcYFCWH'){
    fulfillment={kind:'FILE',path:'deliverables/foundry-express-ts/README.md',filename:'foundry-express-ts-README.md',content_type:'text/markdown; charset=utf-8'};
  }
  if(!fulfillment)return send(res,404,{error:'No automatic fulfillment mapping exists for this verified offer.'});
  if(fulfillment.kind==='PRINTFUL_POD'){
    const receipts=readFulfillmentReceipts();
    const prior=receipts.receipts[session.id];
    if(prior)return send(res,200,{ok:true,idempotent:true,receipt:prior});
    const checkoutReady=Boolean(session.customer_details?.name&&session.customer_details?.email&&session.customer_details?.address?.line1&&session.customer_details?.address?.city&&session.customer_details?.address?.postal_code&&session.customer_details?.address?.country);
    if(!checkoutReady)return send(res,422,{ok:false,orderCreated:false,spend:false,error:'Paid physical checkout is missing required shipping details.'});
    // Physical fulfillment remains fail-closed until the order adapter is separately enabled.
    // This branch proves paid-session routing without creating an order or spending money.
    const receipt={sessionId:session.id,offerId:session.metadata?.mint_offer_id||null,source:session.metadata?.mint_source||'unknown',livemode:session.livemode,paidVerified:true,fulfillmentKind:'PRINTFUL_POD',provider:'printful',providerOrderId:null,state:'PAID_AWAITING_PRINTFUL_ORDER_ADAPTER',catalogProductId:fulfillment.catalog_product_id,catalogVariantId:fulfillment.catalog_variant_id,createdAt:new Date().toISOString()};
    receipts.receipts[session.id]=receipt;writeFulfillmentReceipts(receipts);
    console.log('MINT_COMMERCE',JSON.stringify({event:'PHYSICAL_FULFILLMENT_STAGED',sessionId:session.id,offerId:receipt.offerId,at:receipt.createdAt}));
    return send(res,202,{ok:true,spend:false,orderCreated:false,receipt});
  }
  const file=path.join(root,fulfillment.path);
  await stat(file);
  const receipts=readFulfillmentReceipts();
  const prior=receipts.receipts[session.id];
  if(!prior){
    receipts.receipts[session.id]={sessionId:session.id,offerId:session.metadata?.mint_offer_id||productId||null,source:session.metadata?.mint_source||'unknown',livemode:session.livemode,paidVerified:true,fulfilledAt:new Date().toISOString(),artifact:fulfillment.path};
    writeFulfillmentReceipts(receipts);
    console.log('MINT_COMMERCE',JSON.stringify({event:'FULFILLED',sessionId:session.id,offerId:receipts.receipts[session.id].offerId,livemode:session.livemode,at:receipts.receipts[session.id].fulfilledAt}));
  }
  res.writeHead(200,{'content-type':fulfillment.content_type||'application/octet-stream','content-disposition':'attachment; filename="'+fulfillment.filename.replace(/["\\]/g,'')+'"','x-mint-fulfillment':session.livemode?'verified-live-payment':'verified-test-payment'});
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

async function acquisitionEvent(req,res){
  const payload=await body(req);
  const event=String(payload.event||"");
  const source=String(payload.source||"direct").toLowerCase();
  const offerId=String(payload.offerId||"");
  const allowed=new Set(["VISITED","CHECKOUT_STARTED"]);
  if(!allowed.has(event)||!/^[a-z0-9_-]{1,48}$/.test(source)||!/^[a-z0-9_-]{1,80}$/.test(offerId))return send(res,400,{error:"Invalid acquisition event."});
  const offer=await liveOffer(offerId); if(!offer)return send(res,403,{error:"Unknown or inactive offer."});
  countAcquisition(event,source,offerId);
  console.log("MINT_ACQUISITION",JSON.stringify({event,source,offerId,at:new Date().toISOString()}));
  return send(res,202,{ok:true,event,source,offerId},acquisitionCors);
}

async function fulfillmentEvidence(res){
  const x=readFulfillmentReceipts();
  const receipts=Object.values(x.receipts||{}).filter(r=>r.livemode===true);
  return send(res,durableStateConfigured?200:503,{ok:durableStateConfigured,schema:'mint.fulfillment.evidence.v1',durableStorageConfigured:durableStateConfigured,generatedAt:new Date().toISOString(),semantics:'SERVER_RECORDED_DELIVERY_AFTER_STRIPE_PAID_VERIFICATION; LIVE_CERTIFICATION_REQUIRES_PERSISTENT_MINT_STATE_DIR',total:receipts.length,receipts});
}

async function commerceEvidence(res){
  const s=requireStripe();
  const sessions=await s.checkout.sessions.list({limit:100,expand:['data.payment_intent.latest_charge','data.payment_intent.latest_charge.balance_transaction']});
  const rows=sessions.data.filter(x=>x.metadata?.mint_offer_id).map(session=>{
    const pi=typeof session.payment_intent==='object'?session.payment_intent:null;
    const ch=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
    const bt=ch&&typeof ch.balance_transaction==='object'?ch.balance_transaction:null;
    const paid=session.status==='complete'&&session.payment_status==='paid'&&Boolean(ch?.paid);
    return {sessionId:session.id,offerId:session.metadata?.mint_offer_id||null,source:session.metadata?.mint_source||'unknown',livemode:session.livemode,checkoutComplete:session.status==='complete',paid,amount:session.amount_total,currency:session.currency,chargeId:ch?.id||null,providerAvailable:bt?.status==='available',created:session.created};
  });
  const live=rows.filter(x=>x.livemode===true);
  return send(res,200,{ok:true,schema:'mint.commerce.evidence.v1',generatedAt:new Date().toISOString(),semantics:'STRIPE_SERVER_VERIFIED_CHECKOUT_AND_PAYMENT_ONLY; FULFILLMENT_AND_BANK_SETTLEMENT_REQUIRE_SEPARATE_EVIDENCE',totals:{sessions:live.length,paid:live.filter(x=>x.paid).length,providerAvailable:live.filter(x=>x.providerAvailable).length},transactions:live});
}

async function fgeObserve(){
  const sources={};
  for(const [key,count] of acquisitionCounters){const [source,event]=key.split('|');sources[source]||={visits:0,checkoutStarted:0,paid:0,fulfilled:0};if(event==='VISITED')sources[source].visits+=count;if(event==='CHECKOUT_STARTED')sources[source].checkoutStarted+=count;}
  if(!stripeClient)return {sources};
  const sessions=await stripeClient.checkout.sessions.list({limit:100,expand:['data.payment_intent.latest_charge']});
  for(const session of sessions.data||[]){if(session.livemode!==true||!session.metadata?.mint_offer_id)continue;const source=session.metadata?.mint_source||'unknown';sources[source]||={visits:0,checkoutStarted:0,paid:0,fulfilled:0};const pi=typeof session.payment_intent==='object'?session.payment_intent:null;const ch=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;if(session.status==='complete'&&session.payment_status==='paid'&&Boolean(ch?.paid))sources[source].paid+=1;}
  const receipts=Object.values(readFulfillmentReceipts().receipts||{}).filter(x=>x.livemode===true);for(const receipt of receipts){const source=receipt.source||receipt.mint_source||'unknown';sources[source]||={visits:0,checkoutStarted:0,paid:0,fulfilled:0};sources[source].fulfilled+=1;}
  return {sources};
}

async function acquisitionState(res){
  const sources={},offers={};
  for(const [key,count] of acquisitionCounters){const [offerId,source,event]=key.split('|');sources[source]||={VISITED:0,CHECKOUT_STARTED:0};sources[source][event]+=count;offers[offerId]||={VISITED:0,CHECKOUT_STARTED:0,sources:{}};offers[offerId][event]+=count;offers[offerId].sources[source]||={VISITED:0,CHECKOUT_STARTED:0};offers[offerId].sources[source][event]+=count;}
  const totals=Object.values(sources).reduce((a,x)=>({VISITED:a.VISITED+(x.VISITED||0),CHECKOUT_STARTED:a.CHECKOUT_STARTED+(x.CHECKOUT_STARTED||0)}),{VISITED:0,CHECKOUT_STARTED:0});
  return send(res,200,{ok:true,schema:'mint.acquisition.snapshot.v3',semantics:durableStateConfigured?'DURABLE_OFFER_AND_SOURCE_AGGREGATES_NOT_UNIQUE_VISITORS':'PROCESS_LOCAL_FALLBACK_NOT_UNIQUE_VISITORS_NOT_LIFETIME_TOTALS',startedAt:acquisitionStartedAt,generatedAt:new Date().toISOString(),durableStorageConfigured:durableStateConfigured,privacy:'No IP, cookie, user-agent, or personal identifier stored by this counter.',totals,sources,offers});
}

async function serveFile(res,file,type){const data=await readFile(file);res.writeHead(200,{'content-type':type});res.end(data)}
const root=path.dirname(fileURLToPath(import.meta.url));
const commerceCatalogPath=path.join(root,'catalog.json');
async function liveOffer(id){const catalog=JSON.parse(await readFile(commerceCatalogPath,'utf8'));const offer=catalog?.offers?.[id];if(!offer||offer.status!=='ACTIVE'||!offer.mandate_id) return null;return offer;}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,APP_URL);
    const acquisitionCors={'access-control-allow-origin':'https://godsun108.github.io','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type'};
    if(u.pathname==='/api/acquisition/event'&&req.method==='OPTIONS'){res.writeHead(204,acquisitionCors);return res.end();}
    if(u.pathname==='/api/acquisition/event'&&req.method==='POST'){
      const originalWriteHead=res.writeHead.bind(res);
      res.writeHead=(status,headers={})=>originalWriteHead(status,{...acquisitionCors,...headers});
      return await acquisitionEvent(req,res);
    }
    if(req.method==='GET'&&u.pathname==='/api/acquisition/state')return acquisitionState(res);
    if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,stripeConfigured,webhookConfigured:Boolean(process.env.STRIPE_WEBHOOK_SECRET),durableFulfillmentStorage:durableStateConfigured,durableAcquisitionStorage:durableStateConfigured,fgeEnabled:process.env.FGE_ENABLED==='true',gumroad:{callbackReady:true,configured:gumroadConfigured,redirectUri:gumroadRedirectUri}});
    if(req.method==='GET'&&u.pathname==='/integrations/gumroad/callback')return await gumroadCallback(u,res);
    if(req.method==='GET'&&u.pathname==='/api/gumroad/check')return await gumroadCheck(res);
    if(req.method==='GET'&&u.pathname==='/api/gumroad/products')return await gumroadProducts(res);
    if(req.method==='GET'&&u.pathname==='/api/gumroad/sales')return await gumroadSales(res);
    if(req.method==='GET'&&u.pathname==='/api/fge/state')return send(res,200,{ok:true,runtime:getRuntimeState()});
    if(req.method==='GET'&&u.pathname==='/api/stripe-check') { const s=requireStripe(); const balance=await s.balance.retrieve(); const products=await s.products.list({limit:1}); return send(res,200,{ok:true,stripeAuthenticated:true,livemode:balance.livemode,testMode:balance.livemode===false,catalogReadable:true}); }
    if(req.method==='OPTIONS'&&u.pathname==='/api/acquisition/event'){res.writeHead(204,acquisitionCors);return res.end();}
    if((u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/api/acquisition/'))||u.pathname.startsWith('/refresh-onboarding')||u.pathname.startsWith('/webhooks/'))requireStripe();
    if(req.method==='GET'&&u.pathname==='/')return serveFile(res,path.join(root,'public/index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/checklist')return serveFile(res,path.join(root,'public/checklist.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/offers')return serveFile(res,path.join(root,'public/offers.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/api-launch-checklist')return serveFile(res,path.join(root,'public/api-launch-checklist.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/ai-workflow-kit')return serveFile(res,path.join(root,'public/ai-workflow-kit.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/builder-launch-pack')return serveFile(res,path.join(root,'public/builder-launch-pack.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/success')return serveFile(res,path.join(root,'public/success.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/robots.txt')return serveFile(res,path.join(root,'public/robots.txt'),'text/plain; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/sitemap.xml')return serveFile(res,path.join(root,'public/sitemap.xml'),'application/xml; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/api/storefront')return await storefront(res);
    if(req.method==='GET'&&u.pathname==='/api/money-state')return await moneyState(res);
    if(req.method==='GET'&&u.pathname==='/api/commerce/evidence')return await commerceEvidence(res);
    if(req.method==='GET'&&u.pathname==='/api/fulfillment/evidence')return await fulfillmentEvidence(res);
    if(req.method==='POST'&&u.pathname==='/api/accounts')return await createConnectedAccount(req,res);
    let m=u.pathname.match(/^\/api\/accounts\/([^/]+)\/status$/);
    if(req.method==='GET'&&m)return await accountStatus(decodeURIComponent(m[1]),res);
    m=u.pathname.match(/^\/api\/accounts\/([^/]+)\/onboarding-link$/);
    if(req.method==='POST'&&m)return await onboardingLink(decodeURIComponent(m[1]),res);
    if(req.method==='GET'&&u.pathname==='/refresh-onboarding'){
      const id=u.searchParams.get('accountId');if(!id)return send(res,400,{error:'accountId is required.'});
      const link=await stripeClient.v2.core.accountLinks.create({account:id,use_case:{type:'account_onboarding',account_onboarding:{configurations:['recipient'],refresh_url:APP_URL+'/refresh-onboarding?accountId='+encodeURIComponent(id),return_url:APP_URL+'/?accountId='+encodeURIComponent(id)}}});
      res.writeHead(303,{location:link.url});return res.end();
    }
    if(req.method==='POST'&&u.pathname==='/api/products')return await createProduct(req,res);
    if(req.method==='POST'&&u.pathname==='/api/checkout')return await checkout(req,res);
    m=u.pathname.match(/^\/api\/checkout\/([^/]+)\/verify$/);
    if(req.method==='GET'&&m)return await verifyCheckout(decodeURIComponent(m[1]),res);
    m=u.pathname.match(/^\/api\/fulfill\/([^/]+)$/);
    if(req.method==='GET'&&m)return await fulfillCheckout(decodeURIComponent(m[1]),res);
    if(req.method==='POST'&&u.pathname==='/webhooks/stripe')return await thinWebhook(req,res);
    send(res,404,{error:'Not found'});
  }catch(e){
    handleRequestError(e,res,send);
  }
});
server.listen(PORT,()=>{console.log('MINT Stripe Connect demo listening on '+APP_URL);startRuntime({observe:fgeObserve});});
