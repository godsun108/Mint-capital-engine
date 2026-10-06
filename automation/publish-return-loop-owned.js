import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const src=path.join(root,"automation","state","return-loop.json");
if(!fs.existsSync(src)) throw new Error("return-loop.json missing");
const loop=JSON.parse(fs.readFileSync(src,"utf8"));
const outRoot=path.join(root,"docs","solutions");
fs.mkdirSync(outRoot,{recursive:true});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const published=[];
for(const item of loop.items||[]){
 if(item.state!=="READY_TO_PRESENT"||!item.offer_id) continue;
 const dir=path.join(outRoot,item.offer_id);fs.mkdirSync(dir,{recursive:true});
 const p=item.presentation||{};
 const needs=(item.problem_sources||[]).map(x=>x.observed_need).filter(Boolean);
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(p.headline||item.offer_name)}</title><meta name="description" content="${esc(p.body||"")}"></head><body><main><h1>${esc(p.headline||item.offer_name)}</h1><p>${esc(p.body||"")}</p><h2>Why this exists</h2><p>We observed repeated public reports of this setup problem and built a bounded solution for it.</p><ul>${needs.slice(0,3).map(n=>`<li>${esc(n)}</li>`).join("")}</ul><p><a href="${esc(p.destination)}">View the solution</a></p><small>${esc(p.disclosure||"")}</small></main></body></html>`;
 fs.writeFileSync(path.join(dir,"index.html"),html);
 published.push({offer_id:item.offer_id,path:path.relative(root,path.join(dir,"index.html")),destination:p.destination,source_count:(item.problem_sources||[]).length,state:"OWNED_SURFACE_GENERATED"});
}
const manifest={schema:"mint.return_loop.owned_presentation.v1",generated_at:new Date().toISOString(),semantics:"OWNED_CHANNEL_PRESENTATION_ONLY",items:published};
fs.writeFileSync(path.join(root,"automation","state","return-loop-owned.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
