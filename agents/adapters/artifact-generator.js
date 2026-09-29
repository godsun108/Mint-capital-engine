import fs from "node:fs";
import path from "node:path";

const SAFE_ID=/^[a-z0-9][a-z0-9-]{2,63}$/;

export function generateArtifact({candidate,buildSpec,root=process.cwd()}={}){
  if(!candidate?.id||!candidate?.customer||!candidate?.problem) return {ok:false,reason:"candidate_incomplete"};
  if(!buildSpec?.verified) return {ok:false,reason:"unverified_build_spec"};
  const template=candidate.template;
  if(template!=="express-ts-addon") return {ok:false,reason:"unsupported_template"};
  const slug=String(candidate.productSlug||"").toLowerCase();
  if(!SAFE_ID.test(slug)) return {ok:false,reason:"invalid_product_slug"};
  const dir=path.join(root,"products",slug);
  if(fs.existsSync(dir)) return {ok:false,reason:"artifact_exists"};
  fs.mkdirSync(dir,{recursive:true});
  const manifest={
    schema:"mint.generated.product.v1",
    candidateId:candidate.id,
    template,
    customer:candidate.customer,
    problem:candidate.problem,
    generatedAt:new Date().toISOString(),
    status:"DRAFT_UNAUDITED",
    claims:["Generated from a bounded MINT-owned template; audit required before publication."]
  };
  fs.writeFileSync(path.join(dir,"mint-product.json"),JSON.stringify(manifest,null,2)+"\n");
  fs.writeFileSync(path.join(dir,"README.md"),`# ${slug}\n\nDraft artifact generated from the MINT express-ts-addon template.\n\nCustomer: ${candidate.customer}\n\nProblem: ${candidate.problem}\n\nStatus: DRAFT_UNAUDITED. This artifact must pass tests and audit before publication.\n`);
  return {ok:true,artifactPath:`products/${slug}`,files:["mint-product.json","README.md"],status:"DRAFT_UNAUDITED"};
}
