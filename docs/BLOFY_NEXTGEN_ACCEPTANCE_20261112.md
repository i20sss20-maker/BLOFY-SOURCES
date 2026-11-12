# BLOFY STREAM NextGen — 18 systems, acceptance gates

Date: 2026-11-12 (Asia/Riyadh). This tracker describes **verified code and remaining acceptance**, not a claim that all eighteen upgrades have shipped. Production release remains separate from owner device verification.

## Safety rules

1. Keep the actual licensed Xtream source, current customer accounts, codes, expiration dates, device bindings and working playback routes intact.
2. Probe only explicitly authorized source content; default system audit **must not** fetch media bytes or change customer traffic.
3. Do not retry provider 401, 403, 456, authentication expiration or declared connection-limit failures as if they were transient network errors.
4. Never show "healthy playback" solely because HTTP, catalog, relay ticket, or MediaMTX returned a response.
5. Android APK updates require verified package name, signing lineage, version code, SHA-256, real device smoke tests and a rollback plan.
6. Observe at least one successful backup **restore in an isolated environment** before calling disaster recovery ready.
7. Run capacity tests in the synthetic test harness first, then staged load with provider-approved capacity. Do not test 250+ viewers against a production provider without explicit entitlement.

| # | System | Evidence already present | Still required for completion |
|---|---|---|---|
| 01 | Smart playback engine | Android Media3/FFmpeg modules exist in PLAYER repo | Compare actual signed STREAM APK and Windows build on TS/M3U8/MP4/MKV devices |
| 02 | Audio compatibility | Media metrics now distinguish transport status | Obtain Android TV 9 and modern-device audio codec logs; verify fallback only for unsupported audio |
| 03 | Live stability | Live-fanout has bounded retries, backpressure and source cooldown | 24-hour authorized live playback trial with reconnect/rebuffer rate |
| 04 | Multi-season series | Series normalization/regression tests and read-only episode map inspector | Source-by-source episode playback sample and full season count |
| 05 | Movie compatibility | Provider 404 registry + read-only error and start telemetry | Signed player range/plain/codec playback QA on real movie sources |
| 06 | Xtream connection manager | Fixed-peer HTTPS bridge, bounded timeouts, denial classification | Measure P50/P95 network latency under normal permitted load |
| 07 | Source Guard | Per-source failure/cooldown and bounded operator checks | Validate configured source capacity against actual provider entitlements |
| 08 | Incremental library | Revisioned catalog, sync queue, snapshot and guard modules | Reconcile before/after counts across full catalog without data loss |
| 09 | AI library | Human-approved title/category suggestions and rollback journal | Review sample accuracy and explicit rollback in staging |
| 10 | Restream engine | MediaMTX, licensed TS fanout and HLS operator monitor | Verify independent stream sessions, audio tracks and end-client decoding |
| 11 | Multi-user scaling | 10/50 and now 100 synthetic fanout viewer tests | 250/500 staged load profile, real upstream limits, bandwidth and resource headroom |
| 12 | Control Center | Existing operator UI, source/code/account workflows | Verify all admin actions end-to-end with an owner test account |
| 13 | Full diagnostics | 23 read-only metrics, ordered safe suggestions, selected series map | Test against real, explicitly permitted content and compare with client logs |
| 14 | Speed Boost | Start P95 and per-kind failure telemetry exposed | Baseline and optimize startup, catalog sync and UI latency, then compare |
| 15 | Subscriptions | Renewal, same-code relogin and protected device-binding systems | Live controlled test of renewal/no-double-charge and one-time transfer |
| 16 | Security and recovery | Authentication throttles, source secrecy, activity history | Document production backups and perform isolated restore exercise |
| 17 | Android TV/Windows compatibility | Existing Android media backend and update checks | Test Android 9, Google TV, phones, Windows; verify remote focus and subtitles |
| 18 | Auto update center | Dedicated signed STREAM release manifest and download service | Verify exact signed package, update progress/resume and rollback on end devices |

## New operator-only endpoints

- `GET /operator/api/full-audit` (optional allowlisted `sourceId`): read-only combined report, confidence status `ok/warning/unknown`, no media bytes.
- `GET /internal/blofy-stream/media-quality`: fixed trusted bridge, aggregate live/movie/series startup/failure data; never exposes upstream credentials, device tokens or media IDs.
- `GET /operator/api/episodes?sourceId=...&seriesId=...`: read-only first 120 local mapped episodes, explicitly **not** playback proof.

## Release criteria

- Tests and health checks green on both STREAM API and Activation.
- No unexpected increases in 5xx or provider transport retries.
- Source rights/capacity confirmed and existing accounts preserved.
- Windows + Android signed builds tested on devices before end-user distribution.
- Only then mark features #01/#02/#04/#05/#11/#17/#18 complete.
