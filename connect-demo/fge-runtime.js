import fs from 'node:fs';
import path from 'node:path';
import {produceCandidates} from './fge-publisher.js';
import {prepareDistribution,nextReady} from './fge-distributor.js';
import {dispatchBluesky,blueskyConfigured} from './fge-bluesky.js';

const STATE_DIR=process.env.MINT_STATE_DIR||'.state';
const STATE_FILE=path.join(STATE_DIR,'fge-runtime.json');
const INTERVAL_MS=Math.max(60_000,Number(process.env.FGE_INTERVAL_MS||900_000));
const AUTONOMY=(process.env.FGE_AUTONOMY||'observe').toLowerCase();

function load(){
  try{return JSON.parse(fs.readFileSync(STATE_FILE,'utf8'))}catch{return {version:1,runs:[],experiments:{},queue:[],lastRun:null}}
}
function save(s){fs.mkdirSync(STATE_DIR,{recursive:true});const tmp=STATE_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(s,null,2));fs.renameSync(tmp,STATE_FILE)}
function now(){return new Date().toISOString()}
function sourceTag(v){return /^[a-z0-9_-]{1,48}$/.test(v||'')?v:'unknown'}
function earnedDollars(sources){return sources.reduce((n,x)=>n+((x.funnel?.paid||0)*9),0)}

export function decide(funnel={}){
  const {visits=0,checkoutStarted=0,paid=0,fulfilled=0}=funnel;
  if(fulfilled>paid)return {state:'error',action:'investigate_evidence_invariant'};
  if(paid>fulfilled)return {state:'incident',action:'repair_fulfillment_before_growth'};
  if(paid>0&&fulfilled>=paid)return {state:'winner',action:'repeat_verified_source'};
  if(checkoutStarted>0)return {state:'checkout',action:'inspect_checkout_to_paid'};
  if(visits>0)return {state:'traffic',action:'improve_offer_or_intent_match'};
  return {state:'cold',action:'increase_qualified_distribution'};
}

export function acquisitionGate(sources=[]){
  if(!Array.isArray(sources)||sources.length===0)return {allowed:false,reason:'missing_funnel_evidence'};
  if(sources.some(x=>!x||!x.decision||!x.funnel||typeof x.funnel!=='object'))return {allowed:false,reason:'invalid_funnel_evidence'};
  if(sources.some(x=>['visits','checkoutStarted','paid','fulfilled'].some(k=>!Number.isSafeInteger(x.funnel[k])||x.funnel[k]<0)))return {allowed:false,reason:'incomplete_or_invalid_counts'};
  if(sources.some(x=>x.funnel.fulfilled>x.funnel.paid||x.funnel.paid>x.funnel.checkoutStarted||x.funnel.checkoutStarted>x.funnel.visits))return {allowed:false,reason:'inconsistent_funnel_counts'};
  const incidents=sources.filter(x=>['incident','error'].includes(x.decision.state));
  if(incidents.length)return {allowed:false,reason:'customer_delivery_or_evidence_incident',incidentSources:incidents.map(x=>x.source)};
  return {allowed:true};
}

export function publishingPolicy({autonomy,enabled,queue=[],at=Date.now()}={}){
  if(autonomy!=='execute')return {allowed:false,reason:'observe_mode'};
  if(!enabled)return {allowed:false,reason:'publishing_disabled'};
  const sent=queue.filter(x=>x.state==='sent'||x.state==='published'||x.state==='dispatched');
  const recent=sent.map(x=>Date.parse(x.publishedAt||x.dispatchedAt||x.sentAt||'')).filter(t=>Number.isFinite(t)&&t<=at&&t>at-86400000);
  if(recent.length>=1)return {allowed:false,reason:'daily_post_limit'};
  return {allowed:true};
}

export async function runCycle(input={}){
  const s=load(), started=now();
  const sources=Object.entries(input.sources||{}).map(([source,funnel])=>({source:sourceTag(source),funnel,decision:decide(funnel)}));
  const existing=(s.queue||[]).filter(x=>x.brand==='foundry'&&x.channel==='bluesky');
  const generated=produceCandidates({existing});
  if(generated.length)s.queue=[...(s.queue||[]),...generated.map(x=>({...x,createdAt:started}))].slice(-100);
  s.queue=prepareDistribution(s.queue||[]);
  const ready=s.queue.filter(x=>x.state==='ready');
  let distributor={ready:ready.length,next:nextReady(s.queue)?.sourceTag||null,mode:'zero_cost_bluesky',providerConfigured:blueskyConfigured()};
  const job=nextReady(s.queue);
  const gate=acquisitionGate(sources);
  if(!gate.allowed)distributor={...distributor,blocked:gate.reason,...(gate.incidentSources?{incidentSources:gate.incidentSources}:{})};
  const policy=publishingPolicy({autonomy:AUTONOMY,enabled:process.env.FGE_OWNED_PUBLISH_ENABLED==='true',queue:s.queue});
  if(job&&gate.allowed&&!policy.allowed)distributor={...distributor,blocked:policy.reason};
  if(job&&gate.allowed&&policy.allowed){
    const result=await dispatchBluesky(job);
    if(result.ok){s.queue=s.queue.map(x=>x===job?{...x,...result}:x);distributor={...distributor,dispatched:job.sourceTag,result:{state:result.state,externalId:result.externalId}}}
    else distributor={...distributor,blocked:result.reason};
  }
  const earned=earnedDollars(sources);
  const funding={targetUsd:20,verifiedPaidEstimateUsd:earned,remainingUsd:Math.max(0,20-earned),eligible:earned>=20,note:'Estimate uses current $9 primary offer count; Stripe transaction amounts remain authoritative.'};
  const cycle={id:'fge:'+started,started,autonomy:AUTONOMY,sources,publisher:{generated:generated.length,queued:(s.queue||[]).length},distributor,funding};
  s.lastRun=started;s.runs=[...(s.runs||[]),cycle].slice(-200);
  for(const x of sources)s.experiments[x.source]={...(s.experiments[x.source]||{}),lastObserved:started,lastFunnel:x.funnel,lastDecision:x.decision};
  save(s);return cycle;
}

export function getRuntimeState(){return load()}
export function startRuntime({observe}={}){
  if(process.env.FGE_ENABLED!=='true')return null;
  const tick=async()=>{try{const evidence=observe?await observe():{};const cycle=await runCycle(evidence);console.log('FGE_CYCLE',JSON.stringify({id:cycle.id,sources:cycle.sources.length,autonomy:AUTONOMY,publisher:cycle.publisher,distributor:cycle.distributor,funding:cycle.funding}))}catch(e){console.error('FGE_CYCLE_ERROR',JSON.stringify({message:e?.message||'unknown'}))}};
  tick();const timer=setInterval(tick,INTERVAL_MS);timer.unref?.();return timer;
}
