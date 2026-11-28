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
| 11 | Multi-user scaling | 10/50 and now 100 synthetic fanout viewer tests | 250/500 production staged load profile, real upstream limits, bandwidth and resource headroom |
| 12 | Control Center | Existing operator UI, source/code/account workflows | Verify all admin actions end-to-end with an owner test account |
| 13 | Full diagnostics | 24 read-only metrics, ordered safe suggestions, selected series map | Test against real, explicitly permitted content and compare with client logs |
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

## Incremental delivery: passive audio, AAC trial, 250 simulated viewers and release verification

- **Audio transport observations:** `ts-audio-inspector.mjs` now reads bounded MPEG-TS PAT/PMT metadata from an **existing** licensed TS feed. It differentiates no audio PID observed, a declared AAC/AC3/etc. audio track, and a stream whose PSI was not observed. It **does not** decode audio or alter stream bytes. Both operator HLS publisher and licensed shared-fanout expose temporary safe track signals.
- **Audio conversion QA:** New operator-only `audioMode='aac'` option transforms existing audio to stereo AAC with FFmpeg while copying video unchanged. It requires explicit confirmation, allows a single transcode path, and refuses conflicting extra licensed source connections. Default remains `copy`, and **subscriber routes are not changed**. This is not proof of audibility on Android TV.
- **Capacity:** The isolated TS harness now covers **250 simultaneous synthetic viewers across two separate feeds with exactly two provider GETs**, plus **500 viewers across four separate feeds using exactly four provider GETs**. This verifies sharing behavior, not production-provider capacity nor 250 independent Xtream accounts.
- **Update metadata:** Fixed, authenticated STREAM release manifest inspection verifies version, package, SHA-format and URL consistency but explicitly reports that APK bytes, signature and installed version remain unverified.
- **Android QA only:** An independent branch `feature/stream-nextgen-supported-audio-recovery-qa-20261112` based on STREAM 55.8.13 owner QA contains a single-track auto-selection recovery when Media3 declares a supported track but has not selected any. It does not override an explicit mute, restart the player, or bypass authentication. **No production APK was signed, uploaded or published from this change**. Its unit-test/compile workflow was added but full device acceptance is not demonstrated here.
- **Quality gate:** Real devices must confirm playback and audio on Android 9, Android TV, and Windows; FFmpeg stereo AAC must be evaluated for source authorization, CPU overhead and actual MediaMTX behavior before any subscriber-facing use.

**Status:** The admin/backend improvements have passed automated build gates and health checks. Audio codec observability and synthetic concurrency are implemented; client audio success, real-provider scalability, backup restore and signed device updates remain open acceptance criteria.

## Comprehensive same-turn continuation — current status

**New safe operational features**
- `GET /operator/api/support-bundle` exports a redacted, allowlisted diagnostic report (24 checks), avoiding provider URLs, device IDs, customer phones, media titles and auth tokens. The operator UI offers **تصدير تقرير الدعم**.
- Full audit now includes `sourceCapacity`, showing the SOURCE Xtream account's actual reported max/active connections and permission state when available. This is independent of the BLOFY code's advertised connection setting and is **not** proof of high-capacity service.
- 500 simulated TS viewers successfully fan out over four distinct synthetic channels in an isolated build test without 500 provider GETs. Do not interpret this as 500 licensed real-user streams on production.
- Android guarded audio-track recovery lives in draft pull request #571 from a private 55.8.13 QA branch; **not merged, signed or published**. It must compile and pass real Android 9/TV device QA first.
- A new script `ops/nextgen-restore-smoke.sh` and isolated PostgreSQL 16 GitHub Actions job test dump/restore/FK integrity using **fake records only**. This is tooling preparation, not evidence of a production backup or Railway volume restore.
- The live download manifest still points at **55.8.12**. GitHub release asset metadata for the published owner QA APK reports the expected **135509813-byte** size and SHA-256 digest matching the manifest; this is provenance corroboration, **not** verification of bytes installed on a TV or a replacement for APK signing verification.
- The operator diagnostic remains read-only by default. Optional FFmpeg AAC conversion is explicitly restricted to an operator QA path. Normal customer playback and their codes are preserved.

**Still NOT complete:** Real-world audio success on affected Android 9 devices, Windows app parity/build tests, a validated Railway Postgres restore of customer data, source-provider-signed capacity entitlement for multiple simultaneous channel streams, independently measured production QoE and installation of a verified 55.8.13+ signed APK.

## Signed website APK verification evidence (actual asset, not metadata alone)

GitHub Actions workflow **BLOFY STREAM - verify actual published owner APK**, run `43190948013`, completed with **SUCCESS** on November 12, 2026.

It downloaded the existing GitHub Release asset `BLOFY-STREAM-55.8.12-FFMPEG-OWNER-SIGNED.apk` and verified:
- Actual binary size **135509813 bytes** and actual SHA-256 **91655f8953aaf621ede08ab248995ecc8d42bc7571b444a6f36355cd09376573**, matching the independent release manifest.
- Android APK Signature Scheme v2 verification using `apksigner` and the pinned owner signing certificate fingerprint.
- Actual APK package `tv.blofy.player.v2.stream`, versionCode `2000089`, versionName `2.0.0-rc07.55.8.12-STREAM`, 16-KiB zip alignment and FFmpeg decoder JNI presence.

**Important:** This verifies the *published 55.8.12 APK bytes* and certificate, not any particular customer's installed APK, and does not say that 55.8.13 has been signed or that Android TV 9 audio is functioning.
