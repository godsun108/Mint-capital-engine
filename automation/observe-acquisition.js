import fs from "node:fs";import path from "node:path";
const base=process.env.MINT_COMMERCE_URL;if(!base)throw new Error("MINT_COMMERCE_URL is required");
const r=await fetch(base.replace(/\/$/,"")+"/api/acquisition/state");if(!r.ok)throw new Error("acquisition-state request failed: "+r.status);
const snapshot=await r.json();
const out=path.join(process.cwd(),"automation","state","acquisition-observations.json");fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({...snapshot,capturedAt:new Date().toISOString(),captureSemantics:snapshot.durableStorageConfigured?"SNAPSHOT_OF_DURABLE_AGGREGATES_NOT_UNIQUE_VISITORS":"SNAPSHOT_OF_PROCESS_LOCAL_FALLBACK_NOT_UNIQUE_VISITORS_NOT_LIFETIME_TOTALS"},null,2)+"\n");
console.log(JSON.stringify({ok:true,totals:snapshot.totals,sources:snapshot.sources},null,2));