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
