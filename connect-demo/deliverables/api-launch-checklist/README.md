# API Launch Checklist

A compact pre-launch checklist for small web APIs.

## Reliability
- [ ] Health endpoint returns an expected status.
- [ ] Required environment variables are documented.
- [ ] Production secrets are not committed to source control.
- [ ] Startup failures are visible in logs.
- [ ] Expected error responses are handled.

## Security basics
- [ ] Inputs are validated at trust boundaries.
- [ ] Authentication/authorization rules are tested where applicable.
- [ ] CORS behavior is intentional.
- [ ] Sensitive values are excluded from logs and responses.
- [ ] Dependencies have been reviewed for known issues.

## Operations
- [ ] Production start command is tested.
- [ ] Deployment health check points at the correct endpoint.
- [ ] Rollback/redeploy procedure is understood.
- [ ] Critical external dependencies are identified.
- [ ] A basic failure test has been performed.

## Customer/API experience
- [ ] Base URL and endpoints are documented.
- [ ] Example request/response exists.
- [ ] Error formats are understandable.
- [ ] Rate or usage constraints are documented if relevant.
- [ ] Versioning/change expectations are stated.

This checklist is a general engineering aid, not a guarantee of security, reliability, or production readiness.
