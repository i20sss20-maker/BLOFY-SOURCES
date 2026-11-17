# Passive sample from an active BLOFY operator feed

This pilot adds a **manual-only** capture button to the existing BLOFY CONTROL CENTER at `/admin/control-center#diagnostics`. It complements the owner-uploaded TS file route, not replacing it.

### How it works
The operator first opens an **authorized** channel using the pre-existing operator Live preview. The user explicitly chooses that currently active private `live-<12hex>` path and confirms the right to inspect the content. `POST /operator/api/media-scan/passive-sample` (existing owner Basic/same-origin proxy auth plus `x-blofy-operator-action: media-scan-passive-sample`) takes `{"path":"live-...","rightsConfirmed":true}` only. No URLs or credentials accepted.

The STREAM supervisor rejects inactive paths (must have exactly one existing publisher connection), pending probe, missing rights, invalid ID, or simultaneous captures. The new recorder copies **only** MPEG-TS bytes already passing through `streamFeed` to the existing MediaMTX publisher. It does not call the upstream provider, use HLS `GET`, start a stream, invoke MediaMTX `runOnDemand`, or request more upstream sessions. No customer routes are changed. It bounds a single capture to **1,128,000 bytes (6000 TS packets)**, **18 seconds**, and one per **90 seconds**. An aligned partial sample can be used when at least 60,160 bytes (320 packets) were observed; the result is explicitly marked partial.

The recorder assembles only validated 188-byte TS packets, guards sync alignment on chunk boundaries, and ties the request to the active feed session generation. Stop/disconnect/rotation cancels the request, never samples across publisher sessions. The existing STREAM `ownerSampleBridge` then submits the packet-aligned in-memory buffer to the isolated FFmpeg lab, which deletes its temporary file after parsing/decoding. The STREAM buffer is overwritten with zeroes when the lab request ends. Neither source URLs nor file media bytes are sent to the browser or logs.

### Scope and limits

- Only works while the operator's private publisher is **already active** and carrying TS bytes; it does not wake an idle path.
- Diagnostic outcome is for a **bounded sample of input TS**. It does not prove Android 9 / Windows decoding, picture rendering, audible sound, whole-channel reliability, or legal rights to content.
- The internal media publisher may already maintain an upstream connection for preview, but *this capture operation* initiates none.
- The initial test uses local synthetic transport fixtures. No real provider sample is collected or played during code rollout.
- Existing separate `/operator/api/media-scan/owner-sample` direct upload remains available when no operator feed is active.
- Existing viewer codes, Xtream source configurations, billing, subscriber routing, and mobile apps remain unchanged.

### Verification
`cd isolated-stream && npm test`. Regression tests require an active publisher, verify no extra upstream or HLS fetch while capturing, exercise packet sync/misalignment, feed generation isolation, cooldown, cancel-on-end, timeouts, rights/auth and UI controls. The existing FFmpeg lab tests and Docker smoke are also CI-gated.

### Rollback
Repoint **only** `blofy-stream-api` to the previous pinned Railway commit. No site proxy change is required because the new action is a small JSON POST on an existing protected route. The decoder lab and the BLOFY website remain unchanged.
