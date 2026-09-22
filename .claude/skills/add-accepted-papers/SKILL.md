---
name: add-accepted-papers
description: File an accepted or published paper in content/publications/ and announce it as a news item. Use when the manager says a paper was accepted, we got a paper into X, add these papers, announce the acceptance, N papers accepted to X, published in journal Y, or write up this acceptance.
---

# Announce accepted papers

Updated: 2026-09-17

## Ask first
- **Which research areas?** Only when the fit is not obvious from the title. `areas` is
  optional — leave it off rather than guessing, and it can be filed later.
- **Does this also become a news item?** Only when it is genuinely unclear — see Settled below.

Everything else (venue, year, authors) comes from the acceptance itself. Do not ask about
fields `content/SCHEMA.md` already answers.

## Settled
- **2026-09-10 — every announced paper gets a `content/publications/` file.** Filing is not a
  curation decision; it is what announcing a paper means. `/publications/` is the complete
  list, grouped by year, newest first.
- **2026-09-10 — the two entry points differ.** *Announcing* a paper ("we got a paper into X",
  "N papers accepted to Y") means both files: the publication record and a news item that
  points at it. *Filing* a paper ("add this to the publications list", an older paper, a
  correction) means the publication record alone — nothing requires a publication to be
  referenced by news, and no warning fires. Default to announcing for anything recent; ask
  only when the paper is old enough that a news item would look odd.
- **2026-09-10 — there is no `selected` flag.** It began as the gate on `/publications/` and was
  briefly kept as a badge; the manager dropped it the same day. Every paper is listed equally,
  so nothing has to be re-judged as the lab's emphasis shifts.
- **2026-09-10 — the news body must not restate title and authors.** The item points at the
  paper with `publications:` and the layout renders the full record under a "Papers" heading.
  The body keeps only the human part: where it was accepted, and the congratulations.
- **2026-09-10 — `areas` is optional** (schema changed). A paper with no areas is listed on
  `/publications/` but on no area page. `npm run validate` lists these so they can be swept.
- **2026-09-10 — `status: to-appear` means the venue has not happened yet**, not "no citation
  yet". Once the venue is past, drop the status and add the citation; the validator warns.
- **2026-09-10 — `/publications/` carries a year jump-nav**, reusing the `.jump` pattern from
  `/people/`. New years appear in it automatically; nothing to maintain.
- **2026-09-10 — the 2017–2025 backlog was backfilled** from the 62 `paper`-tagged news items
  (73 new records). That was a one-off; this skill is the steady state.

## Steps
1. One file per paper: `content/publications/<year>-<venue>-<two-or-three-keywords>.md`.
   `year` and `venue` are the *target* venue's, not the announcement date's — a paper accepted
   in 2025 to ICDT 2026 is `year: 2026`. Authors are plain strings exactly as published.
2. Look up the citation and DOI. DBLP is behind a bot wall from this machine; Crossref works:
   `curl -s "https://api.crossref.org/works?query.bibliographic=<title>&rows=3&mailto=<email>"`.
   Accept a hit only when the title matches exactly **and** the year matches — a near-match is
   usually the journal version of the same work, which is a *separate* publication file.
   Cite conferences `VENUE YEAR: pages`, journals `Journal vol(issue): pages (year)`.
   No confident match: omit `citation` and `links` rather than inventing them.
3. If this is an announcement, write the news item per the `add-news-item` skill and add
   `publications: [slug, ...]` in the order announced. If it is a plain filing, stop here — the
   record stands on its own.
4. If a lab member is spelled differently in the author list, add that spelling to their
   `aliases` in `content/people/` — never edit the author string.

## Check
- `npm run validate` — must pass. Read the warnings: a `paper`-tagged item that references no
  publication is the failure this whole setup exists to prevent.
- `npm run build && npm run linkcheck` if a template was touched.
