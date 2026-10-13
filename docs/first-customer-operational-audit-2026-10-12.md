# First Customer — Operational Audit and Priority Queue
Date: 2026-10-12
Status: EVIDENCE REVIEW / NOT A SALES CLAIM

## Verified
- systems/commerce/catalog.json currently declares five ACTIVE FILE offers: Foundry Express TypeScript Starter ($9), API Launch Checklist ($5), Small Website Launch Checklist ($5), Practical AI Workflow Kit ($9), MINT Builder Launch Pack ($19). One Orbital Garden tote ($49) is STAGED_NOT_PUBLIC.
- Declared channels for active offers are mint-direct-web and github-pages. Gumroad is NOT a declared channel in this catalog; independently verify Gumroad account and listing status before claiming it is the checkout provider.
- Railway MINT Capital Engine production service mint-stripe-connect-v4 last observed SUCCESS deployment on 2026-10-12, commit 788055f (campaign attribution repair).
- Metricool Foundry Bluesky: Practical AI Workflow Kit post published 2026-10-12 with /offers?src=foundrytools_ai_workflow. TypeScript Starter promotion pending for 2026-10-13 with /offers?src=foundrytools_ts_starter.
- No independent customer checkout or digital fulfillment smoke test completed in this audit. No conversion or net-profit claims.

## P0: Verify money path
1. Fetch deployed /offers and each ACTIVE offer's public detail route. Confirm accurate copy, price, download contents and mobile rendering.
2. Inspect /api/acquisition/state and /api/money-state with correct auth and data-handling; snapshot non-sensitive aggregates. Distinguish process-local counters from durable counts, visitors from unique visitors.
3. In test mode only, simulate checkout, webhook, delivery, refund and failed-payment scenarios. Check no test receipts enter settled-cash ledger.
4. Check actual Gumroad listings, payouts, and downloads using an authorized account integration. Do not assume connected or live from repo notes.
5. Identify the canonical customer purchase link per offer and ensure every marketing link resolves to it.

## P1: Demand and conversion
- Select only two focus offers for 14-day test: Practical AI Workflow Kit and Express TypeScript Starter. These already have product-specific acquisition messages.
- Produce short, truthful demonstrations of the actual files and one concrete before/after use case for each. Do not imply a demo exists until rendered and reviewed.
- Compare search intent and community questions for those specific jobs; ask relevant prospective buyers for candid feedback, without unsolicited spam.
- Use campaign-specific source tags; track landing sessions, checkout starts, paid orders, successful fulfillment, refunds, fees, net proceeds.
- If visits=0: distribution problem. If visits>0 but checkout starts=0: offer/page mismatch. If checkout starts>0 but paid=0: checkout/price/trust problem. If paid>0 but delivery fails: stop promotion and repair fulfillment.

## P2: Scale or retire based on evidence
- Run weekly review, not constant new-product creation.
- Keep price and paid ad budget unchanged absent owner approval.
- Scale the first offer with real paid and delivered orders, healthy unit economics, and repeatable qualified traffic.

## Guardrails
No external public posts, real charges, paid ads, account access changes or product publication are authorized by this audit. No unsupported claim that Gumroad or Stripe revenue is zero across all accounts. Keep AI and developer products on Foundry channels, not Luna Vale or Mechanical Obsessions.
