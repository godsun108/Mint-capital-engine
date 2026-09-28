import registry from "./registry.json" with { type:"json" };
import { plan } from "./orchestrator.js";
export { registry };
export function bootstrapCompany(){
 const jobs=[
  plan({id:"discover-001",agent:"scout",objective:"Discover one evidence-backed customer problem with a plausible lawful revenue path.",budget:5}),
  plan({id:"verify-001",agent:"research-desk",objective:"Verify demand, constraints and alternatives for the discovered problem.",budget:10,dependsOn:["discover-001"]}),
  plan({id:"economics-001",agent:"oracle",objective:"Estimate unit economics and define a falsifiable launch experiment.",budget:5,dependsOn:["verify-001"]}),
  plan({id:"build-001",agent:"builder",objective:"Build the smallest useful product or service artifact.",budget:20,dependsOn:["economics-001"]}),
  plan({id:"package-001",agent:"merchant",objective:"Package the approved offer and fulfillment path.",budget:5,dependsOn:["build-001"]}),
  plan({id:"audit-001",agent:"auditor",objective:"Audit evidence, claims, permissions and readiness before launch.",budget:2,dependsOn:["package-001"]})
 ];
 return {jobs};
}
