import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.existsSync(path.join(root,p))?JSON.parse(fs.readFileSync(path.join(root,p),"utf8")):null;
const learning=read("automation/state/learning.json")||{offers:{}};
const out={schema:"mint.allocation.state.v1",generatedAt:new Date().toISOString(),
  semantics:"ZERO_SPEND_ATTENTION_ALLOCATION_ONLY_NO_MONEY_MOVEMENT",allocations:{}};

for(const [offerId,x] of Object.entries(learning.offers||{})){
 const state=x?.decision?.state||"LIVE";
 const reason=x?.decision?.reason||"unknown";
 let action="HOLD_BASELINE",weight=1;
 if(state==="SCALING"){action="INCREASE_ZERO_SPEND_ATTENTION";weight=3;}
 else if(state==="VALIDATING"){action="CONTINUE_BOUNDED_VALIDATION";weight=1;}
 else if(state==="RETIRING"||state==="RETIRED"){action="STOP_NEW_ACQUISITION";weight=0;}
 out.allocations[offerId]={offerId,state,reason,action,attentionWeight:weight,
  constraints:["no_paid_spend","no_price_change_without_evidence","no_permission_escalation"]};
}
const file=path.join(root,"automation","state","allocation.json");
fs.mkdirSync(path.dirname(file),{recursive:true});
fs.writeFileSync(file,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out,null,2));
