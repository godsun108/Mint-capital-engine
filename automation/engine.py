#!/usr/bin/env python3
"""Build bounded MINT autonomy queues. Performs no external actions."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(path): return json.loads((ROOT/path).read_text())
def main():
    enabled={m["offer_id"]:m for m in load("automation/mandates.json").get("mandates",[]) if m.get("enabled")}
    offers=load("systems/catalog.json").get("items",[])
    agents=load("automation/agents.json").get("agents",[])
    resources=load("automation/resources.json").get("resources",[])
    fleet=load("automation/revenue_fleet.json")
    items=[]
    for offer in offers:
        mandate=enabled.get(offer.get("id"))
        if not mandate: continue
        price=float(offer.get("price_usd",0))
        inside=float(mandate.get("min_price_usd",0)) <= price <= float(mandate.get("max_price_usd",0))
        items.append({"offer_id":offer.get("id"),"mandate_id":mandate.get("id"),"state":"READY_FOR_ADAPTER" if inside else "BOUNDARY_STOP","publish_permitted":bool(mandate.get("auto_publish")) and inside,"fulfill_permitted":bool(mandate.get("auto_fulfill")) and inside,"external_action_performed":False})
    active_resources=[r["id"] for r in resources if r.get("available")]
    portfolio=[]
    for a in agents:
        portfolio.append({"agent_id":a["id"],"class":a["class"],"state":a["state"],"objective":a["objective"],"resources_available":active_resources,"external_action_performed":False})
        lanes=[]
    for lane in fleet.get("lanes",[]):
        lanes.append({"lane_id":lane["id"],"model":lane["model"],"agents":lane["agents"],"state":"DISCOVER_AND_VERIFY","automation_target":lane["automation_target"],"external_action_performed":False})
    (ROOT/"automation"/"queue.json").write_text(json.dumps({"schema":"mint.autonomy.queue.v3","objective":fleet["objective"],"truth_unit":fleet["truth_unit"],"offers":items,"portfolio":portfolio,"revenue_lanes":lanes},indent=2))
if __name__=="__main__": main()
