import fs from "node:fs";
const cfg={
 schema:"mint.orbital-garden.mockup-request.v1",
 status:"VALIDATED_NOT_SUBMITTED",
 endpoint:"POST /v2/mockup-tasks",
 artwork:{requiredFormat:"PNG_OR_JPEG",maxBytes:52428800,publicUrlRequired:true,immutablePreferred:true},
 payload:{
  format:"jpg",mockup_width_px:1000,
  products:[{source:"catalog",mockup_style_ids:[16394],catalog_product_id:274,catalog_variant_ids:[9039],placements:[{placement:"default",technique:"cut-sew",print_area_type:"simple",layers:[{type:"file",url:"__PUBLIC_MAIN_ART_URL__"}]}]}]
 },
 guards:{publicArtUrlRequired:true,printfulTemporaryMockupsMustBePreserved:true,productId:274,allowedVariantIds:[9039,9040,9041],allowedStyleIds:[16394,16396],allowedPlacements:["default","pocket"],orders:false,spend:false,submitted:false}
};
const p=cfg.payload.products[0];
if(p.catalog_product_id!==274||p.catalog_variant_ids.some(x=>!cfg.guards.allowedVariantIds.includes(x)))throw Error("catalog guard");
if(p.mockup_style_ids.some(x=>!cfg.guards.allowedStyleIds.includes(x)))throw Error("style guard");
if(!p.placements.every(x=>cfg.guards.allowedPlacements.includes(x.placement)&&x.technique==="cut-sew"))throw Error("placement guard");
if(p.placements.some(x=>!x.layers?.every(l=>l.type==="file"&&l.url==="__PUBLIC_MAIN_ART_URL__")))throw Error("art URL guard");
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});
fs.writeFileSync("connect-demo/exports/physical/orbital-garden-mockup-request.json",JSON.stringify(cfg,null,2)+"\n");
console.log("ORBITAL GARDEN MOCKUP REQUEST CONTRACT PASS: exact IDs constrained; request NOT submitted");
