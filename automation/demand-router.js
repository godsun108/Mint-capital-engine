import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), state=path.join(root,"automation","state");
const loop=JSON.parse(fs.readFileSync(path.join(state,"return-loop.json"),"utf8"));
const channels=JSON.parse(fs.readFileSync(path.join(root,"automation","channels.json"),"utf8"));
const registry=JSON.parse(fs.readFileSync(path.join(root,"systems","commerce","brand-channel-registry.json"),"utf8"));
const catalog=JSON.parse(fs.readFileSync(path.join(root,"systems","commerce","catalog.json"),"utf8"));
const rows=[];
const available=new Set((channels.channels||[]).filter(c=>String(c.state).startsWith("AVAILABLE")).map(c=>c.id));
for(const item of loop.items||[]){
 if(item.state!=="READY_TO_PRESENT") continue;
 const offer=catalog.offers?.[item.offer_id];
 if(!offer) continue;
 const owned=(item.channel_policy?.owned_channels||[]).filter(c=>available.has(c));
 for(const c of owned) rows.push({offer_id:item.offer_id,candidate_id:item.candidate_id,route:c,class:"OWNED",permission:"AUTHORIZED",action:"PUBLISH_AND_MEASURE",cost_usd:0,source_count:item.problem_sources?.length||0,score:100});
 const brand=Object.entries(registry.brands||{}).find(([,b])=>(b.offers||[]).includes(item.offer_id));
 if(brand){
  for(const [channel,cfg] of Object.entries(brand[1].channels||{})){
   if(cfg.status!=="APPROVED") continue;
   const publishedEvidence=cfg.routing?.state==="PUBLISHED_EVIDENCED_REVERIFY_PROVIDER_STATE" && cfg.evidence?.listing_publication==="PREVIOUSLY_EVIDENCED";
   rows.push({offer_id:item.offer_id,candidate_id:item.candidate_id,brand:brand[0],route:channel,class:"THIRD_PARTY_APPROVED_BRAND_CHANNEL",permission:publishedEvidence?"PUBLISHED_EVIDENCED_REVERIFY_PROVIDER_STATE":"APPROVED_CHANNEL_BUT_PUBLISH_POLICY_APPLIES",action:publishedEvidence?"MEASURE_AND_REVERIFY":"PREPARE_PRESENTATION",cost_usd:0,source_count:item.problem_sources?.length||0,score:publishedEvidence?90:80,evidence_note:publishedEvidence?cfg.evidence?.evidence_note:undefined});
  }
 }
 for(const s of item.problem_sources||[]){
  let host="unknown";try{host=new URL(s.url).hostname.replace(/^www\./,"")}catch{}
  rows.push({offer_id:item.offer_id,candidate_id:item.candidate_id,route:host,class:"PROBLEM_ORIGIN_COMMUNITY",permission:"UNVERIFIED_FOR_PROMOTION",action:"VERIFY_RULES_AND_PREPARE_ONLY",cost_usd:0,source_url:s.url,score:60});
 }
}
rows.sort((a,b)=>b.score-a.score);
const out={schema:"mint.demand_router.v1",generated_at:new Date().toISOString(),semantics:"ROUTING_OPPORTUNITIES_NOT_TRAFFIC_NOT_CUSTOMERS",routes:rows};
fs.writeFileSync(path.join(state,"demand-router.json"),JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out,null,2));
