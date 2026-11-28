# BLOFY saleh-only Origin pilot — 2026-11-13

## Objective and limits
One licensed Xtream live channel is pulled ONCE by BLOFY and then served
to many authorized viewers from a shared publisher or a read-replica network.
One upstream connection cannot stream numerous independent Xtream channels
unless the provider explicitly offers multi-program transport or additional
licensed concurrent source slots. The number of BLOFY codes is not the
number of simultaneous upstream streams.

## Implemented behind safe defaults
* Existing STREAM API relay broker authenticates the bridge, issues 45-second
  opaque tickets, verifies user/source entitlement upstream and shares one
  TS publisher for many viewers of one channel.
* Source quotas are source-scoped and forbid another upstream channel past
  the provider reported allowed concurrency without evicting a healthy feed.
* New short-lived, in-memory TS warm-join replay (bounded 256 KiB per feed)
  accelerates a viewer joining an already active channel with NO new
  provider GET. Cache resets on every new source session.
* Saleh origin policy checks exact unique source name, enabled/published,
  and authorized source ID via the private bridge before creating operator
  MediaMTX publisher paths. Pilot cap: one configured on-demand channel.
  The policy fails closed if source inventory is unavailable.
* Code issuance now supports NEW-CODES-ONLY saleh enforcement, entirely
  separate from previous codes, accounts, expiry and old source catalogs.
* Operator Restream UI exposes pilot readiness, channel cap, and the warm
  join counter. It does NOT claim customer cutover or 100% uptime.

## Feature flags — NOT activated automatically by code deployment
STREAM API:
  BLOFY_STREAM_SALEH_ORIGIN_ENABLED=1
    Enforces saleh-only for private operator on-demand MediaMTX publisher
    starts, no subscriber traffic transfer.

BLOFY PLAYER activation portal:
  BLOFY_STREAM_SALEH_NEW_CODES_ONLY=1
    Requires one unique enabled saleh source for newly generated codes.
    Existing codes are unaffected.

Already present licensed fanout pilot flags remain SEPARATE from these
controls. Do not enable all subscribers at once.

## Release / test requirements
1. Verify redistribution permission and real upstream cap (currently 1).
2. Keep exactly one Origin publisher instance. A second independent instance
   opens a new upstream unless an inter-instance lease plus fencing exists.
3. Test synthetic media and then one authorized real saleh channel with a
   restricted canary account. Verify same-channel viewers share ONE provider
   GET with no customer cutover.
4. Test late joins, 403/429/456, stalling, sequential reconnect, audio on
   Android 9/TV and Windows, and subscriber expiry. No unbounded retries.
5. Measure 2, 10, 25, 50, 100 viewers on a permitted source and record
   p50/p95 startup, 5xx, stalls, upstream sessions, CPU, RAM and network TX.
6. A private HLS read-through Edge is now deployed on Railway. It forwards
   MediaMTX Origin playlists and TS bytes without a second remux and without
   contacting the provider. It has no public domain. Live channel paths require
   a separately configured bearer token and are NOT routed to customers.
   The synthetic Origin -> Edge -> MPEG-TS test passed on Nov 13, 2026.
   Customer sessions are NOT covered by this proof.
   For broad rollout, add an authenticated client-facing proxy and verify
   consistent per-viewer HLS session handling, bounded requests, and resources.
7. Before a second Origin writer, implement durable leases, fencing tokens
   and crash tests. Never add Railway replicas blindly.
8. Enable optional new-code saleh-only flag after source uniqueness tests.
   Keep old source accounts/active codes intact.
9. Expand licensed canaries incrementally, with rapid rollback of new routing
   flags. Success is measured streaming playback, not health endpoint 200.

## Failure guarantees
No hard promise of uninterrupted playback if saleh goes offline or refuses
additional channels; this build is a constrained licensed sharing service,
not a source connection limit bypass. No new live customer routing, source
deletion, account changes or code expiry updates were performed by deployment.

Official reference: MediaMTX scaling documentation
https://github.com/bluenviron/mediamtx/blob/main/docs/2-features/19-scalability.md

## Verified synthetic distribution status (2026-11-13)

The initial second MediaMTX remux approach returned 500 or stalled on the
synthetic MediaMTX HLS source. BLOFY replaced that failing second remux
with a private Node HLS read-through edge on the existing read-replica service,
still listening only on Railway private port 8888. It forwards fixed-origin
HLS master, variant, TS segment and HLS session redirects/cookies.
No Xtream source URL/credentials are accepted by this service.

The private transport check returned:
  ok=true, stage=segment, 752 synthetic TS bytes verified, HTTP 200,
  four internal requests, no real saleh source verified, no code cutover.
This verifies media transport only, NOT decoded audio, playback stability or
simultaneous independent source-channel capacity.

The deployment has a /health readiness check on port 8888. Railway checks
this endpoint at deploy time; it does not continuously verify video delivery.
An operator can trigger an authenticated, rate-limited synthetic HLS test
from the Restream dashboard. Source-origin and code issuance feature flags
remain off until a strictly limited real-source canary is approved and tested.

Do not expose the private Edge publicly without per-subscriber authentication,
short-lived access and a bounded proxy. The Edge intentionally rejects any
live-* path when BLOFY_EDGE_READ_TOKEN is not configured.
