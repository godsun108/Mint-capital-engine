import fs from 'node:fs';
const e=JSON.parse(fs.readFileSync('connect-demo/physical-supplier-evidence.json','utf8'));
if(e.status!=='PUBLIC_DOCUMENTATION_VERIFIED_NOT_ACCOUNT_OR_SKU_VERIFIED')throw Error('Unexpected supplier status');
if(e.suppliers.length<2)throw Error('Need at least two suppliers');
for(const s of e.suppliers){if(s.account_connected||s.sample_tested||s.sku_id||s.landed_cost_cents!==null)throw Error('Unverified supplier promoted: '+s.id);if(!s.evidence.length||s.evidence.some(x=>!x.url.startsWith('https://')))throw Error('Missing official source '+s.id)}
if(!e.blockers.includes('exact_blank_sku')||!e.blockers.includes('owner_approval'))throw Error('Missing hard gate');
console.log('SUPPLIER EVIDENCE QA PASS: '+e.suppliers.length+' sourced candidates; zero SKU/account/sample claims');
