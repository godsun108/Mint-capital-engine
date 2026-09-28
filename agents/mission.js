export function createMission({id,objective,constraints=[],budget=0,successCriteria=[],stopConditions=[],allowedAgents=[]}){
 if(!id||!objective)throw new Error("mission id and objective required");
 return {id,objective,constraints,budget,successCriteria,stopConditions,allowedAgents,status:"DRAFT",createdAt:new Date().toISOString()};
}
export function opportunityCandidate({id,title,problem,customer,evidence=[],revenuePath=null,upfrontCash=0,timeToCashDays=null,risks=[]}){
 if(!id||!title||!problem)throw new Error("candidate id, title and problem required");
 return {id,title,problem,customer:customer||"unknown",evidence,revenuePath,upfrontCash,timeToCashDays,risks,status:"UNVERIFIED"};
}
export function readyForResearch(candidate){return candidate.evidence.some(e=>e.type==="external_source")&&Boolean(candidate.problem);}
