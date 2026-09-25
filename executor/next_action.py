#!/usr/bin/env python3
"""Return MINT's next deterministic action without performing consequential writes."""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def load(p):
 with open(ROOT/p) as f:return json.load(f)
routes=sorted(load("systems/money_routes.json")["routes"],key=lambda x:x["priority"])
catalog=load("systems/catalog.json")["items"]
if not catalog:
 out={"action":"APPROVE_REAL_OFFER","blocked_by":"NO_APPROVED_CATALOG_ITEM","external_write":False,
      "instruction":"Add one truthful deliverable product/service/receivable after human approval."}
else:
 out={"action":"PREPARE_FIRST_DOLLAR_JOB","catalog_item":catalog[0].get("id"),"external_write":False}
print(json.dumps(out,indent=2))
