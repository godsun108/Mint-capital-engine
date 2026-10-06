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

export async function layoutTemplates(productId, technique) {
  if (!Number.isInteger(Number(productId))) throw new Error("productId required");
  const q = technique ? `?technique=${encodeURIComponent(technique)}` : "";
  return get(`/mockup-generator/templates/${Number(productId)}${q}`);
}

export async function printFiles(productId, technique) {
  if (!Number.isInteger(Number(productId))) throw new Error("productId required");
  const q = technique ? `?technique=${encodeURIComponent(technique)}` : "";
  return get(`/mockup-generator/printfiles/${Number(productId)}${q}`);
}

export async function productTemplates({ limit = 100, offset = 0 } = {}) {
  if (!process.env.PRINTFUL_TOKEN) throw new Error("PRINTFUL_TOKEN required for account product templates");
  return get(`/product-templates?limit=${limit}&offset=${offset}`);
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
