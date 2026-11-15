# BLOFY STREAM site — owner-only physical browser QA (2026-11-15)

Scope: **BLOFY STREAM /operator website**, not BLOFY PLAYER or BLOFY STREAM application binaries.

## Test prerequisites
- The owner has independently verified storage rights for the **specific** movie and episode already copied to the private S3 bucket. Credentials to a provider alone do not prove rights.
- The existing private movie and episode S3 manifests each have a **unique** completed and verified run, with `bytesCopied === expectedBytes`.
- The existing Content Hub preview flags remain explicitly enabled for owner-only viewing. Customer routes, auto-copy and catalog cutover remain unchanged.
- Access through the existing authenticated /operator website. No S3 URLs, source secrets or tickets are copied into a client.

## Physical Windows browser
1. Open `/operator#library` and refresh private Content Hub status.
2. Under “إثبات تشغيل مكتبة BLOFY STREAM على المتصفح”, select `Windows — المتصفح` **before** pressing Play.
3. Click the existing 12-second verified movie MP4 preview and observe an actual moving picture and *audible* sound. Unmute speakers and the HTML player.
4. Seek forward inside the short clip and play again. Do the same for the verified episode preview (not a different file or upstream source).
5. Check “رأيت الصورة تتحرك فعليًا” and “سمعت الصوت فعليًا من الجهاز” for **each** clip only after personally verifying it. The UI needs at least two seconds of continuous playback, successful seek/resume and no player errors.
6. Download the **local** JSON evidence. It contains platform selection, exact unique verified run IDs, expected lengths and observed browser playback state. It is **not** sent to the server.

## Physical Android TV browser
Repeat all steps using a genuine Android TV browser with the D-pad/remote for navigation, with `Android TV — المتصفح` selected **before** playback. Download the independent second JSON to the device or transfer it securely to the owner.

## Compare evidence (on Windows, no server upload)
In the same authenticated /operator Library, use the new **📂 مقارنة نتائج Windows وAndroid TV** file selector to import exactly the two locally saved JSON reports. Comparison rejects:
- Two tests marked for the same platform, missing/wrong schema, stale (>7 days) or future reports;
- Incomplete or errored video, muted/zero-volume audio, missing manual A/V confirmation, missing seek-resume;
- Changed or ambiguous full verified manifest run IDs/sizes between devices or since the live library status;
- Any claim that these local reports approve release, verify full-length playback, prove licensing or attest device hardware.

A positive comparison means **only** two short owner-only browser clips were reported to work on the named platforms. Platform identity is manually selected and **not hardware attested**. Success does **not** mean an entire movie/episode played start to finish, a full movie seek worked, all AC3/EAC3 tracks are compatible, or subscriber distribution is approved.

## Outstanding release gates
- Independent exact-file rights and provider concurrency constraints remain mandatory.
- Actual full-duration playback/seek across the stored source file (not just the 12-second transcoded MP4), with image/sound and interruption recovery on both target platforms, remains unverified.
- No new authorized source copying, automatic daily mirroring, app installation or public launch is triggered by this QA UI.
