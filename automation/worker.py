#!/usr/bin/env python3
"""MINT unattended worker: turn verified repository inventory into scored product candidates. No external sales actions."""
import json, math, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(p): return json.loads((ROOT/p).read_text())
def score(x):
    reuse=float(x.get("reuse",0)); automation=float(x.get("automation",0)); demand=float(x.get("demand_evidence",0))
    effort=max(1,float(x.get("effort",5))); risk=float(x.get("risk",0))
    return round((reuse*25)+(automation*25)+(demand*30)+(20/effort)-(risk*20),2)
def main():
    inv=load("automation/ip_inventory.json")
    demand={x["candidate_id"]:x for x in load("automation/demand_summary.json").get("items",[])}
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    candidates=[]
    for x in inv.get("items",[]):
        if not x.get("verified"): continue
        y=dict(x); d=demand.get(x["id"],{}); y["demand_evidence"]=float(d.get("demand_evidence",0)); y["score"]=score(y); y["demand_observation_count"]=int(d.get("observation_count",0)); y["state"]=d.get("stage","RESEARCH_DEMAND"); y["external_action_performed"]=False
        candidates.append(y)
    candidates.sort(key=lambda z:z["score"],reverse=True)
    (ROOT/"automation"/"product_candidates.json").write_text(json.dumps({"schema":"mint.product_candidates.v1","generated_at":now,"items":candidates,"semantics":"CANDIDATE_ONLY"},indent=2))
if __name__=="__main__": main()
