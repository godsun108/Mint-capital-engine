import fs from "node:fs";import path from "node:path";
const root=process.cwd();
const targets=[
 {id:"pages-home",url:"https://godsun108.github.io/Mint-capital-engine/",kind:"PAGE"},
 {id:"pages-shop",url:"https://godsun108.github.io/Mint-capital-engine/shop/",kind:"PAGE"},
 {id:"railway-health",url:"https://mint-stripe-connect-v4-production.up.railway.app/health",kind:"HEALTH"},
 {id:"acquisition-state",url:"https://mint-stripe-connect-v4-production.up.railway.app/api/acquisition/state",kind:"JSON"}
];
const results=[];
for(const t of targets){
 const started=Date.now();
 try{
  const r=await fetch(t.url,{redirect:"follow",signal:AbortSignal.timeout(12000)});
  const body=await r.text();
  let semantic="REACHABLE";
  if(t.kind==="HEALTH"&&!r.ok)semantic="UNHEALTHY";
  if(t.kind==="JSON"){try{JSON.parse(body)}catch{semantic="INVALID_JSON"}}
  results.push({...t,http_status:r.status,ok:r.ok,semantic,latency_ms:Date.now()-started,observed_at:new Date().toISOString()});
 }catch(e){results.push({...t,ok:false,semantic:"UNREACHABLE",error:String(e?.message||e),latency_ms:Date.now()-started,observed_at:new Date().toISOString()})}
}
const report={schema:"mint.watchtower.observation.v1",truth:"Reachability does not prove checkout, payment, fulfillment, traffic, customer activity, settlement, or profitability.",results};
fs.mkdirSync(path.join(root,"automation/state"),{recursive:true});
fs.writeFileSync(path.join(root,"automation/state/watchtower.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(results.some(x=>!x.ok))process.exitCode=1;
