# BLOFY SOURCES

BLOFY SOURCES is a small source repository for testing media-provider management with CloudStream/CNCVerse-compatible repository manifests.

## Public endpoints

- `repo.json` — repository manifest to add in CNCVerse / compatible clients.
- `plugins.json` — published extension list.
- `sources.json` — BLOFY control metadata for the future Azure admin panel.

## Test scope

The first test set only references upstream extensions from the official reCloudStream extensions repository. No `.cs3` binaries are copied into this repository.

Initial test providers:

- Internet Archive
- Twitch
- Dailymotion

## CNCVerse test URL

Use this repository URL in **Extensions → Add Repo**:

`https://raw.githubusercontent.com/i20sss20-maker/BLOFY-SOURCES/main/repo.json`

## Status values

CloudStream-compatible provider status:

- `0` = Down
- `1` = OK
- `2` = Slow
- `3` = Beta only

## Planned Azure integration

A BLOFY Sources admin panel will later publish and manage these manifests from Azure, with enable/disable, ordering, categories, health checks, version tracking and rollback.
