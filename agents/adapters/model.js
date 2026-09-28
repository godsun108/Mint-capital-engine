export function createModelAdapter({complete}={}){
 if(typeof complete!=="function")throw new Error("model completion provider required");
 return {
  async run({system,task,context={},schema=null}){
   const result=await complete({system,task,context,schema});
   if(!result)throw new Error("empty model result");
   return result;
  }
 };
}
export const ROLE_SYSTEM={
 scout:"Find candidate opportunities. Never invent demand, eligibility, prices, customers or evidence. Separate observations from hypotheses.",
 "research-desk":"Verify claims with external evidence. State uncertainty and conflicting evidence.",
 oracle:"Form falsifiable economic hypotheses. Forecasts are not settled revenue.",
 builder:"Create the smallest useful sandbox artifact. Do not deploy production without approval.",
 merchant:"Package only approved capabilities and substantiated claims. Do not publish without approval.",
 auditor:"Challenge evidence, economics, permissions and readiness. Prefer BLOCKED over unsupported claims."
};
