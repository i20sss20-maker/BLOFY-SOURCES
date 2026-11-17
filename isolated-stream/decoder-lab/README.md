# BLOFY decoder lab — standalone synthetic FFmpeg verification

## Purpose
This is a separate Railway **test-project** worker for real FFmpeg audio and video decoding.
Its inputs come solely from FFmpeg's local `testsrc2` and `sine` generators, not Xtream, BLOFY customer media, arbitrary URLs, uploaded files, credentials, or network sources.

The worker generates a 1.4-second MPEG-TS sample with **MPEG-2 video** and **MP2 audio**, probes the resulting streams via FFprobe, then decodes each stream separately with FFmpeg framecrc and confirms at least two decoded frames each. A successful result demonstrates that the **lab container** can decode both media types. It does NOT establish codec compatibility with Android 9, E-AC3/AAC sources, Windows, customer streaming, audio loudness, or video playback from real sources.

## Deployment and resource safety
- GitHub repository `i20sss20-maker/BLOFY-SOURCES`; Railway root directory: `/isolated-stream/decoder-lab`.
- Dockerfile: `node:22-alpine` plus Alpine `ffmpeg` / `ffprobe`, runs unit tests and real decode smoke during container build, uses non-root `node` user.
- Configure `BLOFY_DECODER_LAB_TOKEN` with a randomly generated **>=40-character** secret on the lab service **before deployment**. Never commit this secret or send it to the browser.
- Set resource limits no higher than 0.5 vCPU / 0.5 GB RAM for the pilot, with just one replica, healthcheck `/health` and restart-on-failure.
- No mounted volume is necessary: generated transport files are restricted to a fresh `/tmp/blofy-decoder-*/synthetic.ts` directory, have a 2 MB cap and are deleted after each probe.
- Each FFmpeg/FFprobe invocation is given a 18 s timeout, max 32 KiB output and `-threads 1` (decoder).
- One synthetic run on boot. Additional manually requested run limited to one every **15 minutes**, one in-flight only.

## Endpoints
- `GET /health` public, minimal, returns 200 only when the synthetic test passed and the lab secret is configured, otherwise 503. No sensitive information.
- `GET /api/report` needs `Authorization: Bearer <BLOFY_DECODER_LAB_TOKEN>`; returns detailed synthetic-only result.
- `POST /api/synthetic-run` needs the same header and an **empty body**. No URL, file, stream ID, codec or media selection is accepted. Returns 202 on start, 409 if already running, 429 on cooldown.
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
