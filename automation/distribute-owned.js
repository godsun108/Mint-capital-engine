import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const motionPath=path.join(root,"automation","state","market-motion.json");
const motion=fs.existsSync(motionPath)?JSON.parse(fs.readFileSync(motionPath,"utf8")):{results:[]};
const docs=path.join(root,"docs","market");
fs.mkdirSync(docs,{recursive:true});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const published=[];
for(const r of motion.results||[]){
 if(!r.ok||!r.offerId||!r.destination||!r.campaignPath) continue;
 const source=r.campaignPath.split("/").pop()?.replace(/\.json$/,"")||"owned";
 const dir=path.join(docs,r.offerId,source);fs.mkdirSync(dir,{recursive:true});
 const campaign=JSON.parse(fs.readFileSync(path.join(root,r.campaignPath),"utf8"));
 const m=campaign.message||{};
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(m.headline||r.offerId)} | MINT</title><meta name="description" content="${esc(m.body||"MINT digital product")}"><style>*{box-sizing:border-box}body{margin:0;background:#07110d;color:#f3fff8;font-family:Inter,system-ui,-apple-system,sans-serif}.w{width:min(880px,calc(100% - 40px));margin:auto;padding:28px 0 80px}.brand{font-weight:900;letter-spacing:.16em;color:#7df2b0}.hero{padding:80px 0}h1{font-size:clamp(42px,8vw,76px);line-height:1;letter-spacing:-.05em;margin:16px 0 24px}p{font-size:19px;line-height:1.6;color:#b8cec2;max-width:720px}.cta{display:inline-block;margin-top:22px;padding:16px 22px;border-radius:14px;background:#7df2b0;color:#04110a;text-decoration:none;font-weight:900}.fine{font-size:12px;color:#799184;margin-top:28px}</style></head><body><main class="w"><div class="brand">MINT</div><section class="hero"><h1>${esc(m.headline||r.offerId)}</h1><p>${esc(m.body||"")}</p><a class="cta" href="${esc(campaign.destination)}">${esc(m.cta||"View offer")} →</a><div class="fine">Zero-spend owned MINT acquisition surface. No guaranteed results, artificial scarcity, or invented social proof.</div></section></main><script>
const endpoint="https://mint-stripe-connect-v4-production.up.railway.app/api/acquisition/event";
const raw=(new URLSearchParams(location.search).get("src")||${JSON.stringify(source)}).toLowerCase();
const src=/^[a-z0-9_-]{1,48}$/.test(raw)?raw:${JSON.stringify(source)};
fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"VISITED",source:src})}).catch(()=>{});
</script></body></html>`;
 fs.writeFileSync(path.join(dir,"index.html"),html);
 published.push({offerId:r.offerId,source,path:path.relative(root,path.join(dir,"index.html")),destination:campaign.destination});
}
fs.writeFileSync(path.join(root,"automation","state","distribution.json"),JSON.stringify({schema:"mint.distribution.state.v1",generatedAt:new Date().toISOString(),semantics:"GENERATED_OWNED_SURFACES_PUBLIC_ONLY_IF_HOST_DEPLOYS_DOCS",published},null,2)+"\n");
console.log(JSON.stringify({ok:true,published},null,2));
