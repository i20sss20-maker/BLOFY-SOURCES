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
- Server API state and a live connectivity check of the private MediaMTX HLS listener (a MediaMTX 404 on `/` means only that the listener responded, **not** that an IPTV channel plays).
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
