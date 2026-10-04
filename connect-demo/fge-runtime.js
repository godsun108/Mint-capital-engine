import fs from 'node:fs';
import path from 'node:path';
import {produceCandidates} from './fge-publisher.js';
import {prepareDistribution,nextReady} from './fge-distributor.js';

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

export function runCycle(input={}){
  const s=load(), started=now();
  const sources=Object.entries(input.sources||{}).map(([source,funnel])=>({source:sourceTag(source),funnel,decision:decide(funnel)}));
  const existing=(s.queue||[]).filter(x=>x.brand==='foundry'&&x.channel==='bluesky');
  const generated=produceCandidates({existing});
  if(generated.length)s.queue=[...(s.queue||[]),...generated.map(x=>({...x,createdAt:started}))].slice(-100);
  s.queue=prepareDistribution(s.queue||[]);
  const ready=s.queue.filter(x=>x.state==='ready');
  const distributor={ready:ready.length,next:nextReady(s.queue)?.sourceTag||null,mode:'zero_cost_bridge'};
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
  const tick=async()=>{try{const evidence=observe?await observe():{};const cycle=runCycle(evidence);console.log('FGE_CYCLE',JSON.stringify({id:cycle.id,sources:cycle.sources.length,autonomy:AUTONOMY,publisher:cycle.publisher,distributor:cycle.distributor,funding:cycle.funding}))}catch(e){console.error('FGE_CYCLE_ERROR',JSON.stringify({message:e?.message||'unknown'}))}};
  tick();const timer=setInterval(tick,INTERVAL_MS);timer.unref?.();return timer;
}
