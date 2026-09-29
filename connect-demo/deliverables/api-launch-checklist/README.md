# API Launch Checklist

A practical preflight for shipping a small API without forgetting the boring things that become expensive later.

## 1. Runtime
- [ ] Production start command works from a clean install.
- [ ] Required environment variables are documented.
- [ ] Missing required configuration fails clearly.
- [ ] Health endpoint reports process readiness without leaking secrets.
- [ ] Logs identify startup and actionable failures.

## 2. Request boundaries
- [ ] Validate untrusted path, query and body inputs.
- [ ] Define request-size limits appropriate to the API.
- [ ] Authentication and authorization boundaries are explicit.
- [ ] CORS is intentional rather than accidentally permissive.
- [ ] Errors do not expose secrets, stack traces or sensitive internals.

## 3. Failure test
Run one controlled failure before launch:
1. remove or invalidate a required configuration value;
2. confirm startup/request failure is visible;
3. restore configuration;
4. confirm recovery;
5. record what signal an operator should watch.

## 4. Deployment
- [ ] Build artifact is reproducible.
- [ ] Production dependency/install strategy is known.
- [ ] Health check is connected to hosting where supported.
- [ ] Rollback/redeploy procedure is written down.
- [ ] Database/schema changes, if any, have a recovery plan.

## 5. Customer experience
- [ ] Base URL and important endpoints are documented.
- [ ] At least one valid request/response example exists.
- [ ] Common errors are explained.
- [ ] Authentication setup is understandable.
- [ ] Rate/usage constraints are stated.
- [ ] Versioning/change expectations are stated.

## 6. Launch record
Copy this for each release:

```
Release:
Date:
Owner:
Production URL:
Health URL:
Version/commit:
Required configuration verified:
Failure test performed:
Rollback path:
Known limitations:
Next review:
```

## 7. Ten-minute final pass
- Hit health.
- Run one real happy-path request.
- Run one invalid-input request.
- Check logs for secrets/noise.
- Read the docs as a new customer.
- Verify the rollback path exists.

## Stop-ship questions
Do not knowingly launch until you can answer:
- How do I know it is alive?
- How do I know it is broken?
- How do I restore the last working state?
- What can an unauthenticated caller do?
- What happens to malformed input?
- What does a customer do when a request fails?

This is a general engineering aid, not a guarantee of security, reliability, compliance, or production readiness. Adapt it to the risk and architecture of the system.
