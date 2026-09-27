import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Stripe from 'stripe';

// One Stripe Client for every Stripe-related request in this application.
// PLACEHOLDER: set STRIPE_SECRET_KEY in the environment; never commit a real key.
const secretKey=process.env.STRIPE_SECRET_KEY;
if(!secretKey||secretKey.includes('REPLACE_ME')){
  throw new Error('Missing STRIPE_SECRET_KEY. Copy .env.example values into your deployment secret store and set a Stripe TEST secret key.');
}
const stripeClient=new Stripe(secretKey); // SDK v22.6.2 automatically selects its pinned API version.

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
    if(req.method==='GET'&&u.pathname==='/')return serveFile(res,path.join(root,'public/index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/success')return serveFile(res,path.join(root,'public/success.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/api/storefront')return storefront(res);
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
    if(req.method==='POST'&&u.pathname==='/webhooks/stripe')return thinWebhook(req,res);
    send(res,404,{error:'Not found'});
  }catch(e){console.error(e);send(res,500,{error:e?.message||'Unexpected server error.'})}
});
server.listen(PORT,()=>console.log('MINT Stripe Connect demo listening on '+APP_URL));
