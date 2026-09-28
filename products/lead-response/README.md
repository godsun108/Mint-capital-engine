# Lead Response Diagnostic v0

A privacy-minimal sandbox instrument for measuring inbound lead response performance.

It does **not** contact customers, replace a CRM, scrape private data, or claim that unanswered leads would have converted.

## Inputs
A CSV/export or manually prepared rows containing received timestamp, optional first-response timestamp, channel and optional outcome. Names, emails, phone numbers and message bodies are unnecessary.

## Metrics
- response rate
- unanswered leads
- <=5 minute / 1 hour / 24 hour / 72 hour response rates
- median first-response time
- business-hours vs after-hours response rate
- prioritized gaps
- optional assumption-based gross opportunity estimate

Any opportunity estimate requires the business to provide average job value and close-rate assumptions and is explicitly labeled **not revenue**.

## Next
Wrap this engine in a local browser UI, allow CSV import, render an audit report, and test the diagnostic with a consenting pilot business before adding any communication automation.
