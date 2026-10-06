import fs from "node:fs";
import { catalogProducts, catalogProduct, layoutTemplates, printFiles, capabilities } from "./providers/printful-readonly.mjs";

const terms = (process.argv.slice(2).length ? process.argv.slice(2) : ["all-over print tote","all over print tote","tote"]).map(x=>x.toLowerCase());
let offset=0, all=[];
for(let page=0;page<30;page++){
  const data=await catalogProducts({limit:100,offset});
  const items=Array.isArray(data?.result)?data.result:(data?.result?.data||[]);
  all.push(...items);
  if(items.length<100) break;
  offset+=100;
}
const hay=x=>JSON.stringify(x).toLowerCase();
let matches=all.filter(x=>terms.some(t=>hay(x).includes(t)));
if(!matches.length){
  fs.mkdirSync("connect-demo/exports/physical",{recursive:true});
  fs.writeFileSync("connect-demo/exports/physical/printful-catalog-snapshot.json",JSON.stringify({observedAt:new Date().toISOString(),count:all.length,terms,products:all},null,2)+"\n");
  throw new Error(`No catalog match for ${terms.join(", ")}; saved ${all.length}-product snapshot for evidence`);
}
const out={schema:"mint.printful.discovery.v2",observedAt:new Date().toISOString(),capabilities,terms,catalogCount:all.length,matches:[]};
for(const m of matches){
 const id=Number(m.id); const detail=await catalogProduct(id);
 const variants=detail?.result?.variants||detail?.result?.product?.variants||[];
 const techniques=[...new Set(variants.flatMap(v=>v?.techniques||[]).map(t=>typeof t==="string"?t:t?.key).filter(Boolean))];
 const evidence={catalog:m,id,title:m.title||m.model||m.name,techniques,layouts:{},printfiles:{}};
 for(const technique of techniques.length?techniques:[null]){
   const key=technique||"default";
   try{evidence.layouts[key]=await layoutTemplates(id,technique)}catch(e){evidence.layouts[key]={error:e.message}}
   try{evidence.printfiles[key]=await printFiles(id,technique)}catch(e){evidence.printfiles[key]={error:e.message}}
 }
 out.matches.push(evidence);
}
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});
fs.writeFileSync("connect-demo/exports/physical/orbital-garden-printful-discovery.json",JSON.stringify(out,null,2)+"\n");
console.log(`PRINTFUL DISCOVERY COMPLETE: ${out.matches.length} match(es) across ${all.length} catalog products; no writes/orders/spend`);
