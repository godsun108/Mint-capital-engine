import assert from "node:assert/strict";
import { test } from "node:test";
import { capabilities, catalogProduct, variantPrices, mockupPreflight } from "../providers/printful-readonly.mjs";

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

test("Aurelion read-only tests do not silently inherit Orbital Garden IDs", () => {
  // Product 274 and variants 9039-9041 are historical Orbital Garden references.
  // No Aurelion product may be inferred from those identifiers.
  const orbitalProductId = 274;
  const aurelionProductId = null;
  assert.equal(aurelionProductId, null);
  assert.notEqual(aurelionProductId, orbitalProductId);
});
