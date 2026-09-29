import fs from "node:fs";import path from "node:path";
const root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const catalog=read("systems/commerce/catalog.json"),brandMap=read("systems/brand/product-brand-map.json");
const failures=[],warnings=[];
for(const [id,o] of Object.entries(catalog.offers||{})){
 if(o.id!==id)failures.push(id+": key/id mismatch");
 if(o.status==="ACTIVE"&&!o.mandate_id)failures.push(id+": ACTIVE without mandate");
 if(o.status==="ACTIVE"&&(!o.acquisition?.headline||!o.acquisition?.cta))failures.push(id+": ACTIVE missing acquisition copy");
 if(!Number.isInteger(o.price?.unit_amount)||o.price.unit_amount<0)failures.push(id+": invalid price");
 if(!brandMap.assignments?.[id])warnings.push(id+": no explicit Brand OS assignment");
 if(o.fulfillment?.kind==="FILE"){
  const p=path.join(root,"connect-demo",o.fulfillment.path||"");
  if(!o.fulfillment.path||!fs.existsSync(p))failures.push(id+": fulfillment file missing");
  else if(fs.statSync(p).size<300)warnings.push(id+": fulfillment artifact is unusually small");
 }
 if(o.bundle?.components){
  let total=0;
  for(const component of o.bundle.components){
   const c=catalog.offers?.[component];
   if(!c)failures.push(id+": missing bundle component "+component);
   else total+=c.price.unit_amount;
  }
  if(o.bundle.current_separate_total_cents!==total)failures.push(id+": stated separate bundle total does not match current catalog prices");
  if(o.price.unit_amount>=total)warnings.push(id+": bundle price does not currently save against components");
 }
 const text=[o.name,o.description,o.acquisition?.headline,o.acquisition?.body].filter(Boolean).join(" ").toLowerCase();
 for(const phrase of ["best in the world","guaranteed results","limited spots","selling fast","thousands of customers"]){
  if(text.includes(phrase))warnings.push(id+": review unsupported promotional phrase: "+phrase);
 }
}
const report={schema:"mint.red-team.release-gate.v1",passed:failures.length===0,failures,warnings,truth:"Passing this structural/adversarial gate does not prove external deployment, security, legal compliance, demand, sales, customer satisfaction, or profitability."};
fs.mkdirSync(path.join(root,"automation/state"),{recursive:true});
fs.writeFileSync(path.join(root,"automation/state/red-team.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
