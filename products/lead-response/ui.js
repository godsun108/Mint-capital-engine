import { analyzeLeads } from "./diagnostic.js";
const $=s=>document.querySelector(s);
$("#run").onclick=()=>{
 const lines=$("#data").value.trim().split(/\n/).filter(Boolean); if(!lines.length)return;
 const parsed=lines.map(parseCsvLine); if(/received/i.test(parsed[0]?.[0]||""))parsed.shift();
 const rows=parsed.map(([receivedAt,responseAt,channel,outcome])=>({receivedAt,responseAt,channel,outcome}));
 const averageJobValue=$("#value").value===""?null:Number($("#value").value),closeRate=$("#close").value===""?null:Number($("#close").value),timeZone=$("#timezone").value||"UTC";
 let x; try{x=analyzeLeads(rows,{averageJobValue,closeRate,businessHours:{start:9,end:17,timeZone}})}catch(e){return renderError(e.message)}
 const r=$("#report");r.hidden=false;
 r.innerHTML=`<h2>Diagnostic</h2><div class="grid">${card("Leads",x.total)}${card("Response rate",pct(x.responseRate))}${card("Unanswered",x.unanswered)}${card("Median response",x.medianResponseMinutes===null?"—":x.medianResponseMinutes+" min")}${card("≤ 5 minutes",pct(x.within5m))}${card("≤ 1 hour",pct(x.within1h))}${card("≤ 24 hours",pct(x.within24h))}${card("≤ 72 hours",pct(x.within72h))}</div><h3>Priority gaps</h3><pre>${esc(JSON.stringify(x.gaps,null,2))}</pre><h3>Illustrative opportunity</h3><pre>${esc(JSON.stringify(x.opportunity,null,2))}</pre>`;
};
export function parseCsvLine(line){const out=[];let cell="",quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===","&&!quoted){out.push(cell);cell=""}else cell+=ch}out.push(cell);return out;}
function renderError(message){const r=$("#report");r.hidden=false;r.innerHTML=`<h2>Input error</h2><p>${esc(message)}</p>`;}
function card(k,v){return `<article><small>${k}</small><strong>${v}</strong></article>`;} function pct(x){return Math.round(x*100)+"%";} function esc(x){return String(x).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
