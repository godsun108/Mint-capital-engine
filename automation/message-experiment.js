import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.existsSync(path.join(root,p))?JSON.parse(fs.readFileSync(path.join(root,p),"utf8")):null;
const motion=read("automation/state/market-motion.json")||{results:[],explorationAttempts:{}};
const returns=read("automation/state/return-loop.json")||{items:[]};
const catalog=read("systems/commerce/catalog.json")||{offers:{}};
const previousExperiments=read("automation/state/message-experiments.json")||{briefs:[]};
const briefs=[]; // adaptation briefs are generated only after bounded exploration
for(const r of motion.results||[]){
 if(!r.reviewRecommended) continue;
 const prior=(previousExperiments.briefs||[]).find(x=>x.offerId===r.offerId);
 if(r.messageExperimentApplied && prior){briefs.push({...prior,state:"OBSERVING",appliedAt:prior.appliedAt||new Date().toISOString()});continue;}
 const offer=catalog.offers?.[r.offerId];
 if(!offer||offer.status!=="ACTIVE") continue;
 const loop=(returns.items||[]).find(x=>x.offer_id===r.offerId);
 const needs=(loop?.problem_sources||[]).map(x=>x.observed_need).filter(Boolean).slice(0,3);
 briefs.push({
  offerId:r.offerId,
  state:"MESSAGE_EXPERIMENT_READY",
  trigger:"FOUR_ZERO_BEHAVIOR_EXPLORATION_CYCLES",
  immutable:{price:offer.price,product:offer.name,mandate_id:offer.mandate_id},
  current:offer.acquisition||{},
  experiment:{
   hypothesis:"Lead with the verified customer problem before describing the implementation.",
   headline:needs[0]?`${String(needs[0]).replace(/\s+/g," ").split(/[.!?]/)[0].slice(0,96).replace(/\s+\S*$/,"").trim()}.`:offer.acquisition?.headline,
   body:needs.length?`Built for a recurring problem observed in public developer discussions: ${needs.join(" / ")}. ${offer.description}`:offer.acquisition?.body,
   cta:offer.acquisition?.cta||"View offer"
  },
  constraints:["zero_paid_spend","no_price_change","no_product_change","no_permission_escalation","no_fabricated_social_proof","reversible_test_only"]
 });
}
const out={schema:"mint.message.experiments.v1",generatedAt:new Date().toISOString(),semantics:"REVERSIBLE_ZERO_SPEND_MESSAGE_TEST_BRIEFS_NOT_CATALOG_MUTATIONS",briefs};
const file=path.join(root,"automation","state","message-experiments.json");fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out,null,2));

