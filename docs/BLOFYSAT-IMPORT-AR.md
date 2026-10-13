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

## Licensed Xtream selection for BLOFYSAT

For an **already authorized** Xtream partner only, the authorized partner manifest
supports `selectedCatalog: "BLOFYSAT"`. This opt-in limits media from that
feed by the exact upstream `stream_id` (live/movies) or `series_id` (series)
saved in the private CSV. Missing IDs are silently excluded from output.

Example feed inside a rights-checked authorized partner manifest:

```json
{
  "type": "xtream",
  "secretRef": "LICENSED_PARTNER",
  "language": "ar",
  "selectedCatalog": "BLOFYSAT",
  "include": ["live", "vod", "series"],
  "maxSeries": 100
}
```

This does **not** obtain or grant content rights. The existing
`ENABLE_AUTHORIZED_PARTNERS=true`,
`AUTHORIZED_PARTNER_RIGHTS_CONFIRMED=true` and partner manifest rights
checks are required, and the upstream access credentials belong in sealed
runtime environment variables only. Never store passwords in GitHub,
metadata CSV, or the manifest.

**Scalability note:** The selected series list filters *before* the series
information lookup limit. `maxSeries` defaults to the configured series
limit and is capped at 20,000 when selection is enabled. Importing 15,815
series requires potentially many upstream metadata requests and many more
episodes than series IDs; it must be tested and staged in manageable batches.
A successfully imported 54,665-row CSV is metadata, not 54,665 verified
playable items. The public Xtream catalog will only include the actual
licensed rows that were successfully synced.
