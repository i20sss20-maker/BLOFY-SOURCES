# BLOFY Smart Playback Health — operator-only rollout

Smart Playback Health combines the existing production **Cross-Service Diagnostics** measurements without opening a media source, transcoding audio, switching a channel, changing an account, or raising provider concurrency.

## Functions

- **Deterministic incident triage**: 20+ explicitly allowlisted observed event codes mapped to likely subsystem, fixed Arabic interpretation, severity and manual next diagnostic step. Classifies source refusal/429, transient source transport, MediaMTX Control, Edge 5xx, HTTP interruptions, MPEG-TS audio/video PMT/packet/TEI/continuity observations, codec support concerns, catalog errors, and local gateway authentication separately. No assertion of a definite root cause.
- **Passive collection once per minute** even with dashboard closed: reuse existing fixed-origin read-only internal portal, Edge and MediaMTX telemetry and existing STREAM relay process snapshots. All time-series are bounded in process memory to 90 aggregate samples and 60 incident raised/resolved entries. Two consecutive complete samples required to raise or resolve an incident (to prevent flapping). Missing telemetry cannot silently resolve an incident.
- **Protected API**: GET `/operator/api/playback-health` returns current cached summary, evidence coverage, trends and incident history (no source URLs, credentials, customer IDs, phone, device IDs, client IP, transport payload or media). The route is behind the existing Basic operator authentication and is read-only. GET itself does **not** trigger media or monitoring fetches.
- **Arabic dashboard**: Smart Playback panel displays likely cause and manual diagnostic step, severity, 7-layer coverage, incident history and disabled AI button if not configured.
- **Optional Groq AI explanation**: `POST /operator/api/playback-health/ai` requires operator Basic credentials and special `x-blofy-operator-action: playback-ai-explain` header, with no automatic/background Groq calls. If the owner configures `BLOFY_STREAM_GROQ_API_KEY` as a Railway secret (not in repository, client HTML or API response), the server calls the Groq fixed HTTPS Chat Completions API using a production model `openai/gpt-oss-120b` and sends **only** allowlisted diagnostic codes, counts, severities, actions, and boolean telemetry coverage. Rate limit: <=30 requests per process boot, >=60 seconds between; 6-second timeout; bounded response. Model response must select an actual known incident code, short Arabic text only, reject URL/secret-like content. All advice is explicitly non-executing, with no auto-remediation. If no key is configured, deterministic diagnosis still works and the UI clearly says AI is disabled.

## Acceptance and limits

Server MPEG-TS audio track info is **not decoded sound**. Video transport or successful first bytes are **not displayed video**. Active HTTP transfers, shared relay readers, Edge header requests and MediaMTX HLS sessions are **different scopes** and cannot be summed into unique viewers. No claim of 128/500 licensed live customers or provider permission.

Manual end-to-end acceptance is still necessary on authorized Android 9/Windows clients for AC3/EAC3/AAC audio output, volume selection, video decoding and player differences; no client APK or signed build is altered by this change.

Deployment: merge only after core, isolated-stream and actual Docker image tests pass, confirm exact Railway STREAM API production deployment/health with no new 5xx. If Groq is desired, configure the secret separately; never send it in chat, client code or GitHub.
