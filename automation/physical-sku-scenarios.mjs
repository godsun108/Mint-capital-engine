import fs from 'node:fs';
const s=JSON.parse(fs.readFileSync('connect-demo/physical-sku-candidate.json','utf8'));
if(s.publishable||s.sample_status!=='NOT_ORDERED'||s.marketplace_eligibility!=='UNVERIFIED')throw Error('Unverified candidate promoted');
if(s.public_reference_price_cents+s.public_shipping_starts_at_cents!==s.estimated_minimum_supplier_cost_cents)throw Error('Base arithmetic mismatch');
const scenarios=s.customer_price_scenarios_cents.map(price=>({illustrative_customer_price_cents:price,reference_product_plus_shipping_cents:s.estimated_minimum_supplier_cost_cents,remainder_before_all_other_costs_cents:price-s.estimated_minimum_supplier_cost_cents,net_profit_cents:null}));
const out={schema:'mint.physical.sku-scenario.v1',status:'ILLUSTRATIVE_NOT_MARGIN_OR_OFFER',candidate_id:s.candidate_id,scenarios,required_next_evidence:['exact_supplier_variant_and_print_file','destination_shipping_quote','sales_channel_fee_schedule','tax_treatment','return_allowance','sample_and_artwork_QA','owner_approval']};
fs.mkdirSync('connect-demo/exports/physical',{recursive:true});fs.writeFileSync('connect-demo/exports/physical/sku-scenarios.json',JSON.stringify(out,null,2)+'\n');
if(scenarios.some(x=>x.net_profit_cents!==null))throw Error('Unknown profit invented');
console.log('SKU SCENARIO QA PASS; '+scenarios.length+' illustrative prices; no profit or publishability claims');
