import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const motionPath=path.join(root,"automation","state","market-motion.json");
const motion=fs.existsSync(motionPath)?JSON.parse(fs.readFileSync(motionPath,"utf8")):{results:[]};
const docs=path.join(root,"docs","market");
fs.mkdirSync(docs,{recursive:true});
const published=[];
for(const r of motion.results||[]){
 if(!r.ok||!r.offerId||!r.destination) continue;
 const source=(r.campaignPath||"").split("/").pop()?.replace(/\.json$/,"")||"owned";
 const dir=path.join(docs,r.offerId,source);fs.mkdirSync(dir,{recursive:true});
 const campaign=JSON.parse(fs.readFileSync(path.join(root,r.campaignPath),"utf8"));
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(campaign.message.headline)} | MINT</title><meta name="description" content="${esc(campaign.message.body)}"></head><body><main><h1>${esc(campaign.message.headline)}</h1><p>${esc(campaign.message.body)}</p><p><a href="${esc(campaign.destination)}">${esc(campaign.message.cta)}</a></p><small>Zero-spend owned MINT acquisition surface. No guaranteed results.</small></main></body></html>`;
 fs.writeFileSync(path.join(dir,"index.html"),html);
 published.push({offerId:r.offerId,source,path:path.relative(root,path.join(dir,"index.html")),destination:campaign.destination});
}
fs.writeFileSync(path.join(root,"automation","state","distribution.json"),JSON.stringify({schema:"mint.distribution.state.v1",generatedAt:new Date().toISOString(),semantics:"GENERATED_OWNED_SURFACES_PUBLIC_ONLY_IF_HOST_DEPLOYS_DOCS",published},null,2)+"\n");
console.log(JSON.stringify({ok:true,published},null,2));
