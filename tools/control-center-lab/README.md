# BLOFY CONTROL CENTER — isolated lab milestone 1

Date: 2026-11-16  
Target: Railway project **BLOFY-XTREAM-MIGRATION-LAB**, environment **test**, service **blofy-control-center-lab**.  
Production **BLOFY-STREAM** is not modified by this milestone.

## Delivered

- A real Bun HTTP service on port 3000 with a browser dashboard in Arabic and a read-only API.
- Basic authentication with the required Railway environment secret `CONTROL_CENTER_PASSWORD` (username `admin`).
- `GET /health` remains public, minimal, and compatible with Railway health checks.
- Protected `GET /` displays current HTTP checks and a separate **planned** roadmap.
- Protected `GET /api/status` performs bounded checks of **fixed, allowlisted lab URLs only**. It reports HTTP status and latency; it never accepts user-supplied arbitrary URLs.
- Protected `GET /api/history` exposes a short **in-memory** sample history. It resets on restart.
- Protected `GET /api/roadmap` lists planned phases without marking them as implemented.
- The probe interval is throttled to a minimum of 15 seconds and each target has a 4.5-second timeout.
- No customer accounts, Xtream credentials, user playlists, distribution settings, media writes, or production reconfiguration.

## Explicit limitations

The probe is a reachability test, not an audio/video quality check, HLS segment inspection, stream failover, or a production monitoring guarantee. A 404 may prove the server answered without proving that its health or streaming endpoint exists. Railway deployment status is not evidence that every stream works. No durable alert history or auto-remediation exists in this milestone.

## Secure access

1. Keep the dashboard domain on HTTPS.
2. Read/rotate `CONTROL_CENTER_PASSWORD` using Railway variables (never put it in GitHub).
3. Enter username `admin` and the password when the browser prompts.
4. For API smoke tests, run (with your own secret supplied locally):
   ```sh
   curl -fsS https://blofy-control-center-lab-test.up.railway.app/health
   curl --fail -u "admin:$CONTROL_CENTER_PASSWORD" \
     https://blofy-control-center-lab-test.up.railway.app/api/status
   ```
5. Unauthenticated requests to the dashboard/API must return HTTP 401; GET /health must return 200.

## Next execution milestones

1. Add a **separately authorized** HLS/TS test fixture with deterministic segment read and codec inspection; do not probe unknown endpoints or expose upstream credentials.
2. Persist a stream-scanning queue, retries, errors, audio/video codec results, and time-series measurements.
3. Test load distribution and failover under simulated load and rollback conditions, **without rerouting live customers**.
4. Integrate authorized Xtream/M3U sources with rights checks, catalog sync, and verified file storage.
5. Add RBAC, resellers/credits and auditable admin actions to an isolated staging database; then integrate with existing subscriber schema.
6. Add AI-assisted diagnostics **read-only first**, then require explicit approval for mutations.
7. Promote each feature only after regression, performance and security verification.

## Rollback

Delete or stop **only** Railway service `blofy-control-center-lab` in the test project. Existing BLOFY-STREAM production services and credentials remain unchanged. The code is versioned on branch `feature/blofy-control-center-lab-20261116`.
