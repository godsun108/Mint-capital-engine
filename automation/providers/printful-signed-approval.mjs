import { createHmac, timingSafeEqual } from "node:crypto";
import { authorizeSupplierAction } from "./printful-action-policy.mjs";

// Authenticates a canonical approval envelope. Does not grant permission to submit.
// Approval issuance, trusted key custody and durable single-use replay claims are separate gates.
function canonical(selection, approval, action) {
  return JSON.stringify([
    "mint.printful.approval.v1", action, selection.brand, selection.productId,
    selection.variantIds, approval.approvalId, approval.expiresAtMs
  ]);
}
export function verifySignedApproval({selection, approval, action, signature, verificationKey}) {
  const decision = authorizeSupplierAction({selection, approval, action});
  if (typeof verificationKey !== "string" || verificationKey.length < 32)
    throw Error("trusted verification key required");
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature))
    throw Error("valid signature required");
  const expected = createHmac("sha256", verificationKey)
    .update(canonical(selection, approval, action)).digest();
  const provided = Buffer.from(signature, "hex");
  if (!timingSafeEqual(expected, provided)) throw Error("approval signature invalid");
  return Object.freeze({...decision, signatureVerified:true, replayVerified:false, supplierWriteEnabled:false});
}

// Test-only issuer helper; do not use to issue real approvals in production.
export function signOfflineTestApproval({selection, approval, action, testKey}) {
  if (process.env.NODE_ENV !== "test" || typeof testKey !== "string" || testKey.length < 32)
    throw Error("test-only signer disabled");
  return createHmac("sha256", testKey).update(canonical(selection, approval, action)).digest("hex");
}
