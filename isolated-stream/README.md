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
