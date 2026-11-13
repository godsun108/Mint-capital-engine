// Read-only Printify transport. Never performs supplier writes or sends credentials to arbitrary hosts.
const ORIGIN = "https://api.printify.com";
const ROUTES = {
  blueprints: /^\/v1\/catalog\/blueprints\.json$/,
  providers: /^\/v1\/catalog\/blueprints\/[1-9]\d*\/print_providers\.json$/,
  variants: /^\/v1\/catalog\/blueprints\/[1-9]\d*\/print_providers\/[1-9]\d*\/variants\.json$/,
  shipping: /^\/v1\/catalog\/blueprints\/[1-9]\d*\/print_providers\/[1-9]\d*\/shipping\.json$/,
};
function positiveId(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw Error("invalid Printify catalog ID");
  return value;
}
export function createPrintifyReadOnly({ token, fetchImpl = globalThis.fetch } = {}) {
  if (typeof token !== "string" || !token.trim()) throw Error("Printify read-only token required");
  if (typeof fetchImpl !== "function") throw Error("fetch unavailable");
  async function get(path) {
    if (!Object.values(ROUTES).some(rule => rule.test(path))) throw Error("unapproved Printify read route");
    const response = await fetchImpl(ORIGIN + path, {
      method: "GET", redirect: "error",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!response.ok) throw Error(`Printify read failed (HTTP ${response.status})`);
    return response.json();
  }
  return Object.freeze({
    capabilities: Object.freeze({ catalogReads: true, productWrites: false, publishing: false, orders: false, spend: false }),
    listBlueprints: () => get("/v1/catalog/blueprints.json"),
    listProviders: blueprintId => get(`/v1/catalog/blueprints/${positiveId(blueprintId)}/print_providers.json`),
    listVariants: (blueprintId, providerId) => get(`/v1/catalog/blueprints/${positiveId(blueprintId)}/print_providers/${positiveId(providerId)}/variants.json`),
    getShipping: (blueprintId, providerId) => get(`/v1/catalog/blueprints/${positiveId(blueprintId)}/print_providers/${positiveId(providerId)}/shipping.json`),
  });
}
