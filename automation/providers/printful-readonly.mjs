// Read-only Printful catalog/template discovery for MINT PRESS.
// No orders, products, listings, uploads, or spend are created by this adapter.
// Authenticated calls read PRINTFUL_TOKEN from the environment only.

const API = process.env.PRINTFUL_API_BASE || "https://api.printful.com";

function headers() {
  const h = { Accept: "application/json" };
  if (process.env.PRINTFUL_TOKEN) h.Authorization = `Bearer ${process.env.PRINTFUL_TOKEN}`;
  if (process.env.PRINTFUL_STORE_ID) h["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
  return h;
}

async function get(path) {
  const r = await fetch(API + path, { headers: headers() });
  if (!r.ok) throw new Error(`Printful GET ${path} failed: ${r.status}`);
  return r.json();
}

export async function catalogProducts({ limit = 100, offset = 0 } = {}) {
  return get(`/products?limit=${limit}&offset=${offset}`);
}

export async function catalogProduct(productId) {
  if (!Number.isInteger(Number(productId))) throw new Error("productId required");
  return get(`/products/${Number(productId)}`);
}

export async function layoutTemplates(productId, placements = []) {
  if (!Number.isInteger(Number(productId))) throw new Error("productId required");
  const p = Array.isArray(placements) ? placements.filter(Boolean) : [placements].filter(Boolean);
  const q = new URLSearchParams({ limit: "100" });
  if (p.length) q.set("placements", p.join(","));
  return get(`/v2/catalog-products/${Number(productId)}/mockup-templates?${q}`);
}

export async function mockupStyles(productId, placements = []) {
  if (!Number.isInteger(Number(productId))) throw new Error("productId required");
  const p = Array.isArray(placements) ? placements.filter(Boolean) : [placements].filter(Boolean);
  const q = new URLSearchParams({ limit: "100", default_mockup_styles: "true" });
  if (p.length) q.set("placements", p.join(","));
  return get(`/v2/catalog-products/${Number(productId)}/mockup-styles?${q}`);
}

// Legacy print-file geometry is intentionally not used for new catalog products.
// v2 mockup styles/templates expose print-area and positioning evidence without writes.

export async function productTemplates({ limit = 100, offset = 0 } = {}) {
  if (!process.env.PRINTFUL_TOKEN) throw new Error("PRINTFUL_TOKEN required for account product templates");
  return get(`/product-templates?limit=${limit}&offset=${offset}`);
}

export async function variantPrices(productId) {
  if (!Number.isInteger(Number(productId))) throw new Error("productId required");
  const d = await catalogProduct(productId);
  const variants = d?.result?.variants || d?.result?.product?.variants || [];
  return variants.map(v => ({ id:v.id, name:v.name, price:v.price ?? null, currency:v.currency ?? null, in_stock:v.in_stock ?? null, availability_status:v.availability_status ?? null }));
}

export async function mockupPreflight(productId) {
  const [templates, styles] = await Promise.all([layoutTemplates(productId), mockupStyles(productId)]);
  return {productId:Number(productId), mode:"READ_ONLY_PREFLIGHT", templates, styles, createEndpoint:"POST /v2/mockup-tasks", createExecuted:false};
}

export async function tokenScopes() {
  if (!process.env.PRINTFUL_TOKEN) throw new Error("PRINTFUL_TOKEN required");
  return get("/oauth/scopes");
}

export const capabilities = Object.freeze({
  mode: "READ_ONLY_DISCOVERY",
  orders: false,
  productWrites: false,
  listingWrites: false,
  mockupWrites: false,
  spend: false,
});
