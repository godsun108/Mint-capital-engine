import fs from 'node:fs';
const model=JSON.parse(fs.readFileSync('connect-demo/physical-commerce.json','utf8'));
if(model.status!=='RESEARCH_AND_SANDBOX_ONLY')throw Error('Unexpected live activation');
const out={schema:'mint.physical-commerce.research-board.v1',state:'UNVERIFIED_HYPOTHESES_NOT_LISTINGS',models:model.business_models,channels:model.marketplaces.map(c=>({channel:c.id,gate:c.status})),candidates:model.product_hypotheses.map((c,i)=>({id:'candidate-'+String(i+1).padStart(3,'0'),category:c.category,hypothesis:c.reason,search_evidence:null,supplier:null,unit_cost:null,shipping_cost:null,fees:null,expected_returns:null,margin:null,policy_check:'PENDING',sample_qa:'PENDING',listing_state:'BLOCKED'})),next_actions:['Research documented buyer intent for five categories','Find two or more legitimate suppliers per shortlisted SKU','Check exact marketplace policies and seller eligibility','Obtain accurate landed costs, shipping and return terms','Create owner-review sample and educational organic creative','Only then request owner approval for a zero-budget pilot'],hard_gates:model.candidate_requirements};
fs.mkdirSync('connect-demo/exports/physical',{recursive:true});
fs.writeFileSync('connect-demo/exports/physical/research-board.json',JSON.stringify(out,null,2)+'\n');
if(out.candidates.some(x=>x.listing_state!=='BLOCKED'||x.margin!==null))throw Error('Unverified item incorrectly activated');
console.log('PHYSICAL COMMERCE PREFLIGHT OK: '+out.candidates.length+' candidate categories; zero active listings, purchases or spend');
