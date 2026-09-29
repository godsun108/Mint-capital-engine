import fs from "node:fs";
import path from "node:path";

export function testArtifact({artifactPath,root=process.cwd()}={}){
  if(!artifactPath||artifactPath.includes("..")) return {ok:false,reason:"invalid_artifact_path",checks:[]};
  const dir=path.join(root,artifactPath);
  const manifestPath=path.join(dir,"mint-product.json");
  const readmePath=path.join(dir,"README.md");
  const checks=[
    {id:"directory",ok:fs.existsSync(dir)},
    {id:"manifest",ok:fs.existsSync(manifestPath)},
    {id:"readme",ok:fs.existsSync(readmePath)}
  ];
  if(checks.every(x=>x.ok)){
    try{
      const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
      checks.push({id:"draft_status",ok:manifest.status==="DRAFT_UNAUDITED"});
      checks.push({id:"candidate_link",ok:typeof manifest.candidateId==="string"&&manifest.candidateId.length>0});
      checks.push({id:"template",ok:manifest.template==="express-ts-addon"});
    }catch{
      checks.push({id:"manifest_json",ok:false});
    }
  }
  return {ok:checks.length>0&&checks.every(x=>x.ok),checks};
}
