import fs from "node:fs";
const file=new URL("../systems/commerce/catalog.json",import.meta.url);
const catalog=JSON.parse(fs.readFileSync(file,"utf8"));
const errors=[];
const digitalKinds=new Set(["FILE","LICENSE","SAAS_ACCESS","SERVICE"]);
const physicalKinds=new Set(["PRINT_ON_DEMAND","SUPPLIER_FULFILLED","STOCKED_PHYSICAL"]);
for(const [key,o] of Object.entries(catalog.offers||{})){
 const p="offers."+key;
 if(o.id!==key) errors.push(p+": id mismatch");
 if(!["ACTIVE","DRAFT","RESEARCH","RETIRED"].includes(o.status)) errors.push(p+": invalid status");
 if(!o.name||!o.description) errors.push(p+": missing name/description");
 if(!o.mandate_id) errors.push(p+": missing mandate_id");
 if(!Number.isInteger(o.price?.unit_amount)||o.price.unit_amount<0) errors.push(p+": invalid unit amount");
 if(!/^[a-z]{3}$/.test(o.price?.currency||"")) errors.push(p+": invalid currency");
 if(!Array.isArray(o.channels)) errors.push(p+": channels must be an array");
 const kind=o.fulfillment?.kind;
 if(!digitalKinds.has(kind)&&!physicalKinds.has(kind)) errors.push(p+": unknown fulfillment kind");
 if(kind==="FILE"){
   if(!o.fulfillment.path||!o.fulfillment.filename) errors.push(p+": FILE fulfillment missing path/filename");
 }
 if(physicalKinds.has(kind)){
   for(const field of ["inventory_model","shipping_responsibility","return_policy","supplier_status","fulfillment_sla_evidence","unit_landed_cost_evidence"]){
     if(o.physical?.[field]==null) errors.push(p+": physical."+field+" required");
   }
 }
 if(o.status==="ACTIVE"&&!o.acquisition?.headline) errors.push(p+": ACTIVE offer missing acquisition message");
}
if(errors.length){console.error(JSON.stringify({ok:false,schema:catalog.schema,errors},null,2));process.exit(1)}
console.log(JSON.stringify({ok:true,schema:catalog.schema,offers:Object.keys(catalog.offers||{}).length,active:Object.values(catalog.offers||{}).filter(x=>x.status==="ACTIVE").length},null,2));
