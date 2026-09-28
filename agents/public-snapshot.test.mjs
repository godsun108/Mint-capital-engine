import assert from "node:assert/strict";
import { buildPublicSnapshot,assertPublicSnapshot } from "./public-snapshot.js";
const state={jobs:[{id:"j",status:"COMPLETE",costs:[{amount:1}]}],approvals:[{id:"a",jobId:"j",action:"publish_publicly",status:"PENDING"}],experiments:[],missions:[{id:"001",objective:"first dollar",status:"WAITING_FOR_HUMAN_APPROVAL",budget:25,successCriteria:["settled payment"]}],kills:{system:false}};
const registry={agents:Array.from({length:30},(_,i)=>({id:String(i)}))};
const x=buildPublicSnapshot(state,registry,{generatedAt:"2026-09-27T00:00:00Z",sourceCommit:"abc"});
assertPublicSnapshot(x);assert.equal(x.company.agents,30);assert.equal(x.company.settledRevenue,0);assert.equal(x.approvals.length,1);assert.equal(x.truth.readOnly,true);
assert.equal(JSON.stringify(x).includes("evidence"),false);
console.log("public snapshot tests passed");
