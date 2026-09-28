# Sandbox Build Spec — Lead Response Diagnostic v0

Purpose: validate value before building a full communication platform.

## Input
A business provides or manually enters a small sample of inbound leads:
- received timestamp
- channel
- first-response timestamp, if any
- human/automated response
- outcome, if known

No customer PII is required for the sandbox.

## Output
- response-rate within 5m / 1h / 24h / 72h
- median response time
- unanswered count
- after-hours vs business-hours comparison
- estimated opportunity range using **business-provided** average job value and explicitly labeled assumptions
- prioritized workflow gaps
- a recovery-workflow draft requiring human approval before any customer communication

## Pilot wedge
Do not replace the CRM. Do not answer customers autonomously in v0.
Start as an evidence instrument: "show me exactly where inbound leads are leaking."

## Success test
A target business voluntarily reviews its diagnostic and indicates a concrete willingness to pay for either the audit or implementation. Payment, if any, must be settled and recorded by MINT before being counted as revenue.
