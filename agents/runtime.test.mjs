import assert from "node:assert/strict";
import { authorize, economics, forgeScore, makeWorkOrder, needsHumanApproval } from "./runtime.js";

assert.equal(needsHumanApproval("execute_trade"), true);
assert.equal(needsHumanApproval("public_research"), false);
assert.deepEqual(authorize({action:"spend_money",approved:false,estimatedCost:1,budgetRemaining:10}),{ok:false,reason:"human_approval_required"});
assert.deepEqual(authorize({action:"public_research",estimatedCost:11,budgetRemaining:10}),{ok:false,reason:"budget_exceeded"});
assert.deepEqual(authorize({action:"public_research",estimatedCost:1,budgetRemaining:10}),{ok:true});
assert.equal(economics({settledRevenue:100,directCost:20,computeCost:5,humanCost:10}).contribution,65);
assert.ok(forgeScore({accuracy:.9,contribution:20,cost:5,latencyMs:100}) > forgeScore({accuracy:.5,contribution:20,cost:5,latencyMs:100}));
assert.equal(makeWorkOrder({id:"x",agent:"scout",objective:"find"}).status,"PROPOSED");
console.log("agent runtime tests passed");


import { initialState, appendEvent } from "./store.js";
import { canRun, plan, requestApproval } from "./orchestrator.js";
import registry from "./registry.json" with { type:"json" };
import { createExperiment, summarizeExperiment } from "./experiments.js";

let s=initialState();
const a=plan({id:"a",agent:"scout",objective:"discover"});
const b=plan({id:"b",agent:"builder",objective:"build",dependsOn:["a"]});
s.jobs=[a,b];
assert.equal(canRun(b,s,registry).ok,false);
s.jobs[0].status="COMPLETE";
assert.equal(canRun(b,s,registry).ok,true);
s=requestApproval(s,b,{type:"deploy_production"});
s=requestApproval(s,b,{type:"deploy_production"});
assert.equal(s.approvals.length,1);
s=appendEvent(s,{event_id:"evt-1",type:"test"});
s=appendEvent(s,{event_id:"evt-1",type:"test"});
assert.equal(s.events.length,1);
const exp=createExperiment({id:"e1",hypothesis:"x",offer:"y"});
exp.settledRevenue=50; exp.costs=[{amount:12}];
assert.equal(summarizeExperiment(exp).contribution,38);
console.log("agent orchestration tests passed");


import { createExecutor, replaceJob } from "./executor.js";
import { companySnapshot } from "./dashboard.js";
import { runSimulation } from "./simulation.js";

let exState=initialState();
let exJob=plan({id:"gate",agent:"merchant",objective:"launch",budget:5});
exState.jobs=[exJob];
const gated=createExecutor({handlers:{merchant:async({api})=>{const g=api.action({type:"publish_publicly",estimatedCost:0}); assert.equal(g.ok,false);}}});
let er=await gated(exJob,exState,{});
assert.equal(er.job.status,"WAITING_FOR_HUMAN_APPROVAL");
assert.equal(er.state.approvals.length,1);

const sim=await runSimulation();
assert.equal(sim.jobs.length,6);
assert.equal(sim.jobs.every(j=>j.status==="COMPLETE"),true);
const snap=companySnapshot(sim,registry);
assert.equal(snap.agents,30);
assert.equal(snap.jobs,6);
assert.ok(snap.totalTrackedCost>0);
console.log("executor and company simulation tests passed");
