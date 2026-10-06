import fs from "node:fs";
const cfg={
 schema:"mint.orbital-garden.mockup-request.v1",
 status:"PINNED_ART_VALIDATED_NOT_SUBMITTED",
 endpoint:"POST /v2/mockup-tasks",
 artwork:{requiredFormat:"PNG_OR_JPEG",maxBytes:52428800,publicUrlRequired:true,immutablePreferred:true,sha256:"6743eb6621ecfdce3fd3bcb2547e65feb9eec363dbe69e8c7da4b08b803bc10d",sourceCommit:"04479b1"},
 payload:{
  format:"jpg",mockup_width_px:1000,
  products:[{source:"catalog",mockup_style_ids:[16394],catalog_product_id:274,catalog_variant_ids:[9039],options:[{name:"stitch_color",value:"black"}],placements:[{placement:"default",technique:"cut-sew",print_area_type:"simple",layers:[{type:"file",url:"https://raw.githubusercontent.com/godsun108/Mint-capital-engine/04479b1/connect-demo/public/printful/orbital-garden-main-3150x5550.png"}]}]}]
 },
 guards:{publicArtUrlRequired:true,printfulTemporaryMockupsMustBePreserved:true,productId:274,allowedVariantIds:[9039,9040,9041],allowedStyleIds:[16394,16396],allowedPlacements:["default","pocket"],requiredOptions:{stitch_color:"black"},orders:false,spend:false,submitted:false}
};
const p=cfg.payload.products[0];
if(p.catalog_product_id!==274||p.catalog_variant_ids.some(x=>!cfg.guards.allowedVariantIds.includes(x)))throw Error("catalog guard");
if(!p.options?.some(o=>o.name==="stitch_color"&&o.value==="black"))throw Error("required stitch_color guard");
if(p.mockup_style_ids.some(x=>!cfg.guards.allowedStyleIds.includes(x)))throw Error("style guard");
if(!p.placements.every(x=>cfg.guards.allowedPlacements.includes(x.placement)&&x.technique==="cut-sew"))throw Error("placement guard");
if(p.placements.some(x=>!x.layers?.every(l=>l.type==="file"&&l.url==="https://raw.githubusercontent.com/godsun108/Mint-capital-engine/04479b1/connect-demo/public/printful/orbital-garden-main-3150x5550.png")))throw Error("art URL guard");
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});
fs.writeFileSync("connect-demo/exports/physical/orbital-garden-mockup-request.json",JSON.stringify(cfg,null,2)+"\n");
console.log("ORBITAL GARDEN MOCKUP REQUEST CONTRACT PASS: exact IDs constrained; request NOT submitted");
