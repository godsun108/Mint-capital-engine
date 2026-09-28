import assert from "node:assert/strict";
import { analyzeLeads } from "./diagnostic.js";
const rows=[
 {receivedAt:"2026-09-21T09:00:00-04:00",responseAt:"2026-09-21T09:03:00-04:00"},
 {receivedAt:"2026-09-21T10:00:00-04:00",responseAt:"2026-09-21T12:00:00-04:00"},
 {receivedAt:"2026-09-22T11:00:00-04:00"},
 {receivedAt:"2026-09-22T20:00:00-04:00"}
];
const x=analyzeLeads(rows,{businessHours:{start:9,end:17,timeZone:"America/New_York"}});
assert.equal(x.total,4);assert.equal(x.responded,2);assert.equal(x.unanswered,2);assert.equal(x.responseRate,.5);assert.equal(x.within5m,.25);assert.equal(x.within24h,.5);assert.equal(x.within72h,.5);assert.equal(x.medianResponseMinutes,61.5);
assert.equal(x.opportunity.status,"NOT_ESTIMATED");
const y=analyzeLeads(rows,{averageJobValue:500,closeRate:.2,businessHours:{start:9,end:17,timeZone:"America/New_York"}});
assert.equal(y.opportunity.illustrativeGrossOpportunity,200);assert.match(y.opportunity.warning,/Not revenue/);
const impossible=analyzeLeads([{receivedAt:"2026-09-21T10:00:00Z",responseAt:"2026-09-21T09:00:00Z"}]);
assert.equal(impossible.total,0,"response-before-receipt rows must be rejected");
assert.equal(analyzeLeads(rows,{averageJobValue:-1,closeRate:.2}).opportunity.status,"INVALID_INPUT");
assert.equal(analyzeLeads(rows,{averageJobValue:500,closeRate:1.2}).opportunity.status,"INVALID_INPUT");
const tz=analyzeLeads([{receivedAt:"2026-09-21T13:30:00Z"}],{businessHours:{start:9,end:17,timeZone:"America/New_York"}});
assert.equal(tz.businessHours.count,1,"business-hours segmentation must use configured timezone");
console.log("lead response diagnostic tests passed");
