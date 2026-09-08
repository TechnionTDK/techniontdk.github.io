# Scraper (one-off)

Migrates the old WordPress site at https://tdk.cs.technion.ac.il into `content/` and `assets/`.

**This is a one-off migration tool. Do not run it again unless explicitly asked** — it
overwrites `content/`, discarding any edits made since the migration.

## Two stages

| Stage | Command | Touches the network | Writes |
|---|---|---|---|
| Fetch | `node tools/scrape/fetch.js` | yes | `tools/scrape/cache/` |
| Extract | `node tools/scrape/extract.js` | only for missing assets | `content/`, `assets/` |

They are separate on purpose. `fetch.js` is the only part that crawls the site; `extract.js`
reads the cached HTML, so it can be re-run freely while tuning the extraction rules without
hitting the server again. Extraction is deterministic: running it twice produces a
byte-identical `content/` tree.

`cache/` is gitignored. If it is empty, run `fetch.js` first — but note that it re-crawls the
live site, which may since have changed.

## What is fetched

- 9 top-level pages: `/`, `/our-mission/`, `/people/`, `/research/`,
  `/selected-publications/`, `/courses/`, `/projects/`, `/news-events/`, `/contact-us/`
- 7 research area pages: `/research/?stl=<id>` for ids 53, 51, 55, 109, 131, 129, 113
- 15 news detail pages, discovered as the union of the "more details" links on the news index
  and the links in the home page's "Latest Events" strip (neither list alone is complete)

Requests are sequential with a 400 ms delay. Already-cached pages are not re-fetched.
`cache/manifest.json` records what was fetched and when.

## Assets

`extract.js` downloads images and files into `assets/`, preferring the original resolution by
stripping WordPress `-WxH` size suffixes from the URL and falling back to the sized copy on a
404. A file that already exists on disk is never re-downloaded, so a second run needs no
network at all.

## Output log

`extract.js` writes `cache/extraction-log.json`: publication merges, skipped placeholder
images, asset failures, per-item news tags, and anything else notable. `MIGRATION_REPORT.md`
at the repo root is written from it.

## Files

- `fetch.js` — the crawler
- `extract.js` — cached HTML → `content/` + `assets/`, one section per content type
- `lib.js` — slugs, YAML front matter emission, HTML→Markdown, asset downloading
