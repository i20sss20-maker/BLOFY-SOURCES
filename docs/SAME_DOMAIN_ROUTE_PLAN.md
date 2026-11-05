# BLOFY STREAM — same-domain routing plan (prepared, not deployed)

**Target:** `https://blofyplayer.com/stream/` while keeping `/`, `/admin`, `/downloads`, activation and updates unchanged.

**Current source:** Railway service `blofy-restream-test` (isolated) with HTTPS hostname `blofy-restream-test-test.up.railway.app`. Its existing URLs are rooted at `/`, `/admin-assets/*` and `/admin-api/*`. Those root paths must **not** be forwarded on the public domain without namespacing because that can collide with the existing BLOFY admin app.

## Required integration

1. Locate the actual authoritative edge gateway for `blofyplayer.com` (Azure Front Door, Container Apps ingress, nginx, etc.) and capture a rollback snapshot.
2. In the gateway, add **path-based** routing to Railway, not a DNS replacement:
   - `/stream` and `/stream/` -> Railway `/` (admin HTML)
   - `/stream/admin-assets/*` -> Railway `/admin-assets/*`
   - `/stream/admin-api/*` -> Railway `/admin-api/*`
   Keep original Host/SNI to the Railway hostname as required by the upstream. Forward client identity safely through a trusted proxy, strip hop-by-hop headers, and enforce TLS.
3. Before this route can function, modify the admin HTML and JS to use the `/stream/` base for CSS, scripts, API and navigation. The standalone Railway service can continue to use root paths. Avoid leaking admin cookies across unrelated app routes: change the session cookie to scope it to `/stream` behind gateway or use a distinct cookie name and Secure/HttpOnly/SameSite.
4. **Do not** proxy `/player_api.php`, `/get.php`, `/live/*`, `/movie/*`, or `/series/*` under the main domain until separately designed. Streaming traffic is substantial, and cross-domain routing changes current client contracts. BLOFY device pairing codes and Xtream accounts are different subsystems.
5. Run smoke checks: `/`, `/admin`, `/downloads`, `/health`, `/stream/`, `/stream/admin-api/status` (401 without session), authorized login, assets, logout, multiple account creation, and a licensed playback path.
6. Only after tests, enable a visible navigation link inside the *existing* admin UI, behind admin authorization. Keep rollback as removal of only the `/stream*` routing entries.

**NOT DONE:** This repository cannot itself change the main domain's DNS, Azure gateway route tables, or the existing site's admin UI. No main-domain routing has been applied yet. The service is online separately.
