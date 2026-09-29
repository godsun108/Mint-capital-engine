import fs from "node:fs";
import path from "node:path";
import {prepareOwnedCampaign} from "../agents/adapters/market-owned.js";

const root=process.cwd();
const allocationPath=path.join(root,"automation","state","allocation.json");
const allocation=fs.existsSync(allocationPath)?JSON.parse(fs.readFileSync(allocationPath,"utf8")):{allocations:{}};
const baseUrl=process.env.MINT_COMMERCE_URL;
if(!baseUrl) throw new Error("MINT_COMMERCE_URL is required");

const channels=["github-pages","mint-direct-web","github-pages-intent"];
const results=[];
for(const [offerId,a] of Object.entries(allocation.allocations||{})){
 const weight=Math.max(0,Math.min(3,Number(a.attentionWeight)||0));
 if(weight===0){results.push({offerId,action:"STOPPED",reason:a.reason});continue;}
 for(const source of channels.slice(0,weight)){
  const r=prepareOwnedCampaign({offerId,baseUrl,source,root});
  results.push({offerId,attentionWeight:weight,...r});
 }
}
const out=path.join(root,"automation","state","market-motion.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({schema:"mint.market.motion.v1",generatedAt:new Date().toISOString(),
 semantics:"ZERO_SPEND_OWNED_CHANNEL_PREPARATION_ONLY",results},null,2)+"\n");
console.log(JSON.stringify({ok:true,results},null,2));
