import { catalogProduct, variantPrices, mockupPreflight } from "./printful-readonly.mjs";
import { validateBrandSelection } from "./printful-brand-scope.mjs";

// This entry point only reads supplier data. No supplier POST or publication path.
export async function discoverBrandProduct(selection, { includeMockupPreflight = false } = {}) {
  const scoped = validateBrandSelection(selection);
  if (typeof includeMockupPreflight !== "boolean") throw Error("invalid preflight option");
  const product = await catalogProduct(scoped.productId);
  const prices = await variantPrices(scoped.productId);
  const available = new Set(prices.map(v => Number(v.id)));
  if (scoped.variantIds.some(id => !available.has(id))) throw Error("requested variant missing from catalog");
  const preflight = includeMockupPreflight ? await mockupPreflight(scoped.productId) : null;
  return { brand: scoped.brand, productId: scoped.productId, product, prices, preflight, writeAuthorized: false };
}
