# BLOFY STREAM — operator-only active HLS probe queue (pilot)

Date: 2026-11-17

## Scope

Under the existing **BLOFY STREAM > الفحص والصيانة** page, the new manual *طابور فحص HLS للمسارات النشطة* validates HLS transport for up to two already-created **active operator restream paths** sequentially. It reuses `createLiveRestreamSupervisor.probe()`; it never accepts a source URL, opens an arbitrary Xtream channel, issues a subscription code, or changes customer traffic. There is no automatic scheduling.

- GET `/operator/api/media-scan/queue`: inspect eligible current paths and most recent in-process result.
- POST `/operator/api/media-scan/queue/start`: requires original operator authentication, `x-blofy-operator-action: media-scan-start`, and JSON `{"paths":["live-..."],"rightsConfirmed":true,"capacityAcknowledged":true}`.
- POST `/operator/api/media-scan/queue/cancel`: requires `x-blofy-operator-action: media-scan-cancel` and JSON `{}`. Cancels future paths only; an in-flight HLS request is not interrupted.
- Max **2 paths per manual request**, **1 in-flight probe**, **90 seconds between queue starts**. A path must have `connections===1`, not be probe-pending, and already exist in the in-process supervisor.
- HLS probe can take up to ~54 seconds per path (54 seconds across 27 polls), so two items can take about two minutes. Responses for POST start are immediate 202; frontend polls the status endpoint.
- Job status is **in-memory only**. It is not durable across Railway deploys, nor is it a source-wide/catalog scan.
- Results include HLS transport first media bytes and metadata from the existing bounded MPEG-TS PAT/PMT inspector (codecs, observed packets). **No decoding occurs**; codec presence does not mean the sound is audible or the picture renders on Windows/Android 9.
- A MediaMTX on-demand source may attempt reconnection after the original active feed drops during the test. That is why both rights and source-capacity acknowledgements are required; no guarantees of zero provider requests are made.
- No new automatic retry, failover, FFmpeg audio transcode or customer stream reroute is performed.

## Verification

Run `cd isolated-stream && npm test`. Tests verify consent, live-path-only selection, concurrency, cooldown, real callback completion, cancellation, unavailable data and sanitization.

On the production site: `https://blofyplayer.com/admin/control-center#diagnostics`, enter with the regular BLOFY admin session, open the *طابور فحص HLS للمسارات النشطة* panel. Without a current operator path with an active source connection, the candidate list must be empty and POST run must reject.

Do not enable a recurring scan, bulk catalog sweep or automatic retries without verifying provider connection allowances, licensed content rights, resource budgets, and a rollback plan. The current code is an intentionally guarded pilot.

## Rollback

Repoint Railway **blofy-stream-api** service to the prior pinned commit. The BLOFY website itself, subscriber Xtream routes, codes, and the independent original Railway admin URL are unaffected.

## Evidence-based diagnostics and exports (2026-11-17)

The operator dashboard now explains sample-level audio/video anomalies without pretending that an FFmpeg decoder ran:

- MPEG-TS PMT absent or incomplete => **unknown**, never a healthy result.
- PMT declares no audio => **review source audio program** (not conclusive proof the full channel has no audio).
- Sufficient TS packets sampled with audio/video payload missing => **review sampling and transport**.
- TS continuity gaps => **review network/transport**; gaps alone do not prove playback failure.
- E-AC3/AC3/DTS/TrueHD/AAC-LATM => **review Android 9 vs Windows decoder support**, not automatic transcoding.
- Valid transport + observed audio/video packets => **observed sample only**; decoded sound and image remain unverified.

Last five in-process scan jobs are summarized separately from total source channel count. The UI can download sanitized JSON and CSV with the operator path identifier, status and rationale; it excludes source URLs, subscriber credentials, playback tickets and original media. Spreadsheet formula-like cell contents are escaped on CSV export. The server does **not** store durable audit history yet; exporting copies onto the administrator's computer is the current operational safeguard.

Next gate: a separate sandboxed decode worker (ffprobe/FFmpeg), explicit per-sample rights, CPU/memory/time limits, and synthetic-file performance tests before it is allowed to process even a licensed live sample. Never install an uncontrolled decoding process directly into the customer playback path.
