import fs from "node:fs";
import path from "node:path";
import {prepareOwnedCampaign} from "../agents/adapters/market-owned.js";

const root=process.cwd();
const allocationPath=path.join(root,"automation","state","allocation.json");
const allocation=fs.existsSync(allocationPath)?JSON.parse(fs.readFileSync(allocationPath,"utf8")):{allocations:{}};
const baseUrl=process.env.MINT_COMMERCE_URL;
if(!baseUrl) throw new Error("MINT_COMMERCE_URL is required");

const channels=["github-pages","mint-direct-web","github-pages-intent"];
const previousPath=path.join(root,"automation","state","market-motion.json");
const previous=fs.existsSync(previousPath)?JSON.parse(fs.readFileSync(previousPath,"utf8")):{results:[]};
const results=[];
for(const [offerId,a] of Object.entries(allocation.allocations||{})){
 const weight=Math.max(0,Math.min(3,Number(a.attentionWeight)||0));
 if(weight===0){results.push({offerId,action:"STOPPED",reason:a.reason});continue;}
 const authorized=(a.authorizedRoutes||[]).filter(x=>channels.includes(x));
 const pool=authorized.length?authorized:channels;
 const prior=(previous.results||[]).filter(x=>x.offerId===offerId).map(x=>x.campaignPath?.split("/").pop()?.replace(/\.json$/,"")).filter(Boolean);
 const start=pool.length?Math.max(0,(pool.indexOf(prior[0])+1)%pool.length):0;
 const selected=Array.from({length:Math.min(weight,pool.length)},(_,i)=>pool[(start+i)%pool.length]);
 for(const source of selected){
  const offerUrl=new URL("/offers",baseUrl); offerUrl.searchParams.set("offer",offerId);
  const r=prepareOwnedCampaign({offerId,baseUrl:offerUrl.toString(),source,root});
  results.push({offerId,attentionWeight:weight,...r});
 }
}
const out=path.join(root,"automation","state","market-motion.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({schema:"mint.market.motion.v1",generatedAt:new Date().toISOString(),
 semantics:"ZERO_SPEND_OWNED_CHANNEL_PREPARATION_ONLY",results},null,2)+"\n");
console.log(JSON.stringify({ok:true,results},null,2));
