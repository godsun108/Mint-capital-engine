import { validateBrandSelection } from "./printful-brand-scope.mjs";

// Pure, offline authorization decision. No credentials, network, or mutable global approval.
export function authorizeSupplierAction({ selection, approval, action }) {
  const scoped = validateBrandSelection(selection);
  if (action !== "CREATE_MOCKUP_TASK") throw Error("unsupported supplier action");
  if (!approval || typeof approval !== "object") throw Error("explicit approval required");
  if (approval.approved !== true || approval.action !== action || approval.brand !== scoped.brand ||
      approval.productId !== scoped.productId) throw Error("approval does not match requested action");
  if (!Array.isArray(approval.variantIds) ||
      approval.variantIds.length !== scoped.variantIds.length ||
      !approval.variantIds.every((v, i) => v === scoped.variantIds[i])) throw Error("approval variant mismatch");
  if (typeof approval.approvalId !== "string" || !/^[a-zA-Z0-9_-]{12,128}$/.test(approval.approvalId))
    throw Error("approval ID required");
  if (!Number.isSafeInteger(approval.expiresAtMs) || approval.expiresAtMs <= Date.now())
    throw Error("approval expired");
  // This is a policy check, NOT an authenticity or single-use proof.
  // Production submission requires an independently authenticated, durable, replay-protected approval.
  return Object.freeze({ authorizedByPolicy: true, brand: scoped.brand, productId: scoped.productId,
    action, approvalId: approval.approvalId, supplierWriteEnabled: false });
}
