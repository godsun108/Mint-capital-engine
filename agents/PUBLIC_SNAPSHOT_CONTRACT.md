# Public Snapshot Contract

MINT may publish a sanitized, read-only Agent Company snapshot for presentation clients such as Portal.

Schema: `mint.agent-company.public.v1`

Allowed: aggregate job status, pending approval identifiers/action classes, mission objective/status/budget thresholds, experiment counts, verified settled revenue, tracked cost, system halt state, generation time and source commit.

Excluded by default: credentials, customer PII, lead contents, private evidence payloads, provider tokens, payment identifiers, private prompts, internal notes, approval actors, and writable endpoints.

Portal must treat the snapshot as display data only. A public snapshot can never carry an approval, command, payment instruction or permission grant. Stale/unverifiable state must be labeled rather than silently presented as live.
