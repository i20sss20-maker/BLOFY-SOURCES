# BLOFY STREAM — independent Railway runtime (initial stage)

This is a dedicated *media-control canary* from the `BLOFY-SOURCES` repository, not the BLOFY PLAYER activation app.
Railway project: `BLOFY-STREAM`. The matching private MediaMTX service is `blofy-stream-media`.
It performs a **synthetic, on-demand-only HLS acceptance test** inside this Railway project.

- `GET /health`: process only. Explicitly states **no customer traffic** and **no Xtream user migration**.
- `GET /health/media`: latest synthetic smoke verdict, 503 until verified; no source URL.
- `POST /internal/smoke`: optional operator-only endpoint protected by a >=32-char `BLOFY_STREAM_ADMIN_TOKEN`; disabled without token.
- `BLOFY_STREAM_CANARY_ON_BOOT=1`: **one** synthetic test at startup; no continuous polling.
- `BLOFY_RESTREAM_ENGINE_URL=http://blofy-stream-media.railway.internal:8888` is the *only* permitted media host.
- No upstream IPTV credentials, existing customer database, payment, DNS, sessions, public stream URL, or user subscription are imported.

## Migration hard gates
1. Confirm existing BLOFY PLAYER `blofyplayer.com`, `api`, `updates` and all activations are healthy.
2. Implement a signed HTTPS cross-project bridge for account entitlements and short-lived stream grants (Railway private networks **do not cross projects**). Do **not** connect to the Player PostgreSQL via public TCP or copy its encryption key.
3. Confirm external source explicitly permits server-side redistribution; verify one real channel's decoded video and audio, plus movie Range and series. The existing source reset is not fixed by moving hosts.
4. Compare viewer sessions, login expiry/revocation, HLS variants/segments, bandwidth, first-frame time and 5xx for a limited canary.
5. Roll over independently to `stream.blofyplayer.com` after client validation, with reversible DNS, while keeping Player and updates domains intact.
6. Remove the old in-project restream engine only **after** the new media route is in production and rollback is proven.

Do not treat `synthetic_hls_ts_verified` as customer A/V success.

## BLOFY STREAM operator control center (real data, isolated media engine)

`GET /operator` serves the one-page Arabic administration. It is protected by
`BLOFY_STREAM_ADMIN_TOKEN` (HTTP Basic username `operator`, 32+ character
password configured in Railway). All UI requests are same-origin and carry no
secrets from the authoritative sources to the browser.

The portal in the **separate** BLOFY PLAYER Railway project remains the source
of truth for customers, accounts, source credentials and catalog records.
STREAM calls a pinned HTTPS origin with the shared
`BLOFY_STREAM_UNIFIED_BRIDGE_KEY` (40+ characters, configured only in Railway
variables of both projects). The authenticated interface supports:

- Real saved Xtream sources: listing, adding (with explicit redistribution
  rights confirmation), enabling, disabling, test, sync and media probe.
- Real saved catalog: channel/movie/series search and indexed episode map.
- Existing Xtream gateway accounts: list, create, enable and disable; account
  proofs, encryption keys and subscriber database remain in PLAYER.
- Real recorded provider-404 recovery registry statistics, explicitly NOT a
  guarantee that every untested catalog row plays.

### Real live restream operation

From **إعادة البث** select a registered source and an enabled channel, and
affirm the right to retransmit it. The STREAM backend resolves the Xtream URL
using the authenticated PLAYER bridge and holds it **in memory only**.
No raw Xtream URL, username or password reaches the operator browser or a
MediaMTX command line.

For authorized MPEG-TS channels, STREAM registers a random
`live-<12 lowercase hexadecimal>` path in the private MediaMTX API.
MediaMTX's FFmpeg-enabled image publishes the selected video/audio from
`/internal/live-feed/<48 hex>` to a private RTSP path **on demand**.
Only 3 operator paths may be configured at a time. HLS playback is proxied
through authenticated `/operator/api/live/<path>/...`; the private MediaMTX
port is never exposed on Railway's public domain.

Operators may optionally choose a separately authorized, matching backup
channel. The supervisor switches to that backup when a primary HTTP connection
fails, and attempts restart after early disconnect. Without an explicitly
selected matching channel there is **no automatic substitute**. Worker
restarts and 20-minute idle cleanup conserve egress resources. Boot recovery
removes orphaned live paths after an API-service restart.

### Movie and episode previews

Library movie entries resolve their original file through the same
authenticated, rights-confirmed bridge. Series episodes are selected from
the indexed episode map. A temporary operator-only opaque URL streams MP4,
TS, MKV or other allowlisted media via the STREAM API, including Range requests.
One initial 404/416 caused by `Range: bytes=0-...` is retried **once**
without Range, never used to bypass an actual 403 authorization rejection.
Browsers do not support every codec: MKV, AVI and TS playback may require
a compatible player even if their media bytes transfer correctly.

### Important limitations and rollout gates

- **Customer playback routes, subscriptions, activation and applications are
  not migrated.** Do not turn the operator HLS preview endpoint into a public
  subscriber URL: it uses an operator-only Basic authentication boundary.
- Provider HTTP 404, expired accounts, IP restrictions and files missing at the
  source cannot be repaired by re-streaming. Failed routes remain errors.
- A successful first media segment proves transport, **not** full decoded audio
  and video. Verify playback in the intended client before any customer rollout.
- Per-channel fallback is optional and must be mapped to the SAME broadcast by
  an operator. No cross-source title guessing or silent channel replacement.
- The engine limits concurrent operator preview paths; capacity planning,
  concurrent subscriber session authorization, per-segment HLS credentials,
  bandwidth measurement, full-library media validation and distributed worker
  persistence are prerequisites for a public cutover.

### Private MediaMTX authentication

`blofy-stream-media` runs `bluenviron/mediamtx:1.19.2-ffmpeg` with API
restricted to Railway's private network and:
`MTX_API=true`, `MTX_APIADDRESS=:9997`,
`MTX_AUTHINTERNALUSERS_2_USER=blofy-control`,
`MTX_AUTHINTERNALUSERS_2_PERMISSIONS_0_ACTION=api`,
and a long secret `MTX_AUTHINTERNALUSERS_2_PASS`.
The STREAM API uses matching
`BLOFY_STREAM_MEDIAMTX_CONTROL_USER` and
`BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD` variables.
Never expose 9997 or 8888 publicly; NEVER put source credentials in Git,
URLs shown to customers, logs or client JavaScript.

Tests: `cd isolated-stream && npm test`. The Docker build runs tests,
and GitHub Actions tests should be green before any deployment.

 
## 2026-11-10 research: safe TS EOF recovery canary (operator only)

The on-demand MediaMTX process logs showed FFmpeg starting and repeatedly
exiting with status 0. This alone is not a codec or source diagnosis. FFmpeg's
official HTTP protocol docs distinguish ordinary `reconnect` from
`reconnect_at_eof`, which treats normal HTTP EOF like a recoverable live
stream discontinuity. In an isolated local experiment (valid H264/AAC TS,
HTTP responses containing an exact Content-Length), the old FFmpeg flags
made ONE upstream GET and stopped at four seconds. Adding
`-reconnect_at_eof 1` made THREE sequential GETs and continued past nine
seconds. This is *synthetic transport proof*, not real Xtream A/V verification.

The operator-only flag `BLOFY_STREAM_HLS_EOF_RECONNECT_EXPERIMENT=1`
enables additional FFmpeg options when a new operator HLS path is created:

- `-reconnect_at_eof 1` (recover clean EOF);
- `-reconnect_on_network_error 1`, selective `500,502,503,504` retries;
- `-reconnect_max_retries 3`, total reconnect delay 12s;
- never automatically retry 401/403/404/456 or bypass source rights.

The flag defaults OFF. It affects ONLY operator-managed new MediaMTX
`runOnDemand` HLS paths; it neither enables shared-live customer cutover nor
changes any BLOFY PLAYER subscriber route. Set it in Railway only after
testing in an isolated preview. Verify codec compatibility, TS packet
continuity, real HLS segments, and decoded audio/video on a real authorized
channel before canary approval. Never set this feature across all subscribers.

Official references:
- https://ffmpeg.org/ffmpeg-protocols.html
- https://mediamtx.org/docs/features/on-demand-publishing
- https://mediamtx.org/docs/features/control-api
- https://github.com/datarhei/core (process watchdog, telemetry and quotas)
- https://github.com/AlexxIT/go2rtc (multi-reader architecture and security)


## 2026-11-10: licensed shared-live acceptance gates (source `saleh`)

Production subscriber traffic remains on its established path. The source-wide
sharing switch MUST NOT be enabled directly for all customers. The activation
service has an independent double-gated pilot requiring **both** a specific
authorized subscription account ID **and** a specific numeric gateway channel
ID. This prevents the previous 502/503 incident from reaching every viewer.

The STREAM control API now contains a private readiness controller:

- `GET /operator/api/shared-live/status` is HTTP Basic protected, reports
  the latest source readiness verdict, and never returns Xtream credentials,
  provider URLs or subscriber identity.
- `POST /operator/api/shared-live/probe` requires Basic authentication,
  the anti-CSRF operator action header and explicit rebroadcast consent.
  It opens at most one authorized upstream source and exactly two local
  viewers using the production transport engine for up to 26 seconds.
- Manual and automated probes share a single in-process lock and a minimum
  one-minute cooldown; a flood does not create dozens of upstream requests.
- `BLOFY_STREAM_SHARED_REAL_SOURCE_PROBE_ON_BOOT=1` runs only ONE
  source-scoped acceptance test on service startup, after a 20s delay.
  It resolves exactly one enabled/published source named `saleh` and
  exactly one catalog channel prefixed `4K: V SPORT`. Ambiguous or
  missing matches are **not guessed**: the test is skipped, logged as
  a sanitized reason and must be selected manually in the operator UI.
- Real probe reports are transport-level TS proof only, not full decoded
  picture/audio and not a successful 100-person public rollout.

Safe rollout decision tree:
1. Capture a 26-second real-source readiness sample: two readers, one source,
   no 403/456, no 5-second stall, no unbounded reconnect loop.
2. Validate actual decoded audio and video on a compatible 4K client, and
   check the HLS segment probe reaches a **final** success (not merely 202).
3. Activate one named channel for at most two already-authorized test
   accounts via the separate activation canary environment variables.
   Compare customer error rate and live channel continuity for 5-10 mins.
4. Test 10 then 50 then 100 viewers and measure outbound bit rate,
   provider connection count, CPU and RAM. At 12 Mbit/s a channel
   watched by 100 viewers requires roughly 1.2 Gbit/s outbound,
   excluding protocol overhead; reducing source connections does not
   reduce outbound viewer bandwidth.
5. Preserve the existing rollback flag for subscriber sharing. Stop on
   repeated real-provider 5xx or a failed final HLS playback check.

If the auto test reports `pilot_channel_ambiguous`, do NOT disable this
safety condition or guess a channel from search results. Use the operator
channel picker for an explicitly selected broadcast.
