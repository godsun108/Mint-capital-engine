#!/usr/bin/env python3
"""Build a bounded autonomy queue. This module performs no external actions."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(path): return json.loads((ROOT/path).read_text())
def main():
    enabled={m["offer_id"]:m for m in load("automation/mandates.json").get("mandates",[]) if m.get("enabled")}
    offers=load("systems/catalog.json").get("items",[])
    items=[]
    for offer in offers:
        mandate=enabled.get(offer.get("id"))
        if not mandate: continue
        price=float(offer.get("price_usd",0))
        inside=float(mandate.get("min_price_usd",0)) <= price <= float(mandate.get("max_price_usd",0))
        items.append({
            "offer_id":offer.get("id"),
            "mandate_id":mandate.get("id"),
            "state":"READY_FOR_ADAPTER" if inside else "BOUNDARY_STOP",
            "publish_permitted":bool(mandate.get("auto_publish")) and inside,
            "fulfill_permitted":bool(mandate.get("auto_fulfill")) and inside,
            "external_action_performed":False
        })
    (ROOT/"automation/queue.json").write_text(json.dumps({"schema":"mint.autonomy.queue.v1","items":items},indent=2))
if __name__=="__main__": main()
