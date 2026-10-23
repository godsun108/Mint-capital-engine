// Pure brand-scoping gate for discovery/preflight. Never derives Aurelion IDs from Orbital Garden.
const ORBITAL_PRODUCT_IDS = new Set([274]);
const ORBITAL_VARIANT_IDS = new Set([9039, 9040, 9041]);

export function validateBrandSelection(selection) {
  if (!selection || typeof selection !== "object") throw Error("brand selection required");
  const { brand, productId, variantIds = [] } = selection;
  if (brand !== "aurelion" && brand !== "orbital-garden") throw Error("unknown brand");
  if (!Number.isSafeInteger(productId) || productId <= 0) throw Error("valid productId required");
  if (!Array.isArray(variantIds) || !variantIds.every(v => Number.isSafeInteger(v) && v > 0)) throw Error("invalid variant IDs");
  if (new Set(variantIds).size !== variantIds.length) throw Error("duplicate variant IDs");
  if (brand === "aurelion" && (ORBITAL_PRODUCT_IDS.has(productId) || variantIds.some(v => ORBITAL_VARIANT_IDS.has(v)))) {
    throw Error("Orbital Garden identifiers are not approved for Aurelion");
  }
  if (brand === "orbital-garden" && productId !== 274) throw Error("Orbital Garden product must be explicitly scoped");
  return Object.freeze({brand, productId, variantIds: Object.freeze([...variantIds])});
}
