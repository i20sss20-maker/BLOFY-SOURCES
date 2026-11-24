# LIVE production safety gate — November 25, 2026

## Current customer baseline
- User-confirmed: live playback is currently working; movies/series have been working well.
- Railway `BLOFY-STREAM` / `blofy-stream-api` was restored from a crash loop onto successful deployment `dda6059c-5554-45c3-971e-5cd5d3eb84fe` (code revision `be7240e`).
- Do **not** merge a draft change just because tests pass. In particular, **do not** redeploy the current failed source-release watchdog code containing `process.exit(76)`.

## Guardrails before any production rollout
1. Confirm last known good deployment is still live and note its rollback ID.
2. Confirm authorized LIVE channel continuity on Safari and Chrome with a >20-minute session, using actual video and audio decoded rather than synthetic byte-only verification.
3. Confirm source entitlement and provider connection limits. Never force-clear a pending source release or start a second upstream feed under a one-feed license.
4. Verify a forced upstream EOF and a cancellation that refuses to settle: one channel should be quarantined without terminating the API or breaking other LIVE channels.
5. Verify no changes to VOD/movie/series routes, code extraction, account/auth, orders, or provider credentials.
6. For an incident, inspect Railway replica status and sanitized `BLOFY_STREAM_SHARED_LIVE_EVENT`, `BLOFY_STREAM_LICENSED_SOURCE_RELEASE_RECOVERY`, handoff 503 counters; exclude internet-scanner 404/502 noise.
7. Roll out narrowly only after all above pass. Stop rollout and restore `dda6059c-5554-45c3-971e-5cd5d3eb84fe` if replica crashes, a new 503 burst appears in LIVE routes, or channel continuity regresses.

## Limits of this PR
The proposed branch keeps the API alive if the licensed provider's `reader.cancel()` hangs, but a quarantined channel will stay unavailable until upstream socket release is **actually** confirmed or a controlled operator recovery occurs. This is not a fix for every live source EOF, browser codec mismatch, or unplayable stream. The native apps and working VOD playback are out of scope.
