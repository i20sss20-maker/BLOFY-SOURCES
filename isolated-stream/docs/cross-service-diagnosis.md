# BLOFY STREAM — Cross-service diagnosis, v1

Scope: STREAM API operator console only. Production client apps (Android / Windows), subscriber codes, existing account limits and payment flows are unchanged.

## Observations

This feature combines **existing read-only snapshots** from the BLOFY activation portal with in-process STREAM API relay and operator-HLS status:

| Category | Data actually measured | Exclusions |
| --- | --- | --- |
| Xtream gateway HTTP transfers | Active *direct* authenticated HTTP response transfers in the portal process | Unique human viewers, 307 redirects, licensed fanout, independent edge, HLS segments, other Railway replicas |
| Xtream gateway media quality | First valid media bytes sent, failed and interrupted transfer attempts, p95 startup latency, HTTP reasons | Decoded picture/audio; all customer playback sessions; full historical coverage |
| STREAM fanout | Current shared-relay readers and feed count in the isolated STREAM API process | Ordinary direct streams and customers outside that process |
| Operator HLS | Operator supervisor path reader counters | Every MediaMTX or end-user HLS session |
| Source capacity | Cached provider-reported limits and pinned gateway subscriptions | Live true upstream socket sessions or source redistribution authorization |
| Xtream Edge & MediaMTX | Explicitly **unmeasured** here | Do not substitute relay totals |

**Never sum** direct transfers, shared-relay readers, HLS readings or subscription counts into a claim about all viewers. An individual viewer can appear in more than one layer; uninstrumented paths may not appear anywhere.

## Diagnostics

- HTTP 403, 429, 456 are classified as provider admission/rate-limit signals; do not bypass source connection or license restrictions.
- HTTP 408 and 500/502/503/504 appear as transport/upstream symptoms over the portal's one-hour bounded sample.
- Local gateway auth denials are separate from provider failures; missing catalog entries do not imply source downtime.
- Relay provider failures are cumulative **since STREAM API boot**, unlike gateway counters sampled over the last hour.
- Portal metrics store at most **400 events per process**; the dashboard explicitly flags that earlier events can be excluded.
- A missing upstream service appears as partial/unknown; zero events does not imply healthy A/V.

## Operator safety

- Route `GET /operator/api/cross-service` is behind the pre-existing Basic operator auth gate. No POST route.
- Only the existing **fixed-origin Bearer** client calls the portal's already-authenticated `/internal/blofy-stream/media-quality` and `/internal/blofy-stream/source-capacity` endpoints.
- Parallel requests coalesce and cache for 15 seconds. No new media probes, FFmpeg work, account writes, migrations or provider logins.
- The response is an allowlist of bounded metrics and generic error codes. It never returns IP addresses, source URLs, credentials, tokens, phone numbers, stream IDs or subscriber identities.

## Before any additional rollout

Run full isolated-stream and core GitHub tests, then check Railway deployment status and 5xx. Physical Android 9/Windows playback, independent Edge viewer instrumentation, MediaMTX sessions, unique viewer correlation and licensed large-scale provider capacity remain separate verification tasks.
