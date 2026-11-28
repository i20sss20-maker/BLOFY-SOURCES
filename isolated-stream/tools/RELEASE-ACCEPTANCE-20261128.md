# BLOFY relay release acceptance — 2026-11-28

## Pinned QA candidates (not deployed)
- Media relay: 18b6f25c360775d6a50b548b0bf2cae9d1a48b8f
- Activation gateway: 4b2960b652d08bed178d6c58131df81f003fb056
- Media PR: https://github.com/i20sss20-maker/BLOFY-SOURCES/pull/216
- Gateway PR: https://github.com/i20sss20-maker/BLOFY-PLAYER-2.0/pull/979
- Host QA archive: https://github.com/i20sss20-maker/BLOFY-SOURCES/actions/runs/46120666247/artifacts/15254085923 (expires per GitHub retention policy).

The isolated host QA job passed 19 Node tests and 4 Python diagnostic tests.
The gateway PostgreSQL job passed 13 tests including concurrent independent
gateway pools. All seven gateway workflows passed on the pinned candidate.
At the time of writing, the full media CI result on the pinned revision
must still be checked. Neither production host has run this archive.

## Stage A: read-only and isolated verification
1. Record the actual deployed revision and service configuration on both
   hosts; do not print environment secrets. Confirm rollback artifacts exist.
2. Download the QA archive using authenticated GitHub access, check COMMIT.txt
   against the pinned media candidate, then verify SHA256SUMS. Extract into
   a fresh private directory, not the production tree.
3. Run sh isolated-stream/tools/run-host-isolated-qa.sh on each host from
   the extracted directory. This uses a resource-limited Docker test with
   no runtime network, not an upstream source or customer account.
4. Abort rollout if either host fails or sufficient headroom is unavailable.
5. Capture baseline with relay-health-capture.py and summarize-relay-health.py
   during one-channel and two-channel authorized playback. Do not increase
   the provider feed allowance or start extra source connections merely
   for a test. Record missing metrics as unknown.

## Stage B: controlled media canary (operator approval)
- Preserve customer hostnames, channel identifiers, activation data and DB.
- Verify installed service layout before preparing installation commands.
- Record and retain the exact previous image/configuration for rollback.
- Keep owner routing, automatic handoff, and any quota changes out of
  the first canary. Never launch a second production relay against the
  same source to test a failover.
- First assess independent ingress with
  BLOFY_STREAM_SHARED_LIVE_INDEPENDENT_INGRESS=1.
  Keep BLOFY_STREAM_SHARED_LIVE_INGRESS_MAX_DELIVERY_AGE_MS=0 initially.
  Preserve the existing sole-viewer pacing and source/feed/viewer limits.
  Compare with baseline using the same approved feeds and comparable load.
- Do not enable stale-session retirement until measured queue pressure
  demonstrates a benefit and player reconnect behavior has been validated.
- Optional source work can be paused using
  BLOFY_ENGINE_PAUSE_OPTIONAL_SOURCE_MEDIA=1 on the gateway candidate.
  This prevents new covered optional work; existing work must finish
  and this is not a provider-wide connection fence.

## Acceptance and stop conditions
- Test sustained one and two distinct authorized channels, then same-channel
  viewer fanout. A synthetic 250-viewer regression is not production capacity.
- Observe continuous decoded audio/video and channel switching on actual
  clients. Individual MPEG-TS session decode is not proof of timestamp
  continuity across reconnects. No timestamp rewriting is implemented.
- Reject a rollout with new source limit rejections, unresolved release,
  material increases in reconnects or latency, or playback regressions.
- If a real source still alternates between two channels, compare read EOF,
  local delivery age and admission metrics. Do not infer the provider's
  fault or entitlement from transport symptoms alone.
- No automatic production owner switch until trusted full-path coverage,
  prior owner stop, independent authoritative provider release and current
  destination health are confirmed. The existing commit gate remains
  scoped to the single-feed proof policy; do not loosen it for multifeed.
- Restore the exact verified previous revision/config if the canary fails,
  using the installed host's approved deployment procedure. Confirm old
  upstream release before opening a replacement. Never clear live holds
  or force admission on ambiguous cleanup.

This is a rollout acceptance checklist, not a claim of production readiness.
