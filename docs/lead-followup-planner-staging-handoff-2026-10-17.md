# Lead & Follow-Up Planner — staging handoff (2026-10-17)

**State: QA-PASSED LOCALLY; NOT CATALOG-ACTIVE; NOT DEPLOYED; NO LIVE SALE.**

## Artifact evidence
- Archive: `foundry-lead-followup-planner-qa-v02.zip` (currently conversation artifact, **not** uploaded to repository or Railway).
- SHA-256: `a56783d08dcbbc6ac621e681be8ec834a235ea71b29bf9a3033070fa71ac5c56`.
- ZIP integrity: `testzip() == None`; 7 archive entries: README.md, 8-page PDF, and five CSV templates (lead-intake, response-log, appointment-followup, quote-tracker, weekly-scorecard).
- PDF extracted text page lengths: 246, 830, 107, 111, 112, 109, 121, 398 characters.
- Proposed SKU `foundry-lead-followup-planner-006`, hypothetical $19 USD, DIGITAL_DOWNLOAD/FILE. **Do not add as ACTIVE until fulfillment artifact is in an approved, access-controlled deployment location and checkout/delivery tests pass.**
- Expected catalog fulfillment filename: `foundry-lead-followup-planner.zip`; proposed repository location `deliverables/lead-followup-planner/foundry-lead-followup-planner.zip` after authorized binary upload.

## Commercial gate sequence
1. Stage exact ZIP bytes and verify checksum on destination.
2. Validate licensing, business disclaimers, product copy, refund policy, and approval of $19 price.
3. Add offer in non-public staging status with an approved mandate.
4. Run test-mode checkout -> webhook -> authorized signed/controlled download -> failed/refunded payment denial. Never make a real purchase for testing.
5. Check public offers page renders accurately; activate only after owner authorization and passing fulfillment.
6. Independently distinguish checkout start, paid, fulfilled and settled.

## Existing checkout surface
Repository's `connect-demo/public/offers.html` points to `https://mint-stripe-connect-v4-production.up.railway.app/offers`, but this URL in source code is **not** proof of current live health. Existing `automation/smoke-offers.mjs` checks HTML response only, not checkout or fulfillment.

## No-go
Do not claim this product is live, do not issue a checkout URL, do not charge, and do not post promotions until all gates pass.
