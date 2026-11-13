import assert from "node:assert/strict";
import { test } from "node:test";
import { discoverAurelionFreestyler } from "../providers/aurelion-printify-discovery.mjs";
const blueprint={id:42,title:"Stanley/Stella Freestyler Heavyweight Tee"};
const provider={id:7,title:"Fulfill Engine"};
function mocked({blueprints=[blueprint],providers=[provider]}={}) {
 const calls=[];
 const fetchImpl=async(url,init)=>{
  calls.push({url,method:init.method});
  const data=url.endsWith("/blueprints.json")?blueprints:url.endsWith("/print_providers.json")?providers:url.endsWith("/variants.json")?{variants:[{id:3}]}:{shipping:[]};
  return {ok:true,json:async()=>data};
 };
 return {calls,fetchImpl};
}
test("unique match reads variants and shipping without writes",async()=>{
 const m=mocked();const result=await discoverAurelionFreestyler({token:"offline",fetchImpl:m.fetchImpl});
 assert.equal(result.status,"CATALOG_REVIEW");assert.equal(result.blueprintId,42);assert.equal(result.providerId,7);
 assert.equal(result.writesEnabled,false);assert.equal(result.publishEnabled,false);
 assert.equal(m.calls.length,4);assert.ok(m.calls.every(c=>c.method==="GET"));
});
test("ambiguous garments stop before provider lookup",async()=>{
 const m=mocked({blueprints:[blueprint,{...blueprint,id:43}]});
 const result=await discoverAurelionFreestyler({token:"offline",fetchImpl:m.fetchImpl});
 assert.equal(result.status,"REVIEW_REQUIRED");assert.equal(m.calls.length,1);
});
test("unmatched provider stops before variants lookup",async()=>{
 const m=mocked({providers:[{id:9,title:"Other Printer"}]});
 const result=await discoverAurelionFreestyler({token:"offline",fetchImpl:m.fetchImpl});
 assert.equal(result.status,"REVIEW_REQUIRED");assert.equal(m.calls.length,2);
});
