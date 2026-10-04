# Foundry Growth Engine (FGE) v1

Status: IMPLEMENTATION CONTRACT — extends existing MINT acquisition/commerce/fulfillment systems. Do not duplicate them.

## Existing systems we reuse
- `growth/first-customer-launch-kit.md`: source-tagged launch links, channel drafts, first-customer loop.
- `connect-demo/server.js`: VISITED + CHECKOUT_STARTED acquisition events and source attribution; Stripe checkout/evidence; fulfillment evidence.
- `connect-demo/catalog.json`: active offer truth, acquisition copy, prices and fulfillment mapping.
- Metricool is the central distribution station. Current routing rule: Foundry -> Bluesky; Luna Vale -> Instagram; Mechanical Obsessions -> YouTube.
- PAID != SETTLED. Acquisition counters are process-local, not lifetime unique visitors.

FGE is an orchestration/learning layer around these systems, not a replacement.

## Mission
DISCOVER -> QUALIFY -> CREATE -> DISTRIBUTE -> CONVERSE -> CONVERT -> MEASURE -> LEARN -> REPEAT.

North-star: verified profit per acquisition source. Until settlement data is available, report funnel evidence without calling it profit.

## Agents

### Scout
Find public, relevant demand: developer questions, permitted communities, directories, ecosystem gaps, search topics and partnership opportunities.
Output an opportunity queue with source, URL/location, observed need, matched offer, relevance score, intent score, promotion rules/status, proposed helpful contribution and tracking source.
Never scrape private spaces, bypass access controls, harvest personal data, or mass-DM.

### Publisher
Turn catalog truth into accurate educational content: tutorials, snippets, checklists, build notes, product explanations and launch posts.
Every claim must map to the actual offer/deliverable. No fabricated customers, testimonials, scarcity, rankings or performance claims.

### Ambassador
Handle Foundry-owned inbound comments/questions and prepare contextual outbound replies where participation is permitted.
Default outbound mode is DRAFT/REVIEW. No impersonation, automated unsolicited bulk messaging, fake engagement or astroturfing. Identify Foundry affiliation when material.

### Distributor
Route approved assets only to the intended brand/channel and attach a normalized source tag.
Metricool routing invariant:
- Bluesky = Foundry
- Instagram = Luna Vale
- YouTube = Mechanical Obsessions
Cross-brand publishing requires explicit approval.

### Search
Own legitimate technical/content SEO: crawlability, sitemap/robots, canonical metadata, descriptive titles, structured data where truthful, internal links, performance/accessibility diagnostics, Search Console-style indexing diagnostics when connected, keyword/topic gaps and useful landing content.
Never promise #1 rankings, buy links, cloak, keyword-stuff, doorway-page spam, fake reviews or manipulate search systems.

### Oracle
Join existing acquisition, commerce and fulfillment evidence into a source scoreboard:
impression (only when provider supplies it) -> visit -> checkout_started -> paid -> fulfilled -> provider_available -> settled.
Never infer missing stages. Never call process-local counters unique visitors.
Recommended derived metrics when denominators exist: visit-to-checkout, checkout-to-paid, paid-to-fulfilled, gross revenue/source, verified settled revenue/source, and later verified profit/source.

## Opportunity schema
```json
{
  "id": "opp:<stable-id>",
  "brand": "foundry",
  "channel": "bluesky|github|search|directory|community|partner|other",
  "location": "public URL or platform surface",
  "observed_need": "evidence-based summary",
  "offer_id": "catalog offer id",
  "relevance": 0,
  "intent": 0,
  "permission": "allowed|review|unknown|prohibited",
  "action": "helpful proposed contribution",
  "source_tag": "fge_<channel>_<campaign>",
  "state": "discovered|qualified|drafted|approved|distributed|measured|rejected"
}
```

## Guardrails / approval gates
FGE may autonomously read public signals, score opportunities, create drafts, generate SEO diagnostics and measure existing evidence.
Human approval remains required before: first participation in a new third-party community, unsolicited direct outreach, new account creation, paid advertising/spend, purchasing domains/services, changing prices/offers, publishing claims not already supported by catalog truth, or cross-brand distribution.
Existing approved owned-channel scheduling may use the established Metricool workflow; drafts remain drafts until deliberately approved/published.

## Free-distribution priority
1. Foundry-owned Bluesky: useful builder content + product education.
2. Technical SEO on Foundry pages.
3. GitHub profile/repository surfaces where accurate and relevant.
4. Legitimate product/developer directories with free submission.
5. Public community participation only where self-promotion rules permit it.
6. Partnerships/newsletters/guest education with genuine audience fit.
Paid ads remain OFF until a real live purchase + successful fulfillment is verified and economics are understood.

## SEO acceptance criteria
- unique descriptive title/description per indexable page
- canonical URL
- robots policy + XML sitemap
- Open Graph/social metadata
- truthful Product/SoftwareApplication/Organization structured data only where applicable
- semantic headings, accessible links/buttons, mobile usability
- internal linking between relevant offers
- no indexable thin/duplicate doorway pages
- performance baseline and regression checks
- source-tagged campaign links must canonicalize to the clean page, not create duplicate indexed URLs

## Measurement contract
Source tags: lowercase `[a-z0-9_-]{1,48}`, human-readable campaign taxonomy.
Do not put PII in source tags.
Suggested taxonomy: `fge_<channel>_<campaign>`, e.g. `fge_bluesky_launch`, `fge_github_profile`, `fge_search_express_ts`.
Preserve existing source tags already deployed; migrate only when it will not break comparisons.

## First execution cycle
1. Audit Foundry landing + /offers against SEO acceptance criteria.
2. Add missing technical SEO assets/metadata as a separate reviewed code change.
3. Build Scout opportunity queue from public surfaces; record rules before recommending participation.
4. Produce a 7-day Foundry Bluesky content queue, drafts first.
5. Measure existing Bluesky launch source using current acquisition/commerce/fulfillment evidence.
6. After first verified paid+fulfilled customer, calculate conversion evidence and decide whether to scale the winning source.
7. Productize reusable FGE components only after they work internally; Foundry uses Foundry before selling the tooling.

## Error doctrine
Perfection is knowing the error: every cycle records what was attempted, evidence observed, missing evidence, failure/drop-off, next hypothesis and whether the change improved a verified metric.
