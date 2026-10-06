import fs from "node:fs";
import { mockupPreflight, capabilities } from "./providers/printful-readonly.mjs";
const p=await mockupPreflight(274);
const out={schema:"mint.orbital-garden.mockup-preflight.v1",observedAt:new Date().toISOString(),...p,capabilities,decision:{mockupCreationRequiredScope:"NONE_PER_PRINTFUL_DOCUMENTATION",fileHostingRequirement:"PUBLIC_URL",writeScopeExpansionRequiredForMockupTask:false,taskCreationExecuted:false,orders:false,spend:false},nextGate:"HOST_APPROVED_ARTWORK_AT_PUBLIC_URL_THEN_EXPLICITLY_AUTHORIZE_ONE MOCKUP TASK"};
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});fs.writeFileSync("connect-demo/exports/physical/orbital-garden-mockup-preflight.json",JSON.stringify(out,null,2)+"\n");
if(capabilities.orders||capabilities.spend||capabilities.productWrites) throw Error("Unsafe capability");
console.log("ORBITAL GARDEN MOCKUP PREFLIGHT PASS: zero write-scope expansion required; no mockup task created");
