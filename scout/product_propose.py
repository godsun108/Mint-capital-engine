#!/usr/bin/env python3
import json, re
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
OBS=ROOT/"automation"/"product-scout-observations.json"
SYN=ROOT/"automation"/"product-scout-synthesis.json"
OUT=ROOT/"automation"/"product-scout-proposals.json"

def slug(s): return re.sub(r"[^a-z0-9]+","-",str(s).lower()).strip("-")[:48]
def main():
 now=datetime.now(timezone.utc).isoformat()
 obs=json.loads(OBS.read_text()) if OBS.exists() else {"groups":[]}
 syn=json.loads(SYN.read_text()) if SYN.exists() else {"clusters":[]}
 groups={g.get("topic"):g for g in obs.get("groups",[])}
 proposals=[]
 for cluster in syn.get("clusters",[]):
  if not cluster.get("promotionEligible"): continue
  topic=cluster.get("topic"); group=groups.get(topic,{})
  by_url={o.get("url"):o for o in group.get("observations",[]) if (o.get("sourceVerified") is True or o.get("verified") is True) and o.get("url")}
  used=[]
  for pair in cluster.get("relatedPairs",[]):
   for url in (pair.get("a"),pair.get("b")):
    if url in by_url and url not in used: used.append(url)
  evidence=[{"kind":"public_problem_observation","source":by_url[u].get("source"),"url":u,
             "observedAt":by_url[u].get("observedAt"),"verified":True,
             "claim":by_url[u].get("title","")} for u in used]
  if len({e["url"] for e in evidence})<2: continue
  proposals.append({"id":"proposal:"+slug(topic)+":001","topic":topic,
    "status":"PROPOSED_FOR_RESEARCH","regulated":False,"upfrontCostUsd":0,
    "evidence":evidence,
    "guardrails":["proposal_is_not_verified_demand","research_must_define_customer_and_problem","no_build_before_product_gate"]})
 OUT.write_text(json.dumps({"schema":"mint.product.scout.proposals.v1","generatedAt":now,
   "semantics":"RESEARCH_PROPOSALS_NOT_PRODUCT_CANDIDATES","proposals":proposals},indent=2)+"\n")
if __name__=="__main__":main()
