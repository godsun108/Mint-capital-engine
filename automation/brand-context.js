import fs from "node:fs";import path from "node:path";
const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const registry=read("systems/brand/brands.json"),tokens=read("systems/brand/tokens.json"),map=read("systems/brand/product-brand-map.json");
const id=process.argv[2];
if(!id){console.error("usage: node automation/brand-context.js <product-id>");process.exit(2)}
const assignment=map.assignments[id];
if(!assignment){console.error("No brand assignment for "+id);process.exit(1)}
const brand=registry.brands[assignment.brand];
if(!brand){console.error("Unknown brand "+assignment.brand);process.exit(1)}
const context={schema:"mint.brand.context.v1",product_id:id,assignment_status:assignment.status,brand_id:brand.brand_id,public_name:brand.public_name,descriptor:brand.descriptor||null,mode:brand.mode,endorsement:brand.endorsement||null,naming_status:brand.naming_status,structural_tokens:tokens.structural,visual_tokens:brand.brand_id==="mint"?tokens.master_mint:{...tokens.master_mint,override_status:"NO_CHILD_VISUAL_OVERRIDE_DEFINED_USE_MASTER_UNTIL_DEFINED"},truth:"Brand context is presentation configuration, not trademark clearance or a separate legal seller."};
console.log(JSON.stringify(context,null,2));
