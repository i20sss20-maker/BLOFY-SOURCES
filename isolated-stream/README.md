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

## Operator control center (separate feature branch, NOT live)

The new read-only `GET /operator` dashboard runs inside this isolated API only after
`BLOFY_STREAM_ADMIN_TOKEN` is set to a random value **at least 32 characters long**.
Use browser HTTP Basic authentication: username `operator`, password the secret
configured in Railway. Keep this secret in Railway variables only, not in Git,
screenshots, query strings, URLs, or frontend local storage.

The dashboard offers:
- A simple Arabic RTL navigation inspired by a familiar admin control panel: home, sources, restream, library, subscribers and diagnostics. Unintegrated sections are explicitly marked as unavailable, not faked.
- Server API state and a live connectivity check of the private MediaMTX HLS listener (a MediaMTX 404 on `/` means only that the listener responded, **not** that an IPTV channel plays).
- Optional read-only counts of ready paths and HLS sessions from the fixed private MediaMTX Control API on port 9997. If its API is not available, counts remain unknown (`—`), rather than displaying a false zero.
- Latest **synthetic-only** HLS transport canary, never portrayed as verified real video/audio.
- A protected, rate-limited button to run the same synthetic canary as `POST /internal/smoke`.
- Clear labels stating that account migration and customer playback remain disabled.

This is phase 1, **not** the full re-stream management system. Source authorization,
per-channel FFmpeg lifecycle, MediaMTX Control API, adaptive recovery/failover,
session monitoring and real-content probe controls require independent design,
tests, authorization checks and rollout gates. No arbitrary upstream URLs or
operator-supplied shell commands should be accepted by this API.

Testing: `cd isolated-stream && npm test`. Merge/deploy only after tests
and authorization are verified. The source `blofy-stream-isolated-20261108`
remains unchanged by this feature branch.

### Current control limitations

- This is **not** an Xtream source manager, subscriber dashboard or live channel switcher yet. Those modules show clear integration gates and a link back to the existing authorized BLOFY PLAYER admin site.
- Control API metrics require MediaMTX to expose its API to the service over Railway's private network; with its default loopback-only API binding, counts show unknown. Do **not** expose port 9997 publicly or accept arbitrary upstream URLs.
- Only the synthetic smoke action is enabled. Actual server restarts and subscriber failover are intentionally not enabled without a media verification and rollback path.
- The repository is not copying Dispatcharr code or branding; it uses an original lightweight BLOFY UI and MediaMTX interface.

## Phase 2: genuine private MediaMTX control (isolated demo path)

The operator dashboard now supports **real** MediaMTX Control API operations:
- Read authenticated status of ready paths, HLS sessions, and the configured demo path.
- Create, remove or reinitialize a MediaMTX restream path named exactly `blofy-demo` using `POST /v3/config/paths/add/blofy-demo` and `DELETE /v3/config/paths/delete/blofy-demo`. This path pulls the existing private `rtsp://127.0.0.1:8554/smoke` source on demand. Smoke FFmpeg produces a synthetic video/audio channel; it does **not** fetch customer media.
- Verify a transport stream HLS segment for the `blofy-demo` path. The test **does not** assert decoding video/audio, or guarantee the availability of a provider's IPTV content.

### Private API authentication and deployment

Only the isolated `blofy-stream-media` service should have the MediaMTX API listening on its private port 9997. Never expose that port on a Railway public domain/TCP proxy.

Configure the media service through Railway **secret** environment variables:

- `MTX_API=true`
- `MTX_APIADDRESS=:9997`
- `MTX_AUTHINTERNALUSERS_2_USER=blofy-control`
- `MTX_AUTHINTERNALUSERS_2_PASS=<independent_random_40+_char_secret>`
- `MTX_AUTHINTERNALUSERS_2_PERMISSIONS_0_ACTION=api`

The existing default unprivileged and localhost users at indexes 0 and 1 remain untouched. Set matching secrets on the isolated `blofy-stream-api`:

- `BLOFY_STREAM_MEDIAMTX_CONTROL_USER=blofy-control`
- `BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD=<same_random_secret>`

The private Control API is additionally hard-coded to the media service's private DNS identity. No arbitrary endpoint, hostname, path, user-provided source URL or shell command can be sent to the MediaMTX API from the dashboard. Every mutation requires the operator's existing Basic auth credentials, a custom anti-CSRF header and a cooldown. The initial play path is **demo-only**.

### Not yet migrated

Production Xtream credentials, subscribers, activation, library, live streaming for customers, real provider playback verification and fallback sources remain on the original BLOFY PLAYER control plane. Do not copy those credentials to this project or switch public endpoints solely because the synthetic demo passed. A signed source-to-stream bridge and explicit provider authorization are required first.
