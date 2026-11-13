// AURELION Printify preparation only. No API requests, product creation, or publishing.
// Source data is a user-supplied catalog observation, not a verified live quotation.
export const AURELION_PRINTIFY_CANDIDATE = Object.freeze({
  brand: "AURELION",
  storefront: "shopaurelion.printify.me",
  blank: "Stanley/Stella Unisex Freestyler Heavyweight Tee",
  sku: "SXU018",
  materialClaim: "100% organic cotton (supplier listing; verify variant)",
  gsm: 240,
  provider: "Fulfill Engine",
  observedBasePriceUsd: 28.45,
  observedEconomyShippingUsd: 4.49,
  observedStandardShippingUsd: 5.39,
  observedProductionDays: 4,
  observedAt: "2026-10-23",
});
function dollars(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
export function prepareAurelionPrintifyDraft({
  title, description, artworkSha256, retailPriceUsd, shippingMode = "economy",
  selectedVariantIds = [], approvedForPublishing = false,
} = {}) {
  if (approvedForPublishing !== false) throw Error("publishing authorization is not supported");
  if (typeof title !== "string" || !title.trim() || title.length > 140) throw Error("invalid title");
  if (typeof description !== "string" || !description.trim()) throw Error("invalid description");
  if (typeof artworkSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(artworkSha256)) throw Error("artwork SHA-256 required");
  if (!Number.isFinite(retailPriceUsd) || retailPriceUsd <= 0) throw Error("invalid retail price");
  if (!["economy", "standard"].includes(shippingMode)) throw Error("invalid shipping mode");
  if (!Array.isArray(selectedVariantIds) || selectedVariantIds.some(v => !Number.isSafeInteger(v) || v <= 0) || new Set(selectedVariantIds).size !== selectedVariantIds.length) throw Error("invalid variants");
  const shipping = shippingMode === "economy" ? AURELION_PRINTIFY_CANDIDATE.observedEconomyShippingUsd : AURELION_PRINTIFY_CANDIDATE.observedStandardShippingUsd;
  return Object.freeze({
    kind: "OFFLINE_REVIEW_DRAFT",
    storefront: AURELION_PRINTIFY_CANDIDATE.storefront,
    brand: "AURELION",
    product: AURELION_PRINTIFY_CANDIDATE,
    title: title.trim(), description: description.trim(), artworkSha256: artworkSha256.toLowerCase(),
    selectedVariantIds: Object.freeze([...selectedVariantIds]),
    retailPriceUsd: dollars(retailPriceUsd), shippingMode,
    indicativeCostFloorUsd: dollars(AURELION_PRINTIFY_CANDIDATE.observedBasePriceUsd + shipping),
    indicativePreFeeSpreadUsd: dollars(retailPriceUsd - AURELION_PRINTIFY_CANDIDATE.observedBasePriceUsd - shipping),
    caveats: ["Observed from screenshots, not live verified", "Variant-specific cost, taxes, fees, artwork placement, and shipping must be rechecked", "Pre-fee spread is not profit", "Printify Premium pricing not assumed"],
    supplierWritesEnabled: false, publishingEnabled: false, orderCreationEnabled: false,
  });
}
