import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve('connect-demo');
const model=JSON.parse(fs.readFileSync(path.join(base,'physical-commerce.json'),'utf8'));
const candidates=model.product_hypotheses.map((x,i)=>({candidate_id:'physical-'+String(i+1).padStart(3,'0'),category:x.category,hypothesis:x.reason,sku:null,supplier:{name:null,verified:false,resale_permission:null,stock_sync:null,ship_from:null,lead_time_days:null,returns:null},economics:{selling_price_cents:null,unit_cost_cents:null,shipping_cents:null,platform_fee_cents:null,payment_fee_cents:null,expected_return_cost_cents:null,ad_cost_cents:null,contribution_margin_cents:null},evidence:{buyer_intent_urls:[],supplier_document_refs:[],sample_qa:null,marketplace_policy_refs:[]},stage:'RESEARCH',publishable:false}));
function margin(e){const keys=['selling_price_cents','unit_cost_cents','shipping_cents','platform_fee_cents','payment_fee_cents','expected_return_cost_cents','ad_cost_cents'];if(keys.some(k=>!Number.isInteger(e[k])||e[k]<0))return null;return e.selling_price_cents-keys.slice(1).reduce((sum,k)=>sum+e[k],0)}
function gate(x){const reasons=[];if(!x.sku)reasons.push('NO_SKU');if(!x.supplier.verified||x.supplier.resale_permission!==true)reasons.push('SUPPLIER_NOT_VERIFIED');if(!x.evidence.buyer_intent_urls.length)reasons.push('NO_BUYER_EVIDENCE');if(!x.evidence.marketplace_policy_refs.length)reasons.push('CHANNEL_POLICY_NOT_VERIFIED');if(x.evidence.sample_qa!=='PASS')reasons.push('SAMPLE_QA_MISSING');const m=margin(x.economics);if(m===null)reasons.push('COSTS_UNKNOWN');else if(m<=0)reasons.push('NON_POSITIVE_MARGIN');return {candidate_id:x.candidate_id,contribution_margin_cents:m,ready_for_owner_review:reasons.length===0,blocked_by:reasons}}
const output={schema:'mint.physical-commerce.qualification.v1',status:'RESEARCH_ONLY_NOT_A_PRODUCT_CATALOG',formula:'selling_price - unit_cost - shipping - platform_fee - payment_fee - expected_return_cost - ad_cost',candidates,qualification:candidates.map(gate),no_automated_publishing:true,no_automated_supplier_orders:true};
fs.mkdirSync(path.join(base,'exports','physical'),{recursive:true});
fs.writeFileSync(path.join(base,'exports','physical','qualification.json'),JSON.stringify(output,null,2)+'\n');
if(output.qualification.some(x=>x.ready_for_owner_review))throw Error('Research-only hypotheses unexpectedly qualified');
const test=margin({selling_price_cents:2500,unit_cost_cents:900,shipping_cents:400,platform_fee_cents:250,payment_fee_cents:100,expected_return_cost_cents:100,ad_cost_cents:0});
if(test!==750)throw Error('Margin calculation test failed: '+test);
console.log('QUALIFICATION QA PASS; '+candidates.length+' candidates safely blocked; arithmetic test PASS');
