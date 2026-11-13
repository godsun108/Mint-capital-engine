import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareAurelionPrintifyDraft } from "../providers/aurelion-printify-offline.mjs";
const good = {title:"AURELION Origin Tee",description:"Original artwork on a heavyweight tee.",artworkSha256:"a".repeat(64),retailPriceUsd:49,selectedVariantIds:[12345]};
test("builds offline-only review draft with non-profit spread",()=>{
 const draft=prepareAurelionPrintifyDraft(good);
 assert.equal(draft.kind,"OFFLINE_REVIEW_DRAFT");
 assert.equal(draft.indicativeCostFloorUsd,32.94);
 assert.equal(draft.indicativePreFeeSpreadUsd,16.06);
 assert.equal(draft.supplierWritesEnabled,false);
 assert.equal(draft.publishingEnabled,false);
 assert.equal(draft.orderCreationEnabled,false);
});
test("rejects publication requests",()=>assert.throws(()=>prepareAurelionPrintifyDraft({...good,approvedForPublishing:true}),/not supported/));
test("rejects missing artwork proof and malformed variants",()=>{
 assert.throws(()=>prepareAurelionPrintifyDraft({...good,artworkSha256:"none"}),/SHA-256/);
 assert.throws(()=>prepareAurelionPrintifyDraft({...good,selectedVariantIds:[2,2]}),/variants/);
});
test("rejects invalid price and unknown shipping",()=>{
 assert.throws(()=>prepareAurelionPrintifyDraft({...good,retailPriceUsd:NaN}),/price/);
 assert.throws(()=>prepareAurelionPrintifyDraft({...good,shippingMode:"overnight"}),/shipping/);
});
