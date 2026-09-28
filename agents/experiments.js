import { economics } from "./runtime.js";
export function createExperiment({id,hypothesis,customer,problem,offer,channel,budget=0,timeBudgetHours=0,success,stop}){
 if(!id||!hypothesis||!offer)throw new Error("id, hypothesis and offer required");
 return {id,hypothesis,customer,problem,offer,channel,budget,timeBudgetHours,success,stop,status:"DRAFT",settledRevenue:0,costs:[],evidence:[],createdAt:new Date().toISOString()};
}
export function summarizeExperiment(x){
 const directCost=(x.costs||[]).reduce((n,c)=>n+(Number(c.amount)||0),0);
 return {...economics({settledRevenue:Number(x.settledRevenue)||0,directCost}),id:x.id,status:x.status};
}
