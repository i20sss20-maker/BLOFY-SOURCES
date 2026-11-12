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
| STREAM MediaMTX (private Control API) | Real **ready path** total and **HLS session count** on the isolated STREAM media service, read-only fixed internal peer | WebRTC/RTSP peers, independent `blofy-restream-engine`, unique viewers, decoded A/V. Engine sessions may overlap other counters | 
| Xtream Edge (one Railway Bun Function instance) | Header-level requests forwarded to the authoritative gateway, recent 5-minute HTTP 5xx/denials, in-flight origin header requests, P95 response header latency | **Not media-body streaming duration**, unique viewers, active video connections, other Edge replicas, or actual client playback |

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
- Xtream Edge metrics are only available when an independent, high-entropy `BLOFY_STREAM_EDGE_OBSERVABILITY_KEY` is configured on **both** the Edge Function and STREAM API services. The Function retains a fixed private-observer route (`GET /__blofy_internal/edge-metrics`) with an explicit secret header; requests without the correct key receive the same 404 as an unknown endpoint. The STREAM API fetches it at a fixed, allowlisted HTTPS origin (`https://bfy.up.railway.app`), never a user-provided URL. Do not reuse admin, account, playback, or shared-relay secrets.
- Edge counters are in memory and reset on Function deployment. No user IDs, IP addresses, passwords, stream paths, URL queries or customer source information are retained. The metrics do not wrap or buffer video bodies, add source requests, or change the existing VOD retry gate.
- The response is an allowlist of bounded metrics and generic error codes. It never returns IP addresses, source URLs, credentials, tokens, phone numbers, stream IDs or subscriber identities.
- MediaMTX `createMediaControlClient().overview()` uses only `blofy-stream-media.railway.internal:9997`, the existing fixed authenticated `/v3/info`, `/v3/paths/list` and `/v3/hls/sessions/list` GETs. The diagnosis outputs **only bounded numeric totals** and an allowlisted generic authentication/availability error, never private paths/readers or HLS session records.
- Without configured MediaMTX credentials or a healthy HLS endpoint, media session counts are **unknown (`null`)**, not zero. This feature makes up to three small internal GETs per 15-second shared cache refresh; it does not probe provider streams or modify MediaMTX.

## Before any additional rollout

Run full isolated-stream and core GitHub tests, then check Railway deployment status and 5xx. Physical Android 9/Windows playback, independent Edge viewer instrumentation, MediaMTX WebRTC/RTSP sessions, full Edge body-lifetime metrics and independent engine sessions, unique viewer correlation and licensed large-scale provider capacity remain separate verification tasks.
