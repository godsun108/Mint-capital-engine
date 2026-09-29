#!/usr/bin/env python3
import json, re
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
OBS=ROOT/"automation"/"product-scout-observations.json"
OUT=ROOT/"automation"/"product-scout-synthesis.json"

STOP={"the","a","an","and","or","to","for","of","in","on","with","is","are","how","using","use","from","my","your"}
def tokens(s):
 return {x for x in re.findall(r"[a-z0-9+#.-]+",str(s).lower()) if len(x)>2 and x not in STOP}
def similarity(a,b):
 a,b=tokens(a),tokens(b)
 return len(a&b)/max(1,len(a|b))
def main():
 now=datetime.now(timezone.utc).isoformat()
 data=json.loads(OBS.read_text()) if OBS.exists() else {"groups":[]}
 clusters=[]
 for g in data.get("groups",[]):
  obs=[o for o in g.get("observations",[]) if o.get("verified") is True and o.get("url")]
  unique={o["url"]:o for o in obs}
  obs=list(unique.values())
  pairs=[]
  for i,a in enumerate(obs):
   for b in obs[i+1:]:
    score=similarity(a.get("title",""),b.get("title",""))
    if score>=0.18:pairs.append({"a":a["url"],"b":b["url"],"similarity":round(score,3)})
  clusters.append({"topic":g.get("topic"),"observationCount":len(obs),"distinctSources":len(unique),"relatedPairs":pairs,
    "promotionEligible":len(unique)>=2 and len(pairs)>0,
    "semantics":"SYNTHESIS_ONLY_RESEARCH_MUST_CHALLENGE"})
 OUT.write_text(json.dumps({"schema":"mint.product.scout.synthesis.v1","generatedAt":now,"clusters":clusters},indent=2)+"\n")
if __name__=="__main__":main()
