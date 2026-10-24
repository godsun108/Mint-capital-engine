// Match the AURELION garment and provider from catalog responses without supplier writes.
// Never guess catalog IDs or silently substitute a different garment.
import { createPrintifyReadOnly } from "./printify-readonly.mjs";
function records(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value.data)) return value.data;
  throw Error("unexpected Printify catalog response");
}
function label(item) { return String(item?.title ?? item?.name ?? "").trim(); }
function id(item) { return item?.id; }
export async function discoverAurelionFreestyler({ token, fetchImpl } = {}) {
  const api = createPrintifyReadOnly({ token, fetchImpl });
  const blueprints = records(await api.listBlueprints());
  const candidates = blueprints.filter(item =>
    /stanley\s*\/?\s*stella/i.test([label(item),item?.brand].join(" ")) &&
    /freestyler/i.test(label(item)) &&
    /(?:heavyweight|heavy)/i.test(label(item))
  );
  if (candidates.length !== 1) return { status: "REVIEW_REQUIRED", reason: "garment not uniquely identified", candidates: candidates.map(x=>({id:id(x),title:label(x)})), writesEnabled:false };
  const blueprintId = id(candidates[0]);
  if (!Number.isSafeInteger(blueprintId) || blueprintId <= 0) throw Error("invalid catalog blueprint");
  const providers = records(await api.listProviders(blueprintId));
  const matches = providers.filter(item => /fulfill\s*engine/i.test(label(item)));
  if (matches.length !== 1) return { status:"REVIEW_REQUIRED", reason:"provider not uniquely identified", blueprintId, providers:providers.map(x=>({id:id(x),title:label(x)})), writesEnabled:false };
  const providerId=id(matches[0]);
  if (!Number.isSafeInteger(providerId) || providerId <= 0) throw Error("invalid catalog provider");
  const [variants,shipping]=await Promise.all([api.listVariants(blueprintId,providerId),api.getShipping(blueprintId,providerId)]);
  return { status:"CATALOG_REVIEW", blueprintId, providerId, garment:label(candidates[0]), provider:label(matches[0]), variants, shipping, writesEnabled:false, publishEnabled:false, pricingVerified:false };
}
