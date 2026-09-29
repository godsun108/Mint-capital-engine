import fs from "node:fs";
import path from "node:path";
import { productCycle } from "../agents/product-loop.js";

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const write=(p,v)=>{const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(v,null,2)+"\n");};
const dry=process.argv.includes("--dry-run");
const candidatePath=process.env.MINT_CANDIDATE_FILE||"automation/candidates.json";
const mandates=read("automation/mandates.json");
const portfolio=read("systems/product-portfolio.json");
const mandate=mandates.mandates.find(x=>x.id===portfolio.cycle.mandate_id);
const candidates=fs.existsSync(candidatePath)?read(candidatePath).candidates||[]:[];
const statePath="automation/state/product-cycle.json";
const state=fs.existsSync(statePath)?read(statePath):{schema:"mint.product.cycle.state.v1",runs:[],queue:[]};
const seen=new Set(state.runs.flatMap(r=>r.candidateId?[r.candidateId]:[]));
const pending=candidates.filter(c=>!seen.has(c.id)).slice(0,portfolio.cycle.max_candidates_per_cycle);
const now=new Date().toISOString();
const results=pending.map((candidate,i)=>{
  const cycleId=`${now.slice(0,10).replaceAll("-","")}-${String(state.runs.length+i+1).padStart(4,"0")}`;
  const cycle=productCycle({cycleId,candidate,mandate});
  return {candidateId:candidate.id,at:now,...cycle};
});
const next={...state,lastRunAt:now,runs:[...state.runs,...results],queue:[...state.queue,...results.flatMap(r=>r.jobs||[])]};
if(!dry) write(statePath,next);
console.log(JSON.stringify({ok:true,dryRun:dry,candidatesSeen:candidates.length,candidatesStarted:results.length,results},null,2));
