#!/usr/bin/env python3
"""Create build briefs from verified IP plus sourced demand evidence. Does not publish or sell."""
import json, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(p): return json.loads((ROOT/p).read_text())
def main():
    inventory={x["id"]:x for x in load("automation/ip_inventory.json").get("items",[]) if x.get("verified")}
    demand={x["candidate_id"]:x for x in load("automation/demand_summary.json").get("items",[])}
    briefs=[]
    for cid,src in inventory.items():
        d=demand.get(cid)
        if not d or float(d.get("demand_evidence",0))<=0: continue
        briefs.append({"candidate_id":cid,"source_repo":src["source_repo"],"primitive":src["primitive"],"state":"READY_FOR_PRODUCT_DESIGN","demand_evidence":d["demand_evidence"],"evidence_sources":d["sources"],"requirements":["preserve source truth","define bounded customer problem","define deliverable","define automated fulfillment","estimate marginal cost","test before publication"],"external_action_performed":False})
    briefs.sort(key=lambda x:x["demand_evidence"],reverse=True)
    (ROOT/"automation"/"build_briefs.json").write_text(json.dumps({"schema":"mint.build_briefs.v1","generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"items":briefs},indent=2))
if __name__=="__main__": main()
