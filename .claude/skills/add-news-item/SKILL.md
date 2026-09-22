---
name: add-news-item
description: Write up anything that happened as a news item in content/news/. Use when the manager says add a news item, add a new item, write up this event, we just had a visit, a talk by, we hosted, X gave a talk, or add this to the news.
---

# Add a news item

Updated: 2026-09-17

## Ask first
- **Does it cross-reference anything?** Papers the item is about (`publications:`), lab members
  it is about (`people:`). Ask only when the request implies a link it does not spell out.

Title, body, tags and image handling come from the request itself and `content/SCHEMA.md`.
Do not ask about those.

## Settled
- **2026-09-17 — a news item dates to today** unless the manager gives a date. The
  `YYYY-MM-DD-` filename prefix must equal the `date` field.
- **2026-09-17 — `content/people/` is the lab roster, and a news item never touches it.**
  The roster is not employees-only: `group: visiting` is for someone who is part of the lab for
  a stretch and has an office (currently Kira Radinsky). Someone who came for a few days and
  gave a talk is *not* on the roster — name them in the body and leave `people:` off. `people:`
  lists only lab members the item is about.
- **2026-09-17 — news image sizes are not standardized.** Widths under
  `assets/images/news/` run from 336 to 3264px; there is no convention to match, so pick a sane
  size and move on. No cap has been set.
- **2026-09-17 — the body carries the human part.** Anything the site already holds as data is
  cross-referenced, not restated — see the `add-accepted-papers` skill for the paper case.

## Steps
1. `content/news/YYYY-MM-DD-<short-title>.md`.
2. Images go under `/assets/images/news/<year>/`, named after the item's slug (`-01`, `-02` …
   for further ones). `cover` is the lead image; `photos` is the rest, in display order.
3. `tags` come from the closed list in `tools/validate.js` — `paper`, `award`, `grant`, `event`,
   `visit`, `talk`, `media`, `milestone`. Anything else is a hard error; extending the list means
   editing `tools/validate.js` and `content/SCHEMA.md` together, deliberately.
4. Add the cross-references: `publications:` in the order announced, `people:` for lab members.

## Check
- `npm run validate` — must pass. A `paper`-tagged item referencing no publication warns.
- `npm run build && npm run linkcheck` — confirms a newly added image actually resolves.

## Worked example
`content/news/2026-09-17-visit-of-christoph-standke-from-rwth-aachen.md` — an external
collaborator's visit and talk: `tags: [visit, talk]`, both joint papers in `publications:`,
no `people:`, no `people/` file for the visitor.
