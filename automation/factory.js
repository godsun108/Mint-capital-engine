import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";import {spawnSync} from "node:child_process";
const root=process.cwd(),stateDir=path.join(root,"automation/state"),queuePath=path.join(stateDir,"factory-queue.json"),runPath=path.join(stateDir,"factory-run.json");
fs.mkdirSync(stateDir,{recursive:true});
const now=()=>new Date().toISOString(),maxAttempts=3;
const runId=process.env.GITHUB_RUN_ID||`local-${Date.now()}`,runAttempt=process.env.GITHUB_RUN_ATTEMPT||"1";
const hardStops=["SPEND_MONEY","BORROW","OPEN_FINANCIAL_ACCOUNT","TRADE_OR_INVEST","SIGN_OR_ACCEPT_BINDING_TERMS","OWNER_ATTESTATION","IMPERSONATE_OWNER","UNAUTHORIZED_OUTREACH"];
const seed=[
 {task_id:"fleet-prepare",objective:"Run deterministic commerce preparation and release gates",owner_agent:"deckhand",kind:"SCRIPT",command:"automation/deckhand.js",status:"READY",allowed_actions:["LOCAL_READ","LOCAL_WRITE","GENERATE","VALIDATE"],hard_stops:hardStops,expected_evidence:"successful process exit",dependencies:[],recurring:true},
 {task_id:"external-verify",objective:"Verify public MINT surfaces independently",owner_agent:"watchtower",kind:"SCRIPT",command:"automation/watchtower.js",status:"READY",allowed_actions:["PUBLIC_HTTP_GET","LOCAL_WRITE"],hard_stops:hardStops,expected_evidence:"watchtower observation",dependencies:["fleet-prepare"],recurring:true},
 {task_id:"prospect-next",objective:"Prepare evidence-bearing zero-spend distribution hypotheses for active offers",owner_agent:"prospector",kind:"SCRIPT",command:"automation/prospector.js",status:"BACKLOG",allowed_actions:["LOCAL_READ","LOCAL_WRITE","PREPARE"],hard_stops:hardStops,expected_evidence:"prospector opportunity record",dependencies:["fleet-prepare","external-verify"],recurring:true},
 {task_id:"merchant-prepare",objective:"Convert verified hypotheses into attributed channel-ready assets without publishing",owner_agent:"merchant",kind:"SCRIPT",command:"automation/merchant.js",status:"BACKLOG",allowed_actions:["LOCAL_READ","LOCAL_WRITE","GENERATE","PREPARE"],hard_stops:hardStops,expected_evidence:"merchant asset record with experiment IDs and attribution URLs",dependencies:["prospect-next"],recurring:true},
 {task_id:"audit-funnel",objective:"Audit evidence integrity and identify the next commercial constraint",owner_agent:"auditor",kind:"SCRIPT",command:"automation/auditor.js",status:"BACKLOG",allowed_actions:["LOCAL_READ","LOCAL_WRITE","VALIDATE"],hard_stops:hardStops,expected_evidence:"funnel audit with evidence digest and next constraint",dependencies:["merchant-prepare"],recurring:true},
 {task_id:"evidence-integrity",objective:"Reject missing, malformed, or stale factory evidence",owner_agent:"auditor",kind:"SCRIPT",command:"automation/evidence-integrity.js",status:"BACKLOG",allowed_actions:["LOCAL_READ","LOCAL_WRITE","VALIDATE"],hard_stops:hardStops,expected_evidence:"freshness and integrity report",dependencies:["audit-funnel"],recurring:true}
];
let q;
try{q=JSON.parse(fs.readFileSync(queuePath,"utf8"))}catch{q={schema:"mint.factory.queue.v1",created_at:now(),tasks:seed}}
for(const s of seed){
 const existing=q.tasks.find(t=>t.task_id===s.task_id);
 if(!existing)q.tasks.push({...s});
 else Object.assign(existing,{objective:s.objective,owner_agent:s.owner_agent,kind:s.kind,command:s.command,allowed_actions:s.allowed_actions,hard_stops:s.hard_stops,expected_evidence:s.expected_evidence,dependencies:s.dependencies,recurring:Boolean(s.recurring)});
}
// One-time, evidence-preserving retry after the deterministic preparation/control-plane repair.
const fleetTask=q.tasks.find(t=>t.task_id==="fleet-prepare");
if(fleetTask?.status==="FAILED_TERMINAL"&&fleetTask.recovery_revision!=="deckhand-control-plane-v1"){
 fleetTask.previous_terminal_failure={attempts:fleetTask.attempts||0,failure_streak:fleetTask.failure_streak||0,at:now()};
 fleetTask.recovery_revision="deckhand-control-plane-v1";fleetTask.failure_streak=0;fleetTask.status="READY";
 fleetTask.next_action="Retry once after verified deterministic preparation/control-plane repair; prior terminal evidence preserved.";
}
// One-time, evidence-preserving retry after correcting auditor's self-referential readiness check.
const auditTask=q.tasks.find(t=>t.task_id==="audit-funnel");
if(auditTask?.status==="FAILED_TERMINAL"&&auditTask.audit_fix_revision!=="self-readiness-v1"){
 auditTask.previous_terminal_failure={attempts:auditTask.attempts||0,failure_streak:auditTask.failure_streak||0,at:now()};
 auditTask.audit_fix_revision="self-readiness-v1";auditTask.failure_streak=0;auditTask.status="READY";
 auditTask.next_action="Retry once after auditor self-readiness fix; prior terminal evidence preserved.";
}
for(const t of q.tasks)if(t.recurring&&(t.status==="DONE"||t.status==="BACKLOG"||t.status==="READY")){t.status="READY";t.next_action="Recurring task reset for this factory cycle."}
for(const t of q.tasks)if(t.status==="FAILED_RETRYABLE"){if((t.failure_streak||0)<maxAttempts){t.status="READY";t.next_action="Bounded retry authorized on a later factory run."}else{t.status="FAILED_TERMINAL";t.next_action="Retry budget exhausted; owner or maintainer review required."}}
const byId=id=>q.tasks.find(t=>t.task_id===id);
const known=new Set(q.tasks.map(t=>t.task_id));
for(const t of q.tasks)for(const d of t.dependencies||[])if(!known.has(d))throw new Error(`Unknown dependency ${d} for ${t.task_id}`);
const visiting=new Set(),visited=new Set();
function visit(id){if(visited.has(id))return;if(visiting.has(id))throw new Error(`Dependency cycle at ${id}`);visiting.add(id);for(const d of byId(id)?.dependencies||[])visit(d);visiting.delete(id);visited.add(id)}
for(const t of q.tasks)visit(t.task_id);
const events=[];
const startedQueueUpdatedAt=q.updated_at||null;
const restoredState=Boolean(startedQueueUpdatedAt);
for(const t of q.tasks){
 if(t.status==="DONE"||t.status.startsWith("BLOCKED")||t.status==="FAILED_TERMINAL")continue;
 const deps=t.dependencies||[];
 if(deps.some(d=>byId(d)?.status!=="DONE")){t.status="BACKLOG";continue}
 if(t.kind==="AGENT_HANDOFF"){t.status="READY";t.next_action="Dispatch through an authorized reasoning/tool session; autonomous script does not impersonate an unavailable agent runtime.";events.push({task_id:t.task_id,event:"HANDOFF_READY"});continue}
 if(t.kind==="SCRIPT"){
  t.status="RUNNING";t.attempts=(t.attempts||0)+1;t.started_at=now();
  const r=spawnSync(process.execPath,[path.join(root,t.command)],{cwd:root,encoding:"utf8",timeout:120000});
  t.finished_at=now();t.exit_code=r.status;t.evidence={stdout:(r.stdout||"").slice(-8000),stderr:(r.stderr||"").slice(-4000)};
  t.failure_streak=r.status===0?0:(t.failure_streak||0)+1;
  t.status=r.status===0?"DONE":(t.failure_streak>=maxAttempts?"FAILED_TERMINAL":"FAILED_RETRYABLE");
  t.next_action=r.status===0?null:(t.status==="FAILED_TERMINAL"?"Retry budget exhausted; owner or maintainer review required.":"Inspect evidence; retry only on a later run under the bounded retry policy.");
  events.push({task_id:t.task_id,event:t.status,exit_code:r.status,attempt:t.attempts,failure_streak:t.failure_streak});
 }
}
q.updated_at=now();
fs.writeFileSync(queuePath,JSON.stringify(q,null,2)+"\n");
const report={schema:"mint.factory.run.v1",run_id:runId,run_attempt:runAttempt,ran_at:now(),restored_state:restoredState,restored_queue_updated_at:startedQueueUpdatedAt,events,counts:Object.fromEntries(["BACKLOG","READY","RUNNING","DONE","BLOCKED_OWNER","BLOCKED_EXTERNAL","FAILED_RETRYABLE","FAILED_TERMINAL"].map(s=>[s,q.tasks.filter(t=>t.status===s).length])),truth:"Factory completion means only the declared task evidence was obtained. It does not imply sales, customers, revenue, settlement, eligibility, legal clearance, or external actions not evidenced here."};
fs.writeFileSync(runPath,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(q.tasks.some(t=>t.status==="FAILED_RETRYABLE"||t.status==="FAILED_TERMINAL"))process.exitCode=1;
