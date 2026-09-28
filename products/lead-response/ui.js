import { analyzeLeads } from "./diagnostic.js";
const $=s=>document.querySelector(s);
$("#run").onclick=()=>{
 const lines=$("#data").value.trim().split(/\n/).filter(Boolean); if(!lines.length)return;
 if(/received/i.test(lines[0]))lines.shift();
 const rows=lines.map(line=>{const [receivedAt,responseAt,channel,outcome]=line.split(",");return {receivedAt,responseAt,channel,outcome};});
 const averageJobValue=$("#value").value===""?null:Number($("#value").value),closeRate=$("#close").value===""?null:Number($("#close").value);
 const x=analyzeLeads(rows,{averageJobValue,closeRate}),r=$("#report");r.hidden=false;
 r.innerHTML=`<h2>Diagnostic</h2><div class="grid">${card("Leads",x.total)}${card("Response rate",pct(x.responseRate))}${card("Unanswered",x.unanswered)}${card("Median response",x.medianResponseMinutes===null?"—":x.medianResponseMinutes+" min")}${card("≤ 5 minutes",pct(x.within5m))}${card("≤ 1 hour",pct(x.within1h))}</div><h3>Priority gaps</h3><pre>${esc(JSON.stringify(x.gaps,null,2))}</pre><h3>Opportunity</h3><pre>${esc(JSON.stringify(x.opportunity,null,2))}</pre>`;
};
function card(k,v){return `<article><small>${k}</small><strong>${v}</strong></article>`;} function pct(x){return Math.round(x*100)+"%";} function esc(x){return x.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
