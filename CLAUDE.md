# TD&K Lab Website

Static website for the Technion Data & Knowledge Lab (https://tdk.cs.technion.ac.il),
replacing a WordPress site. Two strictly separated halves:

- `content/` + `assets/` — the DATA. Markdown files with YAML front matter, plus images/files.
  This is the source of truth. Humans and agents edit this. See `content/SCHEMA.md`.
- `src/` + `eleventy.config.js` — the GENERATOR (Eleventy 3). Turns data into `_site/`.
  Changed rarely, only when presentation changes.

## Status

The site builds clean: `npm run build` writes 108 pages and `npm run linkcheck` passes.

`content/` holds 7 areas, 43 people, 93 publications, 87 news items, 2 projects, 1 guide and
4 pages, migrated from the WordPress site — `MIGRATION_REPORT.md` records the judgment calls
that migration made.

The site is live at <https://tdk.cs.technion.ac.il> under its own name and certificate,
published by Actions on every push to `main`. `techniontdk.github.io` redirects to it. The
WordPress instance it replaces can be decommissioned — see `docs/deploy.md`.

## Rules
- Every fact lives in exactly one file. Cross-references use slugs (filenames without `.md`).
  Never copy data between files; the generator derives lists (people per area, papers per person, etc.).
- `content/` contains no generator-specific files (no `.json` directory data, no layouts, no permalinks).
  All type → layout/URL mapping lives in `routeFor()` in `eleventy.config.js`.
- Image/file paths in front matter are root-relative and start with `/assets/`.
- After any change to `content/`, run `npm run validate` and fix all errors before finishing.
- After any change to `src/` or `eleventy.config.js`, run `npm run build && npm run linkcheck`.
- Never edit `_site/` by hand. Never commit it.
- No CSS frameworks, no JS frameworks. Plain CSS with custom properties in the `:root` block at
  the top of `src/css/site.css`. JS only where unavoidable (currently: `src/js/nav.js` alone).
- The site must stay fully usable with JavaScript disabled, and make no external requests at
  runtime (no CDN fonts, scripts or analytics).
- `tools/scrape/` is a one-off migration tool; do not run it again unless explicitly asked.
- Work on `main`. One developer, no review step, so feature branches only add a merge to do
  later — commit straight to `main` and do not branch unless asked. Commit and push only when
  asked; leave the work in the tree otherwise.

## Content update tasks

A request to change the *data* — add these papers, add a new member, write up this event, add a
guide, mark someone an alumnus — runs through the playbook in `docs/playbook/`.

1. **Look first.** Read `docs/playbook/INDEX.md` — one line per recipe, cheap to read whole.
   It is the only playbook file to open unprompted; `grep -ril "<word>" docs/playbook/` finds
   a recipe by keyword. If a line matches the request, read that recipe and follow it.
2. **No match — ask, then do.** Ask the manager only what the task genuinely leaves open: the
   judgment calls (which research areas, does this also become a news item, is it selected),
   never the mechanics that `content/SCHEMA.md` already answers. Batch the questions into one
   round rather than dripping them out. Then do the work.
3. **Ask before recording.** Never write a recipe on your own initiative. When the task is
   done, say in one line what a recipe would carry — the judgment, not the steps — and write
   `docs/playbook/<task-slug>.md` plus its index line only if the manager says yes. A recipe
   earns its place when the task has structure worth remembering across sessions: several
   files, cross-references between them, or a question that would otherwise be asked every
   time. A one-off edit to a single file's text does not; do that work and stop.
4. **Keep it true.** A correction mid-task, a settled question, or a new variant is folded into
   the existing recipe (bump `Updated:`), never added as a second recipe for the same task.

The formats and the rules for keeping recipes honest are in `docs/playbook/INDEX.md`.
`content/SCHEMA.md` stays the field reference: a recipe carries judgment, not field lists.

## Where a change belongs
- Colours, type, spacing, and *arrangement* (grid tracks, breakpoints) — `src/css/site.css`.
  The `:root` block holds the tokens; the rules below it hold the layout. Prefer changing a
  rule here over changing markup.
- Which fields render, in what order, with what wording — `src/_includes/partials/` (each one
  shared by several pages), `src/_includes/layouts/`, `src/pages/`.
- A content file can never carry `layout`, `permalink` or a styling flag: `eleventyComputed`
  overwrites the first two and `tools/validate.js` rejects unknown fields. To vary one record,
  either target its existing `id` in CSS (person cards and publications emit one), or add a
  real field — `tools/validate.js` + `content/SCHEMA.md` + a modifier class in the partial.

## Commands
- `npm install` — once
- `npm run validate` — check content against the schema (must pass)
- `npm run dev` — local preview at http://localhost:8080 with live reload on `content/` and `src/`
- `npm run build` — validate, then produce `_site/`
- `npm run linkcheck` — after a build: every internal link, anchor and asset resolves
- publishing is `git push` — GitHub Actions builds and deploys to Pages (see `docs/deploy.md`)

## Docs
- `README.md` — how to preview, edit, tune the design and deploy. Start here.
- `content/SCHEMA.md` — field-by-field schema of every content type. Read before editing content.
- `docs/playbook/INDEX.md` — index of content-update recipes, one line each. Read before any
  data task; see "Content update tasks" above.
- `docs/deploy.md` — how publishing works: GitHub Actions → GitHub Pages, the one-time setup,
  and what has to happen for `tdk.cs.technion.ac.il` to answer.
