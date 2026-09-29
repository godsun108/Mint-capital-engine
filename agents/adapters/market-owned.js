import fs from "node:fs";
import path from "node:path";

export function prepareOwnedCampaign({offerId,baseUrl,source="github-pages",root=process.cwd()}={}){
  if(!offerId||!baseUrl) return {ok:false,reason:"offer_or_url_missing"};
  if(!/^[a-z0-9_-]{1,48}$/.test(source)) return {ok:false,reason:"invalid_source"};
  const url=new URL(baseUrl); url.searchParams.set("src",source);
  const dir=path.join(root,"systems","acquisition","generated",offerId);
  fs.mkdirSync(dir,{recursive:true});
  const campaign={
    schema:"mint.owned.campaign.v1",offerId,source,budgetUsd:0,status:"READY_OWNED_CHANNEL",
    destination:url.toString(),
    message:{
      headline:"Skip the blank Express + TypeScript setup.",
      body:"A $9 reusable starter with strict TypeScript, Express, JSON middleware, a health route, environment example, and dev/build/start scripts.",
      cta:"View the Foundry starter"
    },
    measurement:["VISITED","CHECKOUT_STARTED","PAID","FULFILLED","PROVIDER_AVAILABLE","SETTLED"],
    prohibited:["fabricated_social_proof","fabricated_scarcity","guaranteed_results"]
  };
  const file=path.join(dir,source+".json");
  fs.writeFileSync(file,JSON.stringify(campaign,null,2)+"\n");
  return {ok:true,campaignPath:path.relative(root,file),destination:campaign.destination,status:campaign.status};
}
