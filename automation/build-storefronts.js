import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const catalog=JSON.parse(fs.readFileSync(path.join(root,"systems/commerce/catalog.json"),"utf8"));
const out=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
for(const offer of Object.values(catalog.offers||{})){
 if(!["ACTIVE","DRAFT"].includes(offer.status)) continue;
 const dir=path.join(root,"docs","store",offer.id);fs.mkdirSync(dir,{recursive:true});
 const price=(offer.price.unit_amount/100).toLocaleString("en-US",{style:"currency",currency:offer.price.currency.toUpperCase()});
 const active=offer.status==="ACTIVE";
 const buy=active?`<button id="buy">Buy ${esc(price)}</button>`:`<div class="draft">Preview — not currently for sale</div>`;
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(offer.name)} — MINT</title><meta name="description" content="${esc(offer.description)}"><style>body{font-family:system-ui;background:#07130f;color:#eefaf4;margin:0}main{max-width:760px;margin:auto;padding:64px 24px}.tag{opacity:.7}h1{font-size:clamp(2.2rem,8vw,5rem);line-height:.95}p{font-size:1.1rem;line-height:1.6}button{padding:16px 22px;font:inherit;font-weight:700;border:0;border-radius:12px;cursor:pointer}.draft{padding:16px;border:1px solid #486157;border-radius:12px}.truth{margin-top:36px;font-size:.9rem;opacity:.7}</style></head><body><main><div class="tag">MINT · ${esc(offer.type)} · ${esc(offer.status)}</div><h1>${esc(offer.acquisition?.headline||offer.name)}</h1><p>${esc(offer.description)}</p><p><strong>${esc(price)}</strong> one-time</p>${buy}<p class="truth">MINT only fulfills paid products after payment is verified. Preview products cannot be purchased.</p></main>${active?`<script>const commerce="https://mint-stripe-connect-v4-production.up.railway.app";const source="store-${esc(offer.id)}";fetch(commerce+"/api/acquisition/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"VISITED",source})}).catch(()=>{});document.getElementById("buy").onclick=async()=>{await fetch(commerce+"/api/acquisition/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"CHECKOUT_STARTED",source})}).catch(()=>{});const r=await fetch(commerce+"/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId:"${esc(offer.id)}",source})});const j=await r.json();if(j.url)location.href=j.url;else alert(j.error||"Checkout unavailable.");};</script>`:""}</body></html>`;
 fs.writeFileSync(path.join(dir,"index.html"),html);out.push({offerId:offer.id,status:offer.status,path:path.relative(root,dir)});
}
fs.writeFileSync(path.join(root,"automation/state/storefront-build.json"),JSON.stringify({schema:"mint.storefront.build.v1",generatedAt:new Date().toISOString(),semantics:"GENERATED_SURFACES_PUBLIC_ONLY_IF_HOST_DEPLOYS_DOCS",surfaces:out},null,2)+"\n");
console.log(JSON.stringify({ok:true,surfaces:out},null,2));
