# BLOFY RESTREAM — Pilot V1 (isolated, no customer traffic)

## What already exists
The `BLOFY-SOURCES` Node 22 service already exposes a protected admin UI, Xtream API, account creation/bulk accounts, connection counts, an open-license restream overview, and content sync.
Routes: `/`, `/admin`, `/admin-api/status`, `/admin-api/restream`, `/admin-api/accounts/bulk`, `/health`.
The admin session is required for the /admin-api routes, and an ADMIN_PASSWORD environment secret must be configured via Railway's secret UI; NEVER commit it.

## Pilot scope and guardrails
- Separate Railway project/environment; never connect production domains, production DB, activation keys or customer devices.
- Source: one explicit redistributable sample live stream or self-owned sample video. Do not use a single restricted Xtream account to circumvent max connections.
- Generate only ten test accounts (durationDays=1, maxConnections=1) from existing bulk-accounts UI/API, after verifying ADMIN_PASSWORD.
- Limit the test catalog to 5–10 licensed items; record source rights and expiration.
- Test 1, 2, 5 and 10 viewers of the same authorized stream; test different streams only when each independent upstream stream is permitted.
- Observe source ingress, outgoing traffic, HTTP status, error rate, server CPU/memory and player startup.
- The existing bulk-account feature generates **Xtream credentials**, not BLOFY six-digit device activation codes. These are separate systems and must not be described as integrated.
- The existing restream overview is a status tool; **do not claim** that it already gives synchronized fan-out for one upstream connection. This must be explicitly implemented and load-tested before any commercial deployment.

## Pilot acceptance
1. Admin login refuses invalid credentials and is inaccessible without authentication.
2. Bulk account issuance generates exactly ten independent test accounts with distinct secrets; export is accessible only to an admin.
3. Revocation and expiry deny playback.
4. Catalog order remains consistent between responses and sync where supported; user-configurable order is a separate planned feature.
5. Authorized single-stream fan-out measured, without unexpectedly opening one upstream connection per viewer.
6. Failure rolls back cleanly to cached catalog, without disrupting production.
7. No production domain is pointed at the pilot.

## Launch sequence
1. Create an isolated Railway service from this branch with no production variables.
2. Configure a fresh strong ADMIN_PASSWORD directly in Railway's secret manager.
3. Configure licensed demo feed, data volume, public hostname, healthcheck `/health`.
4. Confirm health and admin authorization, then add authorized content.
5. Create ten test Xtream accounts via Subscribers > Bulk.
6. Test live stream and collect throughput metrics; do NOT invite paying customers until fan-out/rights/capacity validation.
7. Separate future stages: connect BLOFY activation codes, customizable category ordering, billing, production cutover.

## No-customer-change policy
This pilot branch has no impact on the default branch or existing Railway services until explicitly deployed. Any future deployment should stay in a new independent service and domain.
