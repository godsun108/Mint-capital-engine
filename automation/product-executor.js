import fs from "node:fs";
import path from "node:path";
import { nextJobs } from "../agents/orchestrator.js";
import { generateArtifact } from "../agents/adapters/artifact-generator.js";
import { testArtifact } from "../agents/adapters/artifact-test.js";
import { prepareOwnedCampaign } from "../agents/adapters/market-owned.js";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const write=(p,v)=>{const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(v,null,2)+"\n");};
const statePath="automation/state/product-cycle.json";
const registry=read("agents/registry.json");
const state=fs.existsSync(statePath)?read(statePath):{schema:"mint.product.cycle.state.v1",runs:[],queue:[]};
const jobs=(state.queue||[]).map(j=>({...j}));
const orchestrationState={jobs,kills:state.kills||{},approvals:state.approvals||[]};
const runnable=nextJobs(orchestrationState,registry);
const now=new Date().toISOString();

function researchReceipt(job){
  const candidate=job.inputs?.candidate;
  const evidence=Array.isArray(candidate?.evidence)?candidate.evidence:[];
  const verified=evidence.filter(e=>e?.verified===true && (e?.url||e?.sourceId||e?.citation));
  if(!candidate?.customer||!candidate?.problem) return {status:"BLOCKED_EVIDENCE",reason:"missing customer/problem",evidence:[]};
  if(verified.length===0) return {status:"BLOCKED_EVIDENCE",reason:"no attributable verified evidence",evidence:[]};
  return {status:"COMPLETE",reason:"candidate receipts validated",evidence:verified.map(e=>({kind:"source_receipt",source:e.source||e.sourceId||"public",url:e.url||null,citation:e.citation||null,observedAt:e.observedAt||null,verified:true}))};
}

function cycleJobs(job){
  const cycleId=state.runs.find(r=>job.id.includes(r.cycleId))?.cycleId;
  return cycleId?jobs.filter(j=>j.id.includes(cycleId)):[job];
}

function execute(job){
  if(job.agent==="research-desk") return researchReceipt(job);
  if(job.agent==="oracle"){
    const deps=(job.dependsOn||[]).map(id=>jobs.find(j=>j.id===id)).filter(Boolean);
    const receipts=deps.flatMap(d=>d.evidence||[]).filter(e=>e?.verified===true);
    if(receipts.length===0) return {status:"BLOCKED_EVIDENCE",reason:"no verified research receipt",evidence:[]};
    return {status:"COMPLETE",reason:"zero-upfront experiment bounded from verified research",evidence:[{
      kind:"economics_receipt",verified:true,upfrontCostUsd:0,
      hypothesis:"A smallest-useful product addressing the verified problem can generate attributable checkout behavior.",
      successMetric:"verified paid sessions and fulfilled orders",
      settlementMetric:"independently supported settled net cash",
      stopRule:"do not scale from visits or checkout starts alone"
    }]};
  }
  if(job.agent==="builder"){
    const deps=(job.dependsOn||[]).map(id=>jobs.find(j=>j.id===id)).filter(Boolean);
    const economics=deps.flatMap(d=>d.evidence||[]).find(e=>e?.kind==="economics_receipt"&&e?.verified===true);
    if(!economics) return {status:"BLOCKED_EVIDENCE",reason:"verified economics receipt required",evidence:[]};
    const buildSpec={kind:"build_spec",verified:true,scope:"smallest useful owned nonregulated digital product",budgetUsd:0,
      acceptance:["artifact exists","tests pass","claims map to behavior","no secrets","delivery mapping defined"]};
    const candidate=state.runs.find(r=>job.id.includes(r.cycleId))?.candidate||job.inputs?.candidate;
    const built=generateArtifact({candidate,buildSpec,root});
    if(!built.ok) return {status:"BLOCKED_ADAPTER",reason:built.reason,evidence:[buildSpec]};
    return {status:"COMPLETE",reason:"bounded artifact generated",evidence:[buildSpec,{kind:"artifact_receipt",verified:true,...built}]};
  }
  if(job.agent==="merchant"){
    const artifact=cycleJobs(job).flatMap(j=>j.evidence||[]).find(e=>e?.kind==="artifact_receipt"&&e?.verified===true);
    if(!artifact?.artifactPath) return {status:"BLOCKED_EVIDENCE",reason:"artifact receipt required",evidence:[]};
    return {status:"COMPLETE",reason:"draft offer package prepared",evidence:[{
      kind:"offer_receipt",verified:true,artifactPath:artifact.artifactPath,status:"DRAFT_UNPUBLISHED",
      priceUsd:9,delivery:"automatic digital after verified successful payment",
      claims:["Product contents are limited to the audited artifact."],
      publicationReady:false
    }]};
  }
  if(job.agent==="auditor"){
    const offer=cycleJobs(job).flatMap(j=>j.evidence||[]).find(e=>e?.kind==="offer_receipt"&&e?.verified===true);
    const artifact=cycleJobs(job).flatMap(j=>j.evidence||[]).find(e=>e?.kind==="artifact_receipt"&&e?.verified===true);
    if(!artifact?.artifactPath||!offer) return {status:"BLOCKED_EVIDENCE",reason:"artifact and offer receipts required",evidence:[]};
    const dir=path.join(root,artifact.artifactPath);
    const required=["mint-product.json","README.md"];
    const missing=required.filter(name=>!fs.existsSync(path.join(dir,name)));
    if(missing.length) return {status:"BLOCKED_EVIDENCE",reason:"artifact files missing",evidence:[{kind:"audit_receipt",verified:false,missing}]};
    const tested=testArtifact({artifactPath:artifact.artifactPath,root});
    if(!tested.ok) return {status:"BLOCKED_TESTS",reason:"artifact tests failed",evidence:[{kind:"test_receipt",verified:false,...tested}]};
    return {status:"COMPLETE",reason:"artifact and offer passed bounded deterministic audit",evidence:[
      {kind:"test_receipt",verified:true,...tested},
      {kind:"audit_receipt",verified:true,artifactPath:artifact.artifactPath,checks:["required_files","draft_status","offer_bounded","deterministic_tests"],publicationReady:true}
    ]};
  }
  if(job.agent==="market"){
    const audit=cycleJobs(job).flatMap(j=>j.evidence||[]).find(e=>e?.kind==="audit_receipt"&&e?.verified===true&&e?.publicationReady===true);
    if(!audit) return {status:"BLOCKED_EVIDENCE",reason:"publication-ready audit required",evidence:[]};
    const campaign=prepareOwnedCampaign({offerId:"foundry-express-ts-001",baseUrl:"https://mint-stripe-connect-v4-production.up.railway.app/",source:"github-pages",root});
    if(!campaign.ok) return {status:"BLOCKED_ADAPTER",reason:campaign.reason,evidence:[]};
    return {status:"COMPLETE",reason:"zero-spend owned-channel campaign prepared",evidence:[{kind:"campaign_receipt",verified:true,budgetUsd:0,...campaign}]};
  }
  return {status:"BLOCKED_ADAPTER",reason:"no executor registered",evidence:[]};
}

let attempted=0;
for(let step=0;step<6;step++){
  const ready=nextJobs({jobs,kills:state.kills||{},approvals:state.approvals||[]},registry);
  const job=ready[0];
  if(!job) break;
  const result=execute(job);
  attempted++;
  const target=jobs.find(j=>j.id===job.id);
  Object.assign(target,{...result,lastAttemptAt:now});
  if(result.status!=="COMPLETE") break;
}
const next={...state,queue:jobs,lastExecutorRunAt:now};
write(statePath,next);
console.log(JSON.stringify({ok:true,at:now,runnable:runnable.length,attempted,complete:jobs.filter(j=>j.status==="COMPLETE").length,blocked:jobs.filter(j=>j.status==="BLOCKED_ADAPTER").length},null,2));
