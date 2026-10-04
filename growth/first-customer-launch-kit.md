# MINT first-customer launch kit

Status: READY FOR HUMAN REVIEW. These are drafts, not published posts. Do not claim verified sales or customer results.

## Primary offer
Foundry Express TypeScript Starter — $9 one-time.
Actual delivery is a Markdown README artifact; describe contents accurately. The landing page lists strict TypeScript, Express server scaffold, JSON middleware, health route, environment example, and development/build/start scripts.

Canonical landing page:
https://mint-stripe-connect-v4-production.up.railway.app/

## Tracking links (source attribution, not unique visitors)
- GitHub profile / relevant repo README: https://mint-stripe-connect-v4-production.up.railway.app/?src=github_profile
- Bluesky: https://mint-stripe-connect-v4-production.up.railway.app/?src=bluesky
- X: https://mint-stripe-connect-v4-production.up.railway.app/?src=x_launch
- LinkedIn: https://mint-stripe-connect-v4-production.up.railway.app/?src=linkedin
- Direct personal outreach: https://mint-stripe-connect-v4-production.up.railway.app/?src=direct_outreach
- Portfolio, all five offers: https://mint-stripe-connect-v4-production.up.railway.app/offers?src=portfolio_launch

## Suggested post: developer community (disclose affiliation)
I built Foundry, a $9 one-time Express + TypeScript starter for people who want to skip the blank-project setup. It covers strict TS configuration, JSON middleware, a health endpoint, an environment example, and dev/build/start scripts. It's a small Markdown-delivered builder resource, not a hosted SaaS. Feedback welcome: [channel-specific link]

## Suggested post: broader audience
Building a small API or website? MINT now has five one-time digital builder resources ($5–$19): launch checklists, an Express + TypeScript starter, an AI workflow kit, and a combined pack. Clear contents and Stripe checkout: https://mint-stripe-connect-v4-production.up.railway.app/offers?src=portfolio_launch

## Suggested direct message (send only to people with genuine interest)
Hey! I'm launching a tiny developer resource: a $9 Express + TypeScript starter with a setup scaffold and launch basics. Would you be willing to give the landing page a quick critique? No pressure to buy. https://mint-stripe-connect-v4-production.up.railway.app/?src=direct_outreach

## First-customer operating loop
1. Confirm landing page, /health, /offers, and delivery mapping remain reachable.
2. Review copy against the actual delivered file and clarify what is included before distribution.
3. Publish only on accounts and communities where promotion is permitted. No mass unsolicited messaging or fabricated testimonials.
4. Capture source-tagged VISITED and CHECKOUT_STARTED via /api/acquisition/state. Counters are process-local and reset on restart; do not call them lifetime unique visitors.
5. Read /api/commerce/evidence and /api/fulfillment/evidence to distinguish live checkout, paid verification, and delivery. PAID != SETTLED. Never publish customer session IDs.
6. Diagnose the first drop-off (no visits / no checkout / unpaid / fulfillment failure) before scaling.
7. No paid ads until a live purchase and fulfillment are verified and economics are understood.

## Operational caveat
Do not send the historical cs_test_ session to production live-mode Stripe for reconciliation. Use a separate isolated test environment if needed.
