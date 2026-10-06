#!/usr/bin/env python3
"""Aggregate sourced demand observations into evidence stages. Never infer sales from discussion."""
import json, datetime
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
def load(p): return json.loads((ROOT/p).read_text())
def domain(url):
    try:
        host=(urlparse(url).hostname or "").lower()
        return host[4:] if host.startswith("www.") else host
    except Exception: return ""
def main():
    ev=load("automation/demand_evidence.json").get("observations",[])
    valid=[x for x in ev if x.get("source_url") and x.get("observed_at") and x.get("candidate_id")]
    grouped={}
    for x in valid: grouped.setdefault(x["candidate_id"],[]).append(x)
    now=datetime.datetime.now(datetime.timezone.utc).date()
    out=[]
    for cid,rows in grouped.items():
        kinds=len(set(r.get("source_kind","unknown") for r in rows))
        domains=len(set(filter(None,(domain(r["source_url"]) for r in rows))))
        recent=sum(1 for r in rows if (now-datetime.date.fromisoformat(r["observed_at"][:10])).days<=90)
        sales=sum(bool(r.get("sale_observed")) for r in rows)
        payments=sum(bool(r.get("payment_observed")) for r in rows)
        commercial=sum(bool(r.get("commercial_intent_observed")) or r.get("evidence_scope") in {"commercial_intent","buying_intent","pricing_intent"} for r in rows)
        n=len(rows)
        if payments>0: stage="PAID_DEMAND"
        elif sales>0: stage="PAID_DEMAND"
        elif commercial>0: stage="COMMERCIAL_INTENT_EVIDENCED"
        elif n>=3 and domains>=2 and kinds>=2 and recent>=2: stage="DEMAND_EVIDENCED"
        elif n>=2: stage="REPEATED_PROBLEM"
        elif n>=1: stage="PROBLEM_SIGNAL"
        else: stage="RESEARCH_DEMAND"
        rank={"RESEARCH_DEMAND":0,"PROBLEM_SIGNAL":1,"REPEATED_PROBLEM":2,"DEMAND_EVIDENCED":3,"COMMERCIAL_INTENT_EVIDENCED":4,"PAID_DEMAND":5}[stage]
        strength=round(rank/5,2)
        out.append({"candidate_id":cid,"stage":stage,"observation_count":n,"source_kind_count":kinds,"source_domain_count":domains,"recent_observation_count":recent,"sale_observation_count":sales,"payment_observation_count":payments,"commercial_signal_count":commercial,"demand_evidence":strength,"sources":[r["source_url"] for r in rows],"semantics":"EVIDENCE_STAGE_NOT_SALES_UNLESS_EXPLICITLY_OBSERVED"})
    (ROOT/"automation"/"demand_summary.json").write_text(json.dumps({"schema":"mint.demand_summary.v2","generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"items":out},indent=2)+"\n")
if __name__=="__main__": main()
