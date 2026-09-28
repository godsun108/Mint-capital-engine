const WINDOWS=[5,60,1440,4320];
export function analyzeLeads(rows,{averageJobValue=null,closeRate=null,businessHours={start:9,end:17,timeZone:"UTC"}}={}){
 const leads=(rows||[]).map(normalizeLead).filter(Boolean);
 const responded=leads.filter(x=>x.responseMinutes!==null);
 const within={}; for(const w of WINDOWS)within[w]=rate(leads.filter(x=>x.responseMinutes!==null&&x.responseMinutes<=w).length,leads.length);
 const unanswered=leads.filter(x=>x.responseMinutes===null);
 const afterHours=leads.filter(x=>!isBusinessHours(x.receivedAt,businessHours));
 const business=leads.filter(x=>isBusinessHours(x.receivedAt,businessHours));
 const opportunity=estimateOpportunity({unanswered:unanswered.length,averageJobValue,closeRate});
 return {
  total:leads.length,responded:responded.length,unanswered:unanswered.length,responseRate:rate(responded.length,leads.length),
  within5m:within[5],within1h:within[60],within24h:within[1440],within72h:within[4320],
  medianResponseMinutes:median(responded.map(x=>x.responseMinutes)),
  businessHours:{count:business.length,responseRate:segmentRate(business)},
  afterHours:{count:afterHours.length,responseRate:segmentRate(afterHours)},
  opportunity,
  gaps:prioritizeGaps({leads,unanswered,within,business,afterHours})
 };
}
function normalizeLead(x){
 const receivedAt=parseDate(x.receivedAt||x.received_at); if(!receivedAt)return null;
 const responseAt=parseDate(x.responseAt||x.response_at);
 if(responseAt&&responseAt<receivedAt)return null;\n const responseMinutes=responseAt?(responseAt-receivedAt)/60000:null;
 return {receivedAt,responseAt,responseMinutes,channel:x.channel||"unknown",outcome:x.outcome||null};
}
function parseDate(x){if(!x)return null;const d=new Date(x);return Number.isNaN(d.getTime())?null:d;}
function rate(n,d){return d?Number((n/d).toFixed(4)):0;}
function median(a){if(!a.length)return null;const x=[...a].sort((a,b)=>a-b),m=Math.floor(x.length/2);return Number((x.length%2?x[m]:(x[m-1]+x[m])/2).toFixed(2));}
function isBusinessHours(d,{start,end,timeZone="UTC"}){\n const parts=new Intl.DateTimeFormat("en-US",{timeZone,weekday:"short",hour:"2-digit",hourCycle:"h23"}).formatToParts(d);\n const day=parts.find(x=>x.type==="weekday")?.value,hour=Number(parts.find(x=>x.type==="hour")?.value);\n return !["Sat","Sun"].includes(day)&&hour>=start&&hour<end;\n}
function segmentRate(rows){return rate(rows.filter(x=>x.responseMinutes!==null).length,rows.length);}
function estimateOpportunity({unanswered,averageJobValue,closeRate}){
 if(!Number.isFinite(averageJobValue)||!Number.isFinite(closeRate))return {status:"NOT_ESTIMATED",reason:"business inputs required"};
 const bounded=Math.min(1,Math.max(0,closeRate)); return {status:"ASSUMPTION_BASED",unanswered,averageJobValue,closeRate:bounded,estimatedGrossOpportunity:Number((unanswered*averageJobValue*bounded).toFixed(2)),warning:"Not revenue. Uses business-provided assumptions and does not prove recoverability."};
}
function prioritizeGaps({unanswered,within,business,afterHours}){
 const gaps=[]; if(unanswered.length)gaps.push({priority:1,type:"UNANSWERED",count:unanswered.length});
 if(within[60]<.8)gaps.push({priority:2,type:"SLOW_FIRST_RESPONSE",within1h:within[60]});
 if(afterHours.length&&segmentRate(afterHours)<segmentRate(business))gaps.push({priority:3,type:"AFTER_HOURS_GAP",afterHoursResponseRate:segmentRate(afterHours),businessHoursResponseRate:segmentRate(business)});
 return gaps;
}
