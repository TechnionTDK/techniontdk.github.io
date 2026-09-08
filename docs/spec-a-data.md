# docs/spec-a-data.md — Step A: Data model and migration

## Goal

Produce the `content/` and `assets/` directories, fully populated with the current content of https://tdk.cs.technion.ac.il, together with `content/SCHEMA.md` and a validator. **Do not build any website generator in this step.** The output of this step is data that a human will review and approve.

## Deliverables

1. `content/` populated per the schema below.
2. `assets/` with all images and files referenced by content, downloaded at original resolution.
3. `content/SCHEMA.md` — human- and agent-readable documentation of every type and field, including examples. This is the reference document that future editing agents will read; write it carefully.
4. `tools/validate.js` (Node, runnable via `npm run validate`) — see "Validator".
5. `tools/scrape/` — the scraper, with a README on how it was run. One-off; language is your choice (Python with `requests` + `beautifulsoup4` + `markdownify` is fine).
6. `MIGRATION_REPORT.md` at repo root — counts per type, every judgment call made, every item that could not be resolved cleanly (missing photo, broken link, ambiguous author, duplicate).
7. `package.json` with the `validate` script; `.gitignore` covering `node_modules/`, `_site/`, `deploy.env`, scraper caches.

## Repository layout (after Step A)

```
CLAUDE.md
README.md
package.json
.gitignore
docs/
  spec-a-data.md
  spec-b-generator.md
content/
  SCHEMA.md
  site.yaml
  pages/
    home.md
    about.md
    contact.md
    courses.md
  people/
  areas/
  publications/
  news/
  projects/
  guides/
assets/
  images/
    site/        # logos
    people/
    areas/
    news/<year>/
    projects/
  files/         # PDFs and other downloads, mirroring the same subfolders
tools/
  validate.js
  scrape/
MIGRATION_REPORT.md
```

## General conventions

- One Markdown file per entity. Filename (without `.md`) is the entity's **slug** and its identity. Slugs: lowercase ASCII, words separated by `-`, no dates in slugs except where the schema says so.
- Front matter is YAML between `---` lines. Body is CommonMark Markdown. Fields not listed in the schema are not allowed (the validator rejects them) — this keeps the data predictable for agents.
- Dates are ISO `YYYY-MM-DD`, unquoted.
- Cross-references are slugs of other files (`advisors: [benny-kimelfeld]`). The validator checks that they resolve.
- Asset paths are root-relative strings starting with `/assets/`, e.g. `/assets/images/people/benny-kimelfeld.jpg`. Asset filenames are derived from the owning slug where natural (person photo = person slug), otherwise from the original filename, sanitized.
- Text fields hold plain text, not HTML. Where the original had HTML (bold, links, lists) in a *body*, convert to Markdown. Where it had HTML in a *field* (rare), strip to plain text.
- Optional fields are omitted when empty, not set to `null` or `""`.

## Types

### `site.yaml` (single file)

```yaml
name: Technion Data & Knowledge Lab
short_name: TD&K
url: https://tdk.cs.technion.ac.il
description: <one sentence, from the mission page>
logo: /assets/images/site/logo-tdk.png
affiliations:
  - name: Faculty of Computer Science
    url: https://cs.technion.ac.il/
    logo: /assets/images/site/logo-cs.png
  - name: Technion
    url: https://www.technion.ac.il/
    logo: /assets/images/site/logo-technion.png
nav:                         # order of the main navigation
  - { label: About, url: /about/ }
  - { label: People, url: /people/ }
  - { label: Research, url: /research/ }
  - { label: Publications, url: /publications/ }
  - { label: News, url: /news/ }
  - { label: Projects, url: /projects/ }
  - { label: Guides, url: /guides/ }
  - { label: Courses, url: /courses/ }
  - { label: Contact, url: /contact/ }
footer:
  copyright: "© Technion Data & Knowledge Lab"
  links:
    - { label: Accessibility, url: https://www.technion.ac.il/en/accessaility-statement/ }
    - { label: Privacy, url: https://www.technion.ac.il/en/privacy-policy/ }
home:
  news_count: 5              # how many news items on the home page
  photo_news_count: 4        # how many photo-bearing news items on the home page
```

Drop the social icons (they link nowhere on the current site).

### `pages/*.md`

Fixed set: `home.md`, `about.md`, `contact.md`, `courses.md`.

```yaml
---
title: Our Mission        # page heading; for home.md, title is ignored by the generator
---
Body in Markdown.
```

- `home.md` body = the intro paragraph on the current home page ("Every day modern society…").
- `about.md` = the "Our Mission" page.
- `contact.md` = the "Contact Us" page, converted to Markdown (address, emails, map link if any).
- `courses.md` = the "Courses" page, converted to Markdown.

### `people/<slug>.md`

Slug = `firstname-lastname`.

```yaml
---
name: Benny Kimelfeld           # required; as displayed, no honorific
honorific: Prof.                # optional: Prof. | Dr.
role: Lab Head                  # optional free text shown after the name (e.g. "Lab Head", "Research Associate, Lab Engineer", "Undergraduate")
group: faculty                  # required for active people: faculty | visiting | staff | phd | msc | developer
status: active                  # required: active | alumni
degree: Ph.D.                   # optional: Ph.D. | M.Sc. — the degree pursued (students) or obtained (alumni)
advisors: [benny-kimelfeld]     # optional list of people slugs
email: bennyk@cs.technion.ac.il # optional
website: https://...            # optional
phone: "+972 73 378 5528"       # optional, quoted string
office: "651"                   # optional, quoted string, as written on the site ("Taub 645", "651")
interests: Database systems and theory, information extraction, ...   # optional plain text
photo: /assets/images/people/benny-kimelfeld.jpg   # optional; omit if the site used the empty placeholder
areas: [text-analysis, query-optimization]         # optional list of area slugs
aliases: ["B. Kimelfeld"]       # optional: alternative spellings used in publication author lists
order: 10                       # optional integer; lower = earlier within its group. Assign from the current site's order.
---
Optional bio in Markdown (currently none exist; leave body empty).
```

Migration rules:
- Groups map from the current People page: Faculty Members → `faculty`, Visiting Researchers → `visiting`, Staff → `staff`, Graduate Students / M.Sc. → `msc`, Graduate Students / Ph.D. → `phd`, Software Developers → `developer`.
- Alumni: `status: alumni`, `degree` from the "Ph.D." / "M.Sc." suffix, no `group`, keep email/website. Keep exactly the names listed; do not invent data.
- The "Dean Light" office field contains a URL; keep it verbatim in `office` — flag it in the report.
- `areas`: derive from the "People" list on each research-area page. Those lists reference people by anchor (`/people/#tdkNNN`); read the anchor ids from the People page HTML to map to persons. Alumni appear in these lists too — that's fine, an alumnus can have `areas`.
- Download each photo at original resolution (strip WordPress size suffixes like `-336x194` from the URL to get the original; fall back to the sized one if the original 404s).
- Set `order` so that the generator can reproduce the current on-site order within each group without further heuristics.

### `areas/<slug>.md`

Slugs: `text-analysis`, `query-optimization`, `enumeration-algorithms`, `inconsistent-data-management`, `preference-data-management`, `knowledge-bases`, `databases-and-machine-learning`.

```yaml
---
title: Text Analysis
tagline: We develop foundations of declarative languages for analyzing text alongside structured data   # required; from the Research index page
image: /assets/images/areas/text-analysis.jpg
order: 1                        # from the current index order
collaborators:                  # optional
  - name: Ron Fagin
    affiliation: IBM, USA
    url: https://researcher.watson.ibm.com/...
---
Overview text in Markdown (the "Overview" section of the area page).
```

People and publications for an area are **not** stored here — they're derived from `areas:` on people and publications.

### `publications/<slug>.md`

Slug = `<year>-<venue-short>-<two-or-three-keywords>`, e.g. `2018-pods-joining-extractions`, `2015-jacm-document-spanners`.

```yaml
---
title: Joining Extractions of Regular Expressions     # required
authors:                                              # required, in display order, full names as written
  - Dominik D. Freydenberger
  - Benny Kimelfeld
  - Liat Peterfreund
venue: PODS                     # required: short venue name as commonly cited (PODS, SIGMOD, ICDT, J. ACM, ACM TODS, ...)
year: 2018                      # required integer
citation: "PODS 2018: 137-149"  # optional: the full venue/pages string exactly as on the site
status: published               # optional: published | to-appear | preprint  (default published)
links:                          # optional; keys from this fixed set: paper, arxiv, doi, code, slides, video
  paper: https://arxiv.org/pdf/1703.10350.pdf
areas: [text-analysis, query-optimization, enumeration-algorithms]   # required, ≥1
selected: true                  # required boolean; true for everything migrated from "Selected Publications"
---
Abstract in Markdown (may be empty if the site has none).
```

Migration rules:
- The current site lists the same paper under several areas. **Deduplicate by title** (case-insensitive, punctuation-normalized); the paper's `areas` is the union of the sections it appeared in. Report every merge.
- Author names stay as strings. Do **not** convert to person slugs. (The generator will link author names that match a person's `name` or `aliases`.) Fix obvious typos flagged on the site only if unambiguous ("Beny Kimelfeld" → "Benny Kimelfeld") and list each fix in the report.
- Entries with "To appear in X" → `status: to-appear`, `venue`/`year` from the target venue, and keep the original string in `citation`.
- If a `paper` link is a DOI URL, also fill `links.doi`.

### `news/<slug>.md`

Slug = `YYYY-MM-DD-<short-title>`, e.g. `2025-12-14-three-papers-sigmod-2026`. Date is part of the filename so the folder sorts chronologically.

```yaml
---
title: Three papers accepted to SIGMOD 2026     # required
date: 2025-12-14                                # required
summary: <one sentence>                         # optional; use if the body is long
cover: /assets/images/news/2025/extended-lab-meeting.jpg   # optional; the thumbnail/lead image
photos:                                         # optional gallery, in display order
  - /assets/images/news/2025/extended-lab-meeting-01.jpg
  - /assets/images/news/2025/extended-lab-meeting-02.jpg
tags: [paper]                                   # optional; from: paper, award, grant, event, visit, talk, media, milestone
people: [shunit-agmon, brit-youngmann]          # optional cross-links to people slugs
publications: [2018-pods-joining-extractions]   # optional cross-links to publication slugs
---
Body in Markdown, converted from the news post. Lists, links and emphasis preserved.
```

Migration rules:
- Source is the full News & Events page (all ~90 items, 2017–2025). Where an item has a "more details" link or a dedicated page (the ones appearing in the home page "Latest Events" strip), fetch that page and use its full body and all its images; set `cover` to its lead image and `photos` to the rest.
- `tags`: assign one or more heuristically (title contains "accepted"/"published" → `paper`; "award"/"won"/"fellowship" → `award`; "grant" → `grant`; "trip"/"meeting"/"seminar" → `event`, etc.). Note the heuristic in the report; imperfect tagging is acceptable.
- `people`: fill only when a lab member is unambiguously named in the title (e.g. "Nofar Carmeli won…"). Do not attempt author-list matching in this step; leave `publications` empty. These are optional and the human will curate.
- Preserve the original dates exactly. Two items share dates heavily (bulk-posted); that's fine.
- Locally hosted files linked from news (e.g. the Haaretz PDF) go to `/assets/files/news/<year>/`.

### `projects/<slug>.md`

```yaml
---
title: The Jewish Bookshelf Project
advisors: [oren-mishali]        # required list of people slugs
image: /assets/images/projects/jewish-bookshelf.jpg   # optional; omit if the site used the placeholder
status: open                    # open | closed  (default open)
audience: [msc, phd, undergrad] # optional; default all three
---
Description in Markdown.
```

The Projects page intro text ("The following projects are proposed for…") goes into `site.yaml` under `projects_intro:` (add this key).

### `guides/<slug>.md`

```yaml
---
title: Connecting to the SLURM cluster
summary: How to get an account, log in, and submit your first job.   # required
updated: 2026-09-07              # required
author: oren-mishali             # optional people slug
order: 1                         # optional
---
Body in Markdown.
```

Create one placeholder: `connecting-to-slurm.md` with the front matter above and a body containing a single line "_Draft — to be written._". The old "Resources" page is **not** migrated.

## Scraper notes

- Pages to fetch: `/`, `/our-mission/`, `/people/`, `/research/` and each `/research/?stl=<id>` (ids 53, 51, 55, 109, 131, 129, 113), `/selected-publications/`, `/courses/`, `/projects/`, `/news-events/`, `/contact-us/`, plus every individual news/event page discovered by link.
- Cache raw HTML under `tools/scrape/cache/` (gitignored) so the run is reproducible offline.
- Abstracts on the publications page are hidden behind an "[abstract]" toggle; they're in the HTML, not loaded dynamically.
- Be polite: sequential requests, small delay.
- Do not scrape the home page sliders (`slider-pic-*`); they're decorative. Do save the three logos to `/assets/images/site/`.

## Validator (`tools/validate.js`)

Runs with `node tools/validate.js`; exits non-zero on any error. Checks:

1. Every `.md` under `content/` parses (valid YAML front matter).
2. Per type: required fields present; no unknown fields; enum fields within their allowed values; types correct (dates are dates, `year` is an integer, booleans are booleans).
3. Every slug reference (`advisors`, `areas`, `people`, `publications`, `author`) resolves to an existing file of the right type.
4. Every `/assets/...` path referenced anywhere in front matter or body exists on disk.
5. Filename conventions (news filenames start with a valid date; slugs are lowercase-kebab).
6. `site.yaml` parses and nav URLs are well-formed.
7. Warnings (non-fatal, printed): publication with no `links`, active person with no `photo`, publication author that matches no person (informational only).

Print a summary: counts per type, errors, warnings. Keep the validator dependency-light (`gray-matter`, `js-yaml`; nothing else).

## Acceptance criteria

- `npm run validate` passes with zero errors.
- `MIGRATION_REPORT.md` exists and lists: counts per type; every dedup merge; every name fix; every item with missing/broken image or link; every heuristic used.
- Spot check: `people/benny-kimelfeld.md`, `areas/text-analysis.md`, `publications/2018-pods-joining-extractions.md` (with 3 areas), `news/2025-12-14-three-papers-sigmod-2026.md`, and the extended-lab-meeting news item (with photos) all look as specified.
- No HTML tags remain in any front matter field. Bodies contain Markdown only (raw HTML allowed only if there is no Markdown equivalent, and each such case is listed in the report).

Do not proceed to Spec B. Stop after the report is written.

---

