import assert from "node:assert/strict";
import { analyzeLeads } from "./diagnostic.js";
const rows=[
 {receivedAt:"2026-09-21T09:00:00-04:00",responseAt:"2026-09-21T09:03:00-04:00"},
 {receivedAt:"2026-09-21T10:00:00-04:00",responseAt:"2026-09-21T12:00:00-04:00"},
 {receivedAt:"2026-09-22T11:00:00-04:00"},
 {receivedAt:"2026-09-22T20:00:00-04:00"}
];
const x=analyzeLeads(rows);
assert.equal(x.total,4);assert.equal(x.responded,2);assert.equal(x.unanswered,2);assert.equal(x.responseRate,.5);assert.equal(x.within5m,.25);assert.equal(x.medianResponseMinutes,61.5);
assert.equal(x.opportunity.status,"NOT_ESTIMATED");
const y=analyzeLeads(rows,{averageJobValue:500,closeRate:.2});
assert.equal(y.opportunity.estimatedGrossOpportunity,200);
assert.match(y.opportunity.warning,/Not revenue/);
console.log("lead response diagnostic tests passed");
