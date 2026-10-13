# BLOFYSAT private catalog import

The admin panel's **Catalog / المكتبة** tab accepts an Xtream metadata export CSV
with columns `Type,XtreamId,CategoryId,Title,Category` and optional
`Classification,MatchedBy`. The source file is never committed to GitHub.

- Import is admin-authenticated, limited to 16 MiB and 100,000 records.
- Rows are validated, de-duplicated by media type and upstream ID, then
  stored separately in `blofysat-selection.json` (local DATA_DIR and private
  Azure Blob when configured).
- The selection remains **metadata only**. Nothing is auto-added to public
  Xtream responses or playback routes.
- This deliberately avoids suggesting non-playable catalog metadata works as
  live channels, films or series.

## Getting a playable package

A working Xtream gateway requires **separately verified media usage and
redistribution permission**, plus a compatible licensed upstream content feed
that is configured in the existing authorized-partner pipeline. Metadata
classification does not validate the language, subtitles or content rights.

Before enabling streaming, implement and test a distinct matching and
entitlement-controlled publishing step for a licensed provider, including
individual series-episode mapping; IDs in the CSV are not media URLs. Do not
copy passwords to source control or to the CSV.

## Local tests

`node --test test/blofysat-selection.test.mjs`
