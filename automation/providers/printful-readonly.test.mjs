import assert from "node:assert/strict";
import { capabilities } from "./printful-readonly.mjs";

assert.equal(capabilities.mode, "READ_ONLY_DISCOVERY");
assert.equal(capabilities.orders, false);
assert.equal(capabilities.productWrites, false);
assert.equal(capabilities.listingWrites, false);
assert.equal(capabilities.mockupWrites, false);
assert.equal(capabilities.spend, false);

console.log("PRINTFUL ADAPTER SAFETY CONTRACT PASS: discovery only; zero write/spend capabilities");
