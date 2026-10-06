import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const stateDir=path.join(root,"automation","state");
fs.mkdirSync(stateDir,{recursive:true});

const demand=JSON.parse(fs.readFileSync(path.join(root,"automation","demand_summary.json"),"utf8"));
const evidence=JSON.parse(fs.readFileSync(path.join(root,"automation","demand_evidence.json"),"utf8"));
const catalog=JSON.parse(fs.readFileSync(path.join(root,"systems","commerce","catalog.json"),"utf8"));

const active=Object.values(catalog.offers||{}).filter(o=>o.status==="ACTIVE");
const byCandidate=new Map();
for(const o of active){
 const cid=o.source_candidate_id || (o.id==="foundry-express-ts-001" ? "ip:foundry-scaffold" : null);
 if(cid) byCandidate.set(cid,o);
}
const evidenceByCandidate=new Map();
for(const e of evidence.observations||[]){
 if(!e.candidate_id) continue;
 if(!evidenceByCandidate.has(e.candidate_id)) evidenceByCandidate.set(e.candidate_id,[]);
 evidenceByCandidate.get(e.candidate_id).push(e);
}

const returns=[];
for(const d of demand.items||[]){
 if(Number(d.observation_count||0)<2) continue;
 const offer=byCandidate.get(d.candidate_id);
 if(!offer) {
   returns.push({candidate_id:d.candidate_id,state:"SOLUTION_NOT_CATALOGED",problem_sources:d.sources||[],external_action_performed:false});
   continue;
 }
 const sources=evidenceByCandidate.get(d.candidate_id)||[];
 returns.push({
   candidate_id:d.candidate_id,
   offer_id:offer.id,
   offer_name:offer.name,
   state:"READY_TO_PRESENT",
   problem_sources:sources.map(s=>({url:s.source_url,kind:s.source_kind,observed_need:s.observed_need})),
   presentation:{
     headline:offer.acquisition?.headline||offer.name,
     body:offer.acquisition?.body||offer.description,
     destination:"https://mint-stripe-connect-v4-production.up.railway.app/offers?offer="+encodeURIComponent(offer.id)+"&src=return_loop",
     disclosure:"Relevant solution from MINT; no guaranteed outcome or fabricated endorsement."
   },
   channel_policy:{
     owned_channels:["github-pages","mint-direct-web"],
     community_return:"PREPARE_ONLY_UNLESS_CHANNEL_RULES_AND_AUTHORIZATION_ALLOW_AUTOMATION",
     unsolicited_direct_message:false,
     impersonation:false,
     spam:false
   },
   measurement:["REAL_VISIT","CHECKOUT","PAID","FULFILLED","PROVIDER_AVAILABLE","SETTLED"],
   external_action_performed:false
 });
}
const out={schema:"mint.return_loop.v1",generated_at:new Date().toISOString(),semantics:"SOURCE_AWARE_SOLUTION_PRESENTATION_PREPARATION_NOT_OUTREACH",items:returns};
fs.writeFileSync(path.join(stateDir,"return-loop.json"),JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out,null,2));
