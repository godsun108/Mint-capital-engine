import fs from "node:fs";import path from "node:path";
const root=process.cwd(),catalog=JSON.parse(fs.readFileSync(path.join(root,"systems/commerce/catalog.json"),"utf8"));
const commerce="https://mint-stripe-connect-v4-production.up.railway.app";
const esc=s=>String(s).replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
for(const offer of Object.values(catalog.offers||{})){
 if(!["ACTIVE","DRAFT"].includes(offer.status))continue;
 const dir=path.join(root,"docs","offers",offer.id);fs.mkdirSync(dir,{recursive:true});
 const dollars=(offer.price.unit_amount/100).toFixed(offer.price.unit_amount%100?2:0);
 const src="github-pages-offer";
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(offer.name)} — MINT</title><meta name="description" content="${esc(offer.description)}"><style>body{margin:0;background:#07120d;color:#effff5;font:16px system-ui;display:grid;min-height:100vh;place-items:center}.c{max-width:720px;padding:32px}.k{color:#70f0aa;font-weight:800;letter-spacing:.12em}.p{font-size:clamp(38px,8vw,72px);line-height:.95;margin:.2em 0}.d{color:#bdd0c5;font-size:19px;line-height:1.55}.b{display:inline-block;margin-top:22px;background:#70f0aa;color:#07120d;padding:14px 20px;border:0;border-radius:12px;font-weight:900;cursor:pointer}.s{margin-top:16px;color:#82988c;font-size:13px}</style></head><body><main class="c"><div class="k">MINT · ${esc(offer.status)}</div><h1 class="p">${esc(offer.acquisition?.headline||offer.name)}</h1><p class="d">${esc(offer.description)}</p><button class="b" id="buy">${esc(offer.acquisition?.cta||"Get it")} · $${dollars}</button><div class="s">One-time purchase. Delivery follows verified successful payment. DRAFT offers cannot be purchased until activated.</div></main><script>
const offer=${JSON.stringify(offer.id)},status=${JSON.stringify(offer.status)},src=${JSON.stringify(src)};
fetch("${commerce}/api/acquisition/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"VISITED",source:src})}).catch(()=>{});
document.getElementById("buy").onclick=async()=>{if(status!=="ACTIVE"){alert("This product is being prepared and is not available for purchase yet.");return;}await fetch("${commerce}/api/acquisition/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"CHECKOUT_STARTED",source:src})}).catch(()=>{});const r=await fetch("${commerce}/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId:offer,source:src})});const j=await r.json();if(j.url)location.href=j.url;else alert(j.error||"Checkout is unavailable.");};
</script></body></html>`;
 fs.writeFileSync(path.join(dir,"index.html"),html);
}
console.log(JSON.stringify({ok:true,generated:Object.values(catalog.offers||{}).filter(x=>["ACTIVE","DRAFT"].includes(x.status)).map(x=>x.id)},null,2));
