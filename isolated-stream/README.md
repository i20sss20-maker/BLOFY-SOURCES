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
