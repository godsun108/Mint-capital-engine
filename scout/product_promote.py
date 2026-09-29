#!/usr/bin/env python3
import json, re
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
PROPOSALS=ROOT/"automation"/"product-scout-proposals.json"
OUT=ROOT/"automation"/"candidates.json"

TOPICS={
 "express-auth":{
  "customer":"developers building small Express + TypeScript services",
  "problem":"Repeated implementation of basic bearer-token authentication middleware and tests.",
  "template":"express-ts-addon",
  "productSlug":"express-ts-auth-addon"
 }
}

def main():
 data=json.loads(PROPOSALS.read_text()) if PROPOSALS.exists() else {"proposals":[]}
 current=json.loads(OUT.read_text()) if OUT.exists() else {"schema":"mint.product.candidates.v1","candidates":[]}
 existing={c.get("id"):c for c in current.get("candidates",[])}
 for p in data.get("proposals",[]):
  spec=TOPICS.get(p.get("topic"))
  if not spec: continue
  ev=p.get("evidence",[])
  distinct={e.get("url") for e in ev if e.get("verified") is True and e.get("url")}
  if len(distinct)<2: continue
  cid="candidate:"+p["topic"]+":scout-001"
  existing[cid]={**spec,"id":cid,"regulated":False,"upfrontCostUsd":0,
    "evidence":ev,"status":"DISCOVERED_SOURCE_BACKED",
    "provenance":{"proposalId":p.get("id"),"promotedAt":datetime.now(timezone.utc).isoformat(),
      "semantics":"SOURCE_BACKED_CANDIDATE_RESEARCH_STILL_REQUIRED"}}
 OUT.write_text(json.dumps({"schema":"mint.product.candidates.v1","candidates":list(existing.values())},indent=2)+"\n")
if __name__=="__main__":main()
