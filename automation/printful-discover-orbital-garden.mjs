import fs from "node:fs";
import { catalogProducts, catalogProduct, layoutTemplates, printFiles, capabilities } from "./providers/printful-readonly.mjs";

const needle = (process.argv[2] || "Westford Mill W101").toLowerCase();
let offset = 0, matches = [];
for (let page = 0; page < 20 && !matches.length; page++) {
  const data = await catalogProducts({ limit: 100, offset });
  const items = data?.result || [];
  matches = items.filter(x => [x?.model, x?.title, x?.brand].filter(Boolean).join(" ").toLowerCase().includes(needle));
  if (items.length < 100) break;
  offset += 100;
}
if (!matches.length) throw new Error(`No Printful catalog product matched: ${needle}`);

const out = { schema:"mint.printful.discovery.v1", observedAt:new Date().toISOString(), capabilities, query:needle, matches:[] };
for (const m of matches) {
  const id = Number(m.id);
  const detail = await catalogProduct(id);
  const techniques = [...new Set((detail?.result?.variants || []).flatMap(v => v?.techniques || []).map(t => typeof t === "string" ? t : t?.key).filter(Boolean))];
  const evidence = { id, title:m.title || m.model, techniques, layouts:{}, printfiles:{} };
  for (const technique of techniques.length ? techniques : [null]) {
    const key = technique || "default";
    try { evidence.layouts[key] = await layoutTemplates(id, technique); } catch (e) { evidence.layouts[key] = { error:e.message }; }
    try { evidence.printfiles[key] = await printFiles(id, technique); } catch (e) { evidence.printfiles[key] = { error:e.message }; }
  }
  out.matches.push(evidence);
}
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});
fs.writeFileSync("connect-demo/exports/physical/orbital-garden-printful-discovery.json",JSON.stringify(out,null,2)+"\n");
console.log(`PRINTFUL DISCOVERY COMPLETE: ${out.matches.length} catalog match(es); no writes/orders/spend`);
