# Digital Goods Consolidation — Cross-repository audit (2026-10-01)

Reviewed accessible repository trees for all 22 repositories returned by the connected GitHub account. Three were empty/unavailable for tree inspection (Mint, sacredchainx, victory-trust-registry); no claim is made about unseen contents. Tree/keyword scan is an overlap screen, not a full code-quality or dependency audit.

## Canonical ownership (do not create a second factory)
- **Mint-capital-engine** owns product lifecycle, demand gates, candidate queue, digital goods production orchestration, catalog, acquisition, Stripe checkout, fulfillment and reconciliation. Reuse `agents/product-loop.js`, `automation/product-cycle.js`, `automation/digital_product.template.json`, `agents/adapters/artifact-generator.js`, `agents/adapters/artifact-test.js`, `automation/product-executor.js`, `automation/validate-catalog.js`.
- **Command-center** owns portfolio display, evidence contracts, approval decisions and cross-system operational health; it does not implement a parallel product generator or payment ledger.
- **turbo-foundry** owns reusable artifact/build provenance and promotion standards, not a competing commerce engine.
- **virtual-human-engine** owns character-linked goods (art, music, presets, avatar/game assets) and rights-clearance data. Its `src/vhe/digital_goods.py` is a domain model, not a replacement for Mint's commerce catalog.
- **The-portal** owns discovery/navigation and user journeys, not canonical order state.
- **dreams-to-reality** owns personal goal workflows, potential source material for a Notion-style template, not an independent sales platform.
- **oracle-execution / -oracle-options-lab / Seldon / edge-intelligence** are not to be conflated with customer revenue or product payment rails.
- Remaining inspected repos had no obvious overlapping digital-commerce filenames in tree scans; keep existing boundaries.

## Avoid duplication
Existing `docs/digital-goods-foundry.md` is a product/QA specification to implement **inside the existing Mint lifecycle**, not a proposal for a new service, scheduler, schema or repository. Adapt Notion/Markdown/CSV/PDF/XLSX artifact plugins to the current product executor and artifact test adapter. Keep one canonical SKU/catalog and one provider-confirmed revenue ledger.

## Near-term commercial priority
1. Existing $5 Small Website Launch Checklist: live product-specific mobile page visually verified by owner; deploy SHA `4991de77af1460c31483f5a56fd6dd8976af130e` confirmed SUCCESS. Do not infer payment success from this.
2. Verify checkout/fulfillment mapping using mocks and an isolated Stripe test key. Production key is LIVE, so never test with a real card or test card on production.
3. Prepare approved channel-tagged distribution, source attribution, customer support/refund disclosures, and evidence reconciliation.
4. Prototype one Notion-compatible import kit as an extension of existing artifact generation, after first acquisition experiment is operational.
5. Defer additional SKUs and new storefront engines until demand/fulfillment evidence supports them.

## Current operational exception
MINT factory CI's earlier syntax errors were corrected, but the latest run reports one FAILED_RETRYABLE task. Inspect task evidence and resolve it independently; do not call the entire factory green based on a successful Railway deploy.

## Promotion
A product must pass demand evidence, deliverable QA, catalog/mandate, isolated test checkout, independent fulfillment check, owner-approved distribution and reconciled actual live receipts. Unknown sales remain null.
