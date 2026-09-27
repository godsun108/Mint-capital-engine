#!/usr/bin/env python3
"""Aggregate sourced demand observations into candidate evidence. No synthetic demand."""
import json, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(p): return json.loads((ROOT/p).read_text())
def main():
    ev=load("automation/demand_evidence.json").get("observations",[])
    valid=[x for x in ev if x.get("source_url") and x.get("observed_at") and x.get("candidate_id")]
    grouped={}
    for x in valid: grouped.setdefault(x["candidate_id"],[]).append(x)
    out=[]
    for cid,rows in grouped.items():
        kinds=len(set(r.get("source_kind","unknown") for r in rows))
        strength=min(1.0, round((len(rows)*0.12)+(kinds*0.12),2))
        out.append({"candidate_id":cid,"observation_count":len(rows),"source_kind_count":kinds,"demand_evidence":strength,"sources":[r["source_url"] for r in rows],"semantics":"EVIDENCE_NOT_SALES"})
    (ROOT/"automation"/"demand_summary.json").write_text(json.dumps({"schema":"mint.demand_summary.v1","generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"items":out},indent=2))
if __name__=="__main__": main()
