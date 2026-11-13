import assert from "node:assert/strict";
import { test } from "node:test";
import { createPrintifyReadOnly } from "../providers/printify-readonly.mjs";
test("GET-only catalog routes and scoped auth", async () => {
 const calls=[];
 const api=createPrintifyReadOnly({token:"offline-token",fetchImpl:async (url,init)=>{
  calls.push({url,init});return {ok:true,json:async()=>[{id:1}]};
 }});
 await api.listBlueprints(); await api.listProviders(12); await api.listVariants(12,34); await api.getShipping(12,34);
 assert.equal(calls.length,4);
 for(const call of calls){
  assert.equal(call.init.method,"GET");
  assert.equal(call.init.redirect,"error");
  assert.equal(call.init.headers.Authorization,"Bearer offline-token");
  assert.ok(call.url.startsWith("https://api.printify.com/v1/catalog/"));
 }
 assert.deepEqual([api.capabilities.productWrites,api.capabilities.publishing,api.capabilities.orders,api.capabilities.spend],[false,false,false,false]);
});
test("bad IDs are rejected before network",async()=>{
 let calls=0;const api=createPrintifyReadOnly({token:"offline",fetchImpl:async()=>{calls++;throw Error("unexpected");}});
 assert.throws(()=>api.listProviders("../other"),/invalid/);
 assert.throws(()=>api.listVariants(1,0),/invalid/);
 assert.throws(()=>api.getShipping(-1,2),/invalid/);
 assert.equal(calls,0);
});
test("missing credentials fail closed",()=>{
 assert.throws(()=>createPrintifyReadOnly({token:""}),/required/);
});
test("supplier errors propagate without write fallback",async()=>{
 const api=createPrintifyReadOnly({token:"offline",fetchImpl:async()=>({ok:false,status:401})});
 await assert.rejects(api.listBlueprints(),/401/);
});
