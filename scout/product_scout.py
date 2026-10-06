#!/usr/bin/env python3
import json, urllib.parse, urllib.request
from pathlib import Path
from datetime import datetime, timezone
OUT=Path(__file__).resolve().parents[1]/"automation"/"product-scout-observations.json"
QUERIES=[
("express-typescript","express typescript boilerplate starter"),
("express-auth","express typescript authentication middleware"),
("venture-economics","unit economics experiment tracker product validation"),
("procedural-assets","procedural svg generator website generator browser game generator"),
("software-release-contract","software release checklist runtime verification deployment"),
("offer-scoring","affiliate offer scoring audience fit trust risk"),
("evidence-packets","evidence packet provenance claims sources research"),
("digital-goods","digital goods catalog rights licensing download"),
("research-workflow","research evidence provenance workflow citations"),
("cookbook-export","recipe cookbook pdf export printable"),
("browser-arcade","browser game starter persistent state arcade"),
("earth-data","earth event data archive api earthquakes wildfires"),
("camera-discovery","public webcam camera discovery api geolocation"),
("forecasting","probabilistic forecasting scoring calibration tool"),
("goal-os","goal planner milestones quests daily review"),
("editorial-evidence","editorial workflow evidence citations disclosure"),
("subscription-service","subscription research digest membership service")
]
UA="MINT-Product-SCOUT/0.3"
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/vnd.github+json"})
 with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
def issues(q):
 url="https://api.github.com/search/issues?q="+urllib.parse.quote(q+" is:issue")+"&sort=updated&order=desc&per_page=20"
 out=[]
 for x in fetch(url).get("items",[]):
  if x.get("html_url"):out.append({"kind":"public_problem_observation","source":"github-issues","url":x["html_url"],"observedAt":datetime.now(timezone.utc).isoformat(),"sourceVerified":True,"demandVerified":False,"title":x.get("title","")[:240]})
 return out
def main():
 now=datetime.now(timezone.utc).isoformat();groups=[];errors=[]
 for topic,q in QUERIES:
  try:obs=issues(q)
  except Exception as e:errors.append({"topic":topic,"source":"github-issues","error":str(e)});obs=[]
  groups.append({"topic":topic,"query":q,"observations":obs})
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps({"schema":"mint.product.scout.observations.v2","generatedAt":now,"semantics":"PUBLIC_SOURCE_OBSERVATIONS_NOT_VERIFIED_DEMAND","groups":groups,"errors":errors},indent=2)+"\n")
if __name__=="__main__":main()
