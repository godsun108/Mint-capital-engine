import fs from "node:fs";
const API=process.env.PRINTFUL_API_BASE||"https://api.printful.com";
const token=process.env.PRINTFUL_TOKEN;
const store=process.env.PRINTFUL_STORE_ID;
if(!token||!store) throw Error("Printful credentials required");
const headers={Authorization:"Bearer "+token,Accept:"application/json","X-PF-Store-Id":store};
const path="/v2/shipping-rates";
const body={recipient:{country_code:"US",state_code:"FL"},order_items:[{source:"catalog",quantity:1,catalog_variant_id:9039}],currency:"USD"};
const r=await fetch(API+path,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(body)});
const raw=await r.text();
let response;try{response=JSON.parse(raw)}catch{response={raw:raw.slice(0,1000)}}
const out={schema:"mint.orbital-garden.shipping-evidence.v1",observedAt:new Date().toISOString(),productId:274,variantId:9039,country:"US",httpStatus:r.status,ok:r.ok,response,orders:false,spend:false};
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});
fs.writeFileSync("connect-demo/exports/physical/orbital-garden-shipping-evidence.json",JSON.stringify(out,null,2)+"\n");
console.log("ORBITAL GARDEN SHIPPING EVIDENCE:",JSON.stringify(out));
if(!r.ok) throw Error("Read-only shipping quote failed HTTP "+r.status);
