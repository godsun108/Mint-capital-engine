#!/usr/bin/env python3
"""Return MINT's next deterministic action without performing consequential writes."""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def load(p):
 with open(ROOT/p) as f:return json.load(f)
routes=sorted(load("systems/money_routes.json")["routes"],key=lambda x:x["priority"])
catalog=load("systems/catalog.json")["items"]
if not catalog:
 candidates=load("systems/offer_candidates.json")["items"]
 out={"action":"APPROVE_REAL_OFFER","blocked_by":"NO_APPROVED_CATALOG_ITEM","external_write":False,
      "instruction":"Choose and define one truthful deliverable. Do not invent demand, customers, eligibility, payment, or settlement.",
      "candidate_lanes":candidates}
else:
 approved=[x for x in catalog if x.get("human_approved") is True and x.get("status","APPROVED")=="APPROVED"]
 if not approved:
  out={"action":"HUMAN_APPROVAL_REQUIRED","blocked_by":"CATALOG_ITEM_NOT_APPROVED","external_write":False}
 else:
  out={"action":"PREPARE_FIRST_DOLLAR_JOB","catalog_item":approved[0].get("id"),"external_write":False,
       "next_gate":"EXPLICIT_AUTHORIZATION_BEFORE_EXTERNAL_PUBLICATION_OR_PAYMENT_WRITE"}
print(json.dumps(out,indent=2))
