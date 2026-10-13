# Open licensed media playback through BLOFYSAT

BLOFYSAT already indexes selected public/open-licensed videos from Wikimedia Commons and Internet Archive.

Set `XTREAM_PROXY_OPEN_LICENSED=true` to enable serving eligible videos through BLOFYSAT's HTTPS Xtream movie endpoint instead of redirecting the client. The feature applies **only** when the item has rights metadata declaring commercial redistribution, an explicit CC BY / CC BY-SA / CC0 / Public Domain Mark license URL and a verified source/destination mapping:

- Wikimedia Commons file from `https://upload.wikimedia.org`
- Internet Archive file from `https://archive.org` (only with qualifying Creative Commons license URL)

The relay passes through video byte ranges where the origin supports them, checks per-account concurrent playback limits, and limits redirect hops to trusted HTTPS source hosts. The feature never proxies general free-TV playlists or IPTV-org directory channels, since free viewing does not imply permission to redistribute.

Creative Commons media requires appropriate on-screen title, author, source and license attribution, plus any share-alike duties. The Xtream VOD info API includes available license metadata, but clients must display that attribution to comply. Internet Archive describes uploaded rights metadata as informational and not warranted; confirm individual rights before commercial operation.

This is an opt-in playback feature, not a feed license, rights grant, complete playback audit, origin SLA or capacity guarantee for 100 users. The imported 54,665 private Xtream titles remain metadata-only and are unrelated to this open-license catalog.

Useful licenses:
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- https://archivesupport.zendesk.com/hc/en-us/articles/360014759692-Rights
- https://creativecommons.org/licenses/by/4.0/
