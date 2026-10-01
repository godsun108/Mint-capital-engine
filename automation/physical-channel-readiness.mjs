import fs from 'node:fs';
const model=JSON.parse(fs.readFileSync('connect-demo/physical-commerce.json','utf8'));
const channels=model.marketplaces.map(x=>({channel:x.id,model_eligibility:'UNVERIFIED',account_connected:false,identity_verified:false,fulfillment_policy_checked:false,returns_policy_checked:false,product_category_checked:false,listing_ready:false,notes:x.status}));
const checklist={schema:'mint.physical.channel-readiness.v1',state:'NOT_CONNECTED_NO_PUBLICATION',channels,universal_gates:['verified_seller_account','permitted_business_model','verified_supplier','accurate_stock_and_delivery','returns_support','unit_economics','owner_publication_approval'],controls:{no_platform_policy_assumptions:true,no_retail_arbitrage_by_default:true,no_live_listing_creation:true,no_spend:true}};
fs.mkdirSync('connect-demo/exports/physical',{recursive:true});
fs.writeFileSync('connect-demo/exports/physical/channel-readiness.json',JSON.stringify(checklist,null,2)+'\n');
if(channels.some(x=>x.listing_ready||x.account_connected))throw Error('Unverified channel marked ready');
if(new Set(channels.map(x=>x.channel)).size!==channels.length)throw Error('Duplicate channel');
console.log('CHANNEL READINESS QA PASS: '+channels.length+' channels, all gated');
