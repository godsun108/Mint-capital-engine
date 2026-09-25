#!/usr/bin/env python3
"""MINT liquidity orchestrator: rank executable work without pretending work occurred."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REG=ROOT/"systems"/"registry.json"
OUT=ROOT/"systems"/"work_queue.json"
def priority(x):
    net=max(0,float(x.get("gross",0))-float(x.get("cost",0)))
    p=max(0,min(1,float(x.get("probability",0))))
    days=max(0,float(x.get("days_to_cash",30)))
    mins=max(0,float(x.get("human_minutes",60)))
    upfront=max(0,float(x.get("upfront_cash",0)))
    return round((math.log10(net*p+1)*25)+(30/(30+days)*25)+(120/(120+mins)*20)+(500/(500+upfront)*15),2)
def main():
    src=ROOT/"systems"/"opportunities.json"
    data=json.loads(src.read_text()) if src.exists() else {"items":[]}
    q=[]
    for x in data.get("items",[]):
        if x.get("status","OPEN") not in ("SETTLED","CLOSED","REJECTED"):
            y=dict(x);y["priority"]=priority(x);q.append(y)
    q.sort(key=lambda z:z["priority"],reverse=True)
    OUT.write_text(json.dumps({"schema":"mint.work_queue.v1","items":q},indent=2))
if __name__=="__main__":main()
