#!/usr/bin/env python3
"""Validate settlement imports before they can become MINT settled cash."""
import json, sys
REQUIRED={"external_id","provider","amount_usd","status","observed_at"}
ALLOWED={"PAID","AVAILABLE","SETTLED","REFUNDED","DISPUTED"}
def validate(e):
 missing=REQUIRED-set(e)
 if missing:return False,"missing:"+",".join(sorted(missing))
 if e["status"] not in ALLOWED:return False,"bad_status"
 try:
  if float(e["amount_usd"])<0:return False,"negative_amount"
 except:return False,"bad_amount"
 return True,"ok"
if __name__=="__main__":
 data=json.load(sys.stdin);out=[]
 for e in data.get("events",[]):
  ok,reason=validate(e);out.append({"external_id":e.get("external_id"),"valid":ok,"reason":reason,"eligible_for_settled_ledger":ok and e.get("status")=="SETTLED"})
 print(json.dumps({"schema":"mint.settlement.validation.v1","results":out},indent=2))
