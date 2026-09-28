# Ecosystem Integration Contract

The Agent Company orchestrates canonical systems; it does not silently replace them.

- PORTAL: command-center presentation and human approvals.
- MINT: opportunity lifecycle, cash-event ledger, settlement truth and capital metrics.
- ORACLE / SELDON / EDGE: research outputs remain under their own evidence contracts.
- WINDOW / EARTH NOW: observation products remain under their own truth/provenance rules.
- VictoryChain: optional provenance/ownership anchoring where it adds real utility.

## Event envelope
Integrations should exchange a provider-neutral envelope:
```json
{
  "event_id":"uuid-or-content-hash",
  "type":"opportunity.discovered",
  "producer":"scout",
  "subject":"...",
  "occurred_at":"ISO-8601",
  "evidence":[],
  "payload":{},
  "requires_human_approval":false
}
```

Consumers must tolerate duplicate delivery by event_id. No system may translate a forecast, lead, invoice, checkout event or payment authorization into settled cash. Only verified settlement becomes settled capital.
