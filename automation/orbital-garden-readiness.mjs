import fs from "node:fs";
import { catalogProduct, variantPrices, tokenScopes, capabilities } from "./providers/printful-readonly.mjs";
const productId=274;
const product=await catalogProduct(productId);
const prices=await variantPrices(productId);
let scopes=null; try{scopes=await tokenScopes()}catch(e){scopes={error:e.message}}
const out={schema:"mint.orbital-garden.readiness.v1",observedAt:new Date().toISOString(),productId,capabilities,prices,tokenScopes:scopes,gates:{catalogEvidence:"PASS",geometryEvidence:"PASS",artworkVectorQA:"PASS",supplierUploadValidation:"PENDING",supplierMockup:"PENDING",shippingQuote:"PENDING",fees:"PENDING",sampleQA:"PENDING",publication:"BLOCKED"},productSummary:{title:product?.result?.product?.title||product?.result?.title||null,variantCount:prices.length}};
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});fs.writeFileSync("connect-demo/exports/physical/orbital-garden-readiness.json",JSON.stringify(out,null,2)+"\n");
if(capabilities.orders||capabilities.spend||capabilities.productWrites) throw Error("Unsafe Printful capability");
console.log("ORBITAL GARDEN READINESS SNAPSHOT COMPLETE: read-only economics/scopes captured; publication remains blocked");
