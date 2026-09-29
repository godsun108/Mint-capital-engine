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
  fs.mkdirSync(path.join(dir,"src"),{recursive:true});
  fs.writeFileSync(path.join(dir,"package.json"),JSON.stringify({name:slug,version:"0.1.0",type:"module",scripts:{test:"node --test"},engines:{node:">=20"}},null,2)+"\n");
  fs.writeFileSync(path.join(dir,"src","auth.js"),`export function bearerToken(header=""){\n  const m=/^Bearer\\s+(.+)$/i.exec(String(header).trim());\n  return m?.[1]||null;\n}\n\nexport function requireBearer(req,res,next){\n  const token=bearerToken(req?.headers?.authorization);\n  if(!token){res.status?.(401);return res.json?.({error:"unauthorized"});}\n  req.auth={token}; return next();\n}\n`);
  fs.writeFileSync(path.join(dir,"auth.test.js"),`import test from "node:test";\nimport assert from "node:assert/strict";\nimport {bearerToken,requireBearer} from "./src/auth.js";\n\ntest("extracts bearer token",()=>assert.equal(bearerToken("Bearer abc"),"abc"));\ntest("rejects malformed auth",()=>assert.equal(bearerToken("Basic abc"),null));\ntest("middleware rejects missing token",()=>{let status;let payload;const res={status:n=>(status=n,res),json:x=>payload=x};requireBearer({headers:{}},res,()=>assert.fail("next called"));assert.equal(status,401);assert.deepEqual(payload,{error:"unauthorized"});});\ntest("middleware passes token",()=>{let called=false;const req={headers:{authorization:"Bearer xyz"}};requireBearer(req,{},()=>called=true);assert.equal(called,true);assert.equal(req.auth.token,"xyz");});\n`);
  return {ok:true,artifactPath:`products/${slug}`,files:["mint-product.json","README.md","package.json","src/auth.js","auth.test.js"],status:"DRAFT_UNAUDITED"};
}
