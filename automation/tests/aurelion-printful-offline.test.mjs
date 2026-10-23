import assert from "node:assert/strict";
import { test } from "node:test";
import { capabilities, catalogProduct, variantPrices, mockupPreflight } from "../providers/printful-readonly.mjs";
import { validateBrandSelection } from "../providers/printful-brand-scope.mjs";

// Deliberately offline. This suite never uses supplier credentials.
test("Printful discovery capability remains fail-closed", () => {
  assert.deepEqual(
    [capabilities.orders, capabilities.productWrites, capabilities.listingWrites, capabilities.mockupWrites, capabilities.spend],
    [false, false, false, false, false]
  );
  assert.equal(capabilities.mode, "READ_ONLY_DISCOVERY");
});

test("catalog lookup makes GET only, even with account credentials configured", async () => {
  const priorFetch = globalThis.fetch;
  const priorToken = process.env.PRINTFUL_TOKEN;
  const priorStore = process.env.PRINTFUL_STORE_ID;
  const calls = [];
  try {
    process.env.PRINTFUL_TOKEN = "offline-test-token";
    process.env.PRINTFUL_STORE_ID = "offline-test-store";
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), method: init.method ?? "GET", headers: init.headers });
      return { ok: true, json: async () => ({ result: { variants: [{ id: 42, price: "19.50", currency: "USD" }] } }) };
    };
    const prices = await variantPrices(274);
    assert.equal(prices[0].price, "19.50");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
    assert.match(calls[0].url, /\/products\/274$/);
    assert.equal(calls[0].headers["X-PF-Store-Id"], "offline-test-store");
  } finally {
    globalThis.fetch = priorFetch;
    if (priorToken === undefined) delete process.env.PRINTFUL_TOKEN; else process.env.PRINTFUL_TOKEN = priorToken;
    if (priorStore === undefined) delete process.env.PRINTFUL_STORE_ID; else process.env.PRINTFUL_STORE_ID = priorStore;
  }
});

test("mockup preflight only GETs and never submits tasks", async () => {
  const prior = globalThis.fetch;
  const methods = [];
  try {
    globalThis.fetch = async (_url, init = {}) => {
      methods.push(init.method ?? "GET");
      return { ok: true, json: async () => ({ result: [] }) };
    };
    const result = await mockupPreflight(274);
    assert.equal(result.createExecuted, false);
    assert.deepEqual(methods, ["GET", "GET"]);
  } finally { globalThis.fetch = prior; }
});

test("rejects nonnumeric catalog product IDs before any network call", async () => {
  const prior = globalThis.fetch;
  let called = false;
  try {
    globalThis.fetch = async () => { called = true; throw Error("Unexpected network"); };
    await assert.rejects(catalogProduct("invalid"));
    assert.equal(called, false);
  } finally { globalThis.fetch = prior; }
});

test("Aurelion rejects Orbital Garden product and variant identifiers", () => {
  assert.throws(() => validateBrandSelection({brand:"aurelion",productId:274,variantIds:[]}), /Orbital Garden/);
  assert.throws(() => validateBrandSelection({brand:"aurelion",productId:999,variantIds:[9039]}), /Orbital Garden/);
  assert.throws(() => validateBrandSelection({brand:"aurelion",productId:999,variantIds:[9041]}), /Orbital Garden/);
});

test("brand scope rejects unknown brands, missing IDs, and duplicates", () => {
  assert.throws(() => validateBrandSelection({brand:"unknown",productId:999}), /unknown brand/);
  assert.throws(() => validateBrandSelection({brand:"aurelion",productId:null}), /valid productId/);
  assert.throws(() => validateBrandSelection({brand:"aurelion",productId:999,variantIds:[10,10]}), /duplicate/);
  assert.throws(() => validateBrandSelection({brand:"orbital-garden",productId:999}), /explicitly scoped/);
});

test("distinct Aurelion selection is accepted without supplier contact", () => {
  const selection = validateBrandSelection({brand:"aurelion",productId:999,variantIds:[1001,1002]});
  assert.equal(selection.brand,"aurelion");
  assert.deepEqual(selection.variantIds,[1001,1002]);
  assert.equal(Object.isFrozen(selection),true);
});

test("brand discovery rejects Orbital identifiers before any supplier call", async () => {
  const { discoverBrandProduct } = await import("../providers/printful-brand-discovery.mjs");
  const previous = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; throw Error("unexpected supplier call"); };
    await assert.rejects(discoverBrandProduct({brand:"aurelion",productId:274,variantIds:[9039]}), /Orbital Garden/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = previous; }
});

test("scoped Aurelion discovery uses GET only and rejects unknown variants", async () => {
  const { discoverBrandProduct } = await import("../providers/printful-brand-discovery.mjs");
  const previous = globalThis.fetch;
  const methods = [];
  try {
    globalThis.fetch = async (_url, init={}) => {
      methods.push(init.method ?? "GET");
      return {ok:true,json:async()=>({result:{variants:[{id:1001,price:"18.00"}]}})};
    };
    const result = await discoverBrandProduct({brand:"aurelion",productId:999,variantIds:[1001]});
    assert.equal(result.writeAuthorized,false);
    assert.equal(result.brand,"aurelion");
    assert.deepEqual(methods,["GET","GET"]);
    await assert.rejects(discoverBrandProduct({brand:"aurelion",productId:999,variantIds:[2002]}), /missing from catalog/);
    assert.deepEqual(methods,["GET","GET","GET","GET"]);
  } finally { globalThis.fetch = previous; }
});

test("supplier write policy fails closed without exact, unexpired approval", async () => {
  const { authorizeSupplierAction } = await import("../providers/printful-action-policy.mjs");
  const selection = {brand:"aurelion",productId:999,variantIds:[1001]};
  const approval = {approved:true,action:"CREATE_MOCKUP_TASK",brand:"aurelion",productId:999,
    variantIds:[1001],approvalId:"approval_test_123456",expiresAtMs:Date.now()+60000};
  assert.throws(() => authorizeSupplierAction({selection,action:"CREATE_MOCKUP_TASK"}), /explicit approval/);
  assert.throws(() => authorizeSupplierAction({selection,approval:{...approval,brand:"orbital-garden"},action:"CREATE_MOCKUP_TASK"}), /does not match/);
  assert.throws(() => authorizeSupplierAction({selection,approval:{...approval,variantIds:[1002]},action:"CREATE_MOCKUP_TASK"}), /variant mismatch/);
  assert.throws(() => authorizeSupplierAction({selection,approval:{...approval,expiresAtMs:Date.now()-1},action:"CREATE_MOCKUP_TASK"}), /expired/);
  assert.throws(() => authorizeSupplierAction({selection,approval,action:"CREATE_ORDER"}), /unsupported/);
  const decision = authorizeSupplierAction({selection,approval,action:"CREATE_MOCKUP_TASK"});
  assert.equal(decision.authorizedByPolicy,true);
  assert.equal(decision.supplierWriteEnabled,false);
});

test("signed approvals verify exact scope and reject tampering", async () => {
  const {verifySignedApproval,signOfflineTestApproval} = await import("../providers/printful-signed-approval.mjs");
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    const testKey = "offline-fixture-key-at-least-32-characters";
    const selection = {brand:"aurelion",productId:999,variantIds:[1001]};
    const action = "CREATE_MOCKUP_TASK";
    const approval = {approved:true,action,brand:"aurelion",productId:999,variantIds:[1001],
      approvalId:"offline_test_approval_123",expiresAtMs:Date.now()+60000};
    const signature = signOfflineTestApproval({selection,approval,action,testKey});
    const verified = verifySignedApproval({selection,approval,action,signature,verificationKey:testKey});
    assert.equal(verified.signatureVerified,true);
    assert.equal(verified.replayVerified,false);
    assert.equal(verified.supplierWriteEnabled,false);
    assert.throws(()=>verifySignedApproval({selection,approval:{...approval,approvalId:"tampered_approval_123"},action,signature,verificationKey:testKey}),/signature invalid/);
    assert.throws(()=>verifySignedApproval({selection,approval,action,signature,verificationKey:"wrong-key-that-is-long-enough-12345"}),/signature invalid/);
    assert.throws(()=>verifySignedApproval({selection,approval,action,signature:"invalid",verificationKey:testKey}),/valid signature/);
  } finally {
    if(oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=oldEnv;
  }
});
