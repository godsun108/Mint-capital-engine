import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const out=path.join(root,"docs","foundry");
fs.mkdirSync(out,{recursive:true});
const destination="https://mint-stripe-connect-v4-production.up.railway.app/?src=github-pages";
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Express + TypeScript Starter | Foundry</title><meta name="description" content="A $9 reusable Express + TypeScript starter with strict TypeScript, health route, environment example, and dev/build/start scripts."><meta name="robots" content="index,follow"></head><body><main><h1>Skip the blank Express + TypeScript setup.</h1><p>A reusable $9 starter with strict TypeScript, Express, JSON middleware, a health route, environment example, and development/build/start scripts.</p><p><a href="${destination}">View the Foundry starter</a></p><p>No guaranteed results or sales claims.</p></main></body></html>`;
fs.writeFileSync(path.join(out,"index.html"),html);
fs.writeFileSync(path.join(root,"systems","acquisition","state.json"),JSON.stringify({schema:"mint.acquisition.state.v1",offerId:"foundry-express-ts-001",source:"github-pages",budgetUsd:0,destination,status:"READY_TO_PUBLISH",updatedAt:new Date().toISOString()},null,2)+"\n");
console.log(JSON.stringify({ok:true,path:"docs/foundry/index.html",destination},null,2));
