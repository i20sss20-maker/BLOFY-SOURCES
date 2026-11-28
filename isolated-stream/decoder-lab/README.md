# BLOFY decoder lab — standalone synthetic FFmpeg verification

## Purpose
This is a separate Railway **test-project** worker for real FFmpeg audio and video decoding.
Its inputs come solely from FFmpeg's local `testsrc2` and `sine` generators, not Xtream, BLOFY customer media, arbitrary URLs, uploaded files, credentials, or network sources.

The worker generates a 1.4-second MPEG-TS sample with **MPEG-2 video** and **MP2 audio**, probes the resulting streams via FFprobe, then decodes each stream separately with FFmpeg framecrc and confirms at least two decoded frames each. A successful result demonstrates that the **lab container** can decode both media types. It does NOT establish codec compatibility with Android 9, E-AC3/AAC sources, Windows, customer streaming, audio loudness, or video playback from real sources.

## Deployment and resource safety
- GitHub repository `i20sss20-maker/BLOFY-SOURCES`; Railway root directory: `/isolated-stream/decoder-lab`.
- Dockerfile: `node:22-alpine` plus Alpine `ffmpeg` / `ffprobe`, runs unit tests and real decode smoke during container build, uses non-root `node` user.
- Configure two independently random **>=40-character** lab secrets before deployment: `BLOFY_DECODER_LAB_TOKEN` for explicit synthetic reruns **only on lab**, and `BLOFY_DECODER_LAB_VIEW_TOKEN` for read-only report access. The latter is also configured on the BLOFY STREAM API service for server-to-server reading; neither key is ever returned to browsers.
- Set resource limits no higher than 0.5 vCPU / 0.5 GB RAM for the pilot, with just one replica, healthcheck `/health` and restart-on-failure.
- No mounted volume is necessary: generated transport files are restricted to a fresh `/tmp/blofy-decoder-*/synthetic.ts` directory, have a 2 MB cap and are deleted after each probe.
- Each FFmpeg/FFprobe invocation is given a 18 s timeout, max 32 KiB output and `-threads 1` (decoder).
- One synthetic run on boot. Additional manually requested run limited to one every **15 minutes**, one in-flight only.

## Endpoints
- `GET /health` public, minimal, returns 200 only when the synthetic test passed and the lab secret is configured, otherwise 503. No sensitive information.
- `GET /api/report` needs `Authorization: Bearer <BLOFY_DECODER_LAB_VIEW_TOKEN>`; returns a synthetic-only result. The run token cannot access this endpoint.
- `POST /api/synthetic-run` needs the **different** `<BLOFY_DECODER_LAB_TOKEN>` Bearer header and an **empty body**. The view token cannot trigger work. No URL, file, stream ID, codec or media selection is accepted. Returns 202 on start, 409 if already running, 429 on cooldown.
- All other routes return 404 or 401; no CORS, uploads, data writes, source discovery or public customer access.

## Checks
```sh
cd isolated-stream/decoder-lab
node --test test/*.test.mjs
docker build -t blofy-decoder-synthetic-ci .
```
Docker image build must fail if either synthetic audio or video cannot actually decode.

After deployment: inspect Railway health, status and logs; verify `/health` = 200, `/api/report` without Bearer = 401. The worker runs with no access to Xtream secrets and no provider requests.

## Next gates
1. Read-only authenticated summary of the sandbox worker from the existing `blofyplayer.com/admin/control-center#diagnostics` page (never proxy private tokens to a browser).
2. Prepare durable scrubbed-result storage *in the lab*, then verify retention and access policy.
3. Test a **locally supplied, individually authorized sample** through a separate controlled file-ingestion path, not arbitrary stream URLs. Apply format, byte, time and CPU limits.
4. Compare verified codec results to Android 9 and Windows playback separately before proposing any player codec fallback or transcode.
5. Only after step 4, pilot an opt-in source check with proven licensed rights and connection quotas; no automatic mass scanning or playback routing changes.

## Rollback
Stop/delete only Railway lab service `blofy-decoder-lab`. No commits from this branch affect BLOFY STREAM production unless intentionally merged and separately deployed; the lab has no dependence on customer routes or session codes.

## Same-domain read-only status in BLOFY

The original BLOFY STREAM operator dashboard now provides `GET /operator/api/media-scan/decoder-lab`, behind its existing owner Basic authentication (or signed BLOFY website admin cookie through the proxy). It calls a **fixed** HTTPS lab report endpoint using a **view-only** token at the STREAM backend, caches for 45 seconds, strips unknown fields and source details, and displays synthetic codec/frame results at `https://blofyplayer.com/admin/control-center#diagnostics`.

No browser sees either token. The operator page **cannot** start or repeat FFmpeg runs. A production channel remains unverified, even after a green synthetic result. A stale lab result or missing lab connection appears as unknown, not green.

## Synthetic codec compatibility matrix

On boot the isolated lab additionally generates short audio-only MPEG-TS fixtures for **AAC, AC3, and E-AC3**, then checks each with FFprobe and actually decodes its audio into frame CRC output using FFmpeg. The original **MP2 + MPEG-2 video** synthetic decode remains required. Each generated fixture stays inside a unique temporary directory, is limited to 900 KiB, and is deleted. Each FFmpeg call is limited to 15 seconds, one thread and bounded output. The new tests run **sequentially**.

The dashboard reports codec-by-codec results only when the server-side lab has proved them; it never exposes the two lab credentials. **This proves decoding inside an FFmpeg Alpine test container, not support in the BLOFY Android app.** No source URL is supplied and no production IPTV channels are tested.

## Authorized short MPEG-TS sample (manual, opt-in)

The next diagnostic step lets the owner manually choose one licensed, short **.ts MPEG-TS file** from the original BLOFY admin dashboard (#diagnostics). No Xtream URL, M3U playlist, stream URL, remote file path, or provider credentials are accepted.

- Browser: existing signed BLOFY admin session, same-origin POST, and explicit checkbox confirming rights. No automatic source capture or catalog sweep.
- Website reverse proxy: only the owner-sample API receives up to **2,000,000 bytes**. Other admin endpoints remain limited to 64 KiB.
- STREAM server: validates authenticated operator, distinct action/rights headers, MIME and Content-Length, 90-second cooldown; then forwards bytes to one fixed HTTPS lab origin with a dedicated server-only secret.
- Lab: third token BLOFY_DECODER_LAB_SAMPLE_TOKEN distinct from synthetic-run and read-only tokens; strict MPEG-TS synchronization, exact length, one upload at a time and 60-second cooldown.
- Decode: one temporary local sample.ts file, FFprobe for audio/video stream presence and codec, separate FFmpeg framecrc decodes, max 8 frames each. Temp directory deleted even on error. No source URLs or raw media in responses or logs.
- Results: sample stream presence, codec, frame counts, and sanitized diagnostic code only. An absent audio track in a *short sample* is not proof the entire channel is silent, and FFmpeg success does not prove sound output on Android 9.
- Verification: unit tests of auth/limits, invalid files, bounded reads, safe argv and delete-on-error. Docker CI decodes an actual locally generated MPEG-TS file. No customer app or subscriber playback changes.
- Rollback: pin lab and STREAM to the prior Railway commits; do not alter customer routes.

**Only upload a sample you have permission to inspect.** Do not include passwords, playlist URLs, private customer information or login tokens. A real channel issue requires comparing the same authorized sample between Windows and Android 9 after the lab reports its codec.

Configure the new, dedicated BLOFY_DECODER_LAB_SAMPLE_TOKEN identically on the isolated Railway decoder-lab service and the STREAM API. Neither should ever be shown to the browser.
