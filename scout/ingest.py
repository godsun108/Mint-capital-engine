#!/usr/bin/env python3
import json, urllib.request
from pathlib import Path
from datetime import datetime, timezone

OUT=Path(__file__).parent/"data"/"candidates.json"
OUT.parent.mkdir(parents=True,exist_ok=True)

def grants():
 req=urllib.request.Request("https://api.grants.gov/v1/api/search2",data=json.dumps({"keyword":"","oppStatuses":"forecasted|posted","rows":100,"startRecordNum":0}).encode(),headers={"Content-Type":"application/json","User-Agent":"MINT-SCOUT/0.1"})
 with urllib.request.urlopen(req,timeout=30) as r: data=json.load(r)
 hits=((data.get("data") or {}).get("oppHits") or [])
 out=[]
 for x in hits:
  oid=str(x.get("id") or x.get("opportunityId") or "")
  if not oid: continue
  out.append({"id":"grants:"+oid,"kind":"GRANT","title":x.get("title") or "Untitled grant","source":"Grants.gov","url":"https://www.grants.gov/search-results-detail/"+oid,"agency":x.get("agencyName"),"number":x.get("number"),"open_date":x.get("openDate"),"close_date":x.get("closeDate"),"status":x.get("oppStatus"),"semantics":"CANDIDATE_ONLY"})
 return out

def main():
 now=datetime.now(timezone.utc).isoformat()
 items=[]
 errors=[]
 try: items+=grants()
 except Exception as e: errors.append({"source":"Grants.gov","error":str(e)})
 OUT.write_text(json.dumps({"schema":"mint.scout.candidates.v1","generated_at":now,"items":items,"errors":errors},separators=(",",":")))
if __name__=="__main__": main()
