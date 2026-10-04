# Foundry FGE — first-dollar execution queue

Status: ACTIVE. This queue extends the existing first-customer launch kit and FGE contract.

## Current objective
Obtain the first independently verified live paid + fulfilled Foundry customer, then identify the acquisition source and repeat the winning behavior.

## Already operating
- Live catalog, Stripe checkout, payment evidence and fulfillment evidence.
- Source attribution for VISITED and CHECKOUT_STARTED.
- Foundry Bluesky connected through Metricool.
- First Foundry Bluesky launch communication prepared.
- FGE architecture: Scout, Publisher, Ambassador, Distributor, Search, Oracle.

## Execution queue
| Priority | Surface | Intent | Offer | Action | Source | Gate |
|---|---|---|---|---|---|---|
| 1 | Foundry Bluesky | builder discovery | Express TS Starter | Publish useful launch/educational content from owned account | bluesky / fge_bluesky_* | owned-channel approval workflow |
| 2 | Organic search | Express + TypeScript setup | Express TS Starter | technical SEO + useful product content | fge_search_express_ts | none for on-site SEO |
| 3 | GitHub owned surfaces | developers | Express TS Starter | accurate profile/repo link where context fits | fge_github_profile | review before profile/repo edit |
| 4 | Free developer directories | high-intent tool discovery | matched offer | qualify free listings; submit only where rules allow | fge_directory_* | review first new third-party surface |
| 5 | Public developer communities | problem/solution intent | matched offer | answer the actual question first; disclose affiliation when linking | fge_community_* | review rules + first participation |
| 6 | Partnerships/newsletters | audience fit | matched offer | propose useful resource/content, not bulk solicitation | fge_partner_* | review outreach |

## Seven-post Foundry queue
1. Launch: what the $9 Express + TypeScript starter actually contains.
2. Builder tip: why a health endpoint belongs in even a tiny API.
3. Builder tip: strict TypeScript as an early error detector; no performance claims.
4. Preflight: environment configuration mistakes to check before deploy.
5. Mini checklist: dev/build/start scripts a starter should make obvious.
6. Product transparency: what this starter is and is not; Markdown-delivered resource, not hosted SaaS.
7. Build log: Foundry is using its own growth/measurement system; invite product feedback without claiming customers.

Every outbound link gets a valid source tag. Posts must remain <= Bluesky's 300-character limit.

## Oracle first-dollar decision tree
- no VISITED from a source -> distribution/relevance problem
- VISITED but no CHECKOUT_STARTED -> landing/offer/intent problem
- CHECKOUT_STARTED but not paid -> checkout, trust, price or intent hypothesis; do not assume which
- paid but not fulfilled -> fulfillment incident; fix before scaling
- paid + fulfilled -> record source, offer and evidence; repeat source with a second useful variant
- provider_available is not bank settlement; PAID != SETTLED

## Stop conditions
No paid ads, purchased placements, mass DMs, fake engagement, fake reviews, ranking manipulation, or cross-brand Metricool routing. No claim of first dollar until commerce evidence independently verifies payment.
