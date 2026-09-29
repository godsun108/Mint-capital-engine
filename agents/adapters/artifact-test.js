import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

export function testArtifact({artifactPath,root=process.cwd()}={}){
  if(!artifactPath||artifactPath.includes("..")) return {ok:false,reason:"invalid_artifact_path",checks:[]};
  const dir=path.join(root,artifactPath);
  const manifestPath=path.join(dir,"mint-product.json");
  const readmePath=path.join(dir,"README.md");
  const packagePath=path.join(dir,"package.json");
  const authPath=path.join(dir,"src","auth.js");
  const testPath=path.join(dir,"auth.test.js");
  const checks=[
    {id:"directory",ok:fs.existsSync(dir)},
    {id:"manifest",ok:fs.existsSync(manifestPath)},
    {id:"readme",ok:fs.existsSync(readmePath)},
    {id:"package",ok:fs.existsSync(packagePath)},
    {id:"auth_module",ok:fs.existsSync(authPath)},
    {id:"functional_test",ok:fs.existsSync(testPath)}
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
  if(checks.every(x=>x.ok)){
    const run=spawnSync(process.execPath,["--test","auth.test.js"],{cwd:dir,encoding:"utf8",timeout:10000});
    checks.push({id:"node_test",ok:run.status===0,exitCode:run.status});
  }
  return {ok:checks.length>0&&checks.every(x=>x.ok),checks};
}
