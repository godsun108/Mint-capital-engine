#!/usr/bin/env python3
import json, urllib.parse, urllib.request
from pathlib import Path
from datetime import datetime, timezone
OUT=Path(__file__).resolve().parents[1]/"automation"/"product-scout-observations.json"
QUERIES=[("express-typescript","express typescript boilerplate starter"),("express-auth","express typescript authentication middleware")]
UA="MINT-Product-SCOUT/0.1"
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/vnd.github+json"})
 with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
def issues(q):
 url="https://api.github.com/search/issues?q="+urllib.parse.quote(q+" is:issue")+"&sort=updated&order=desc&per_page=20"
 out=[]
 for x in fetch(url).get("items",[]):
  if x.get("html_url"):out.append({"kind":"public_problem_observation","source":"github-issues","url":x["html_url"],"observedAt":datetime.now(timezone.utc).isoformat(),"verified":True,"title":x.get("title","")[:240]})
 return out
def main():
 now=datetime.now(timezone.utc).isoformat();groups=[];errors=[]
 for topic,q in QUERIES:
  try:obs=issues(q)
  except Exception as e:errors.append({"topic":topic,"source":"github-issues","error":str(e)});obs=[]
  groups.append({"topic":topic,"query":q,"observations":obs})
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps({"schema":"mint.product.scout.observations.v1","generatedAt":now,"semantics":"PUBLIC_OBSERVATIONS_NOT_VERIFIED_DEMAND","groups":groups,"errors":errors},indent=2)+"\n")
if __name__=="__main__":main()
