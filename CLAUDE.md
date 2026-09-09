# TD&K Lab Website

Static website for the Technion Data & Knowledge Lab (https://tdk.cs.technion.ac.il),
replacing a WordPress site. Two strictly separated halves:

- `content/` + `assets/` — the DATA. Markdown files with YAML front matter, plus images/files.
  This is the source of truth. Humans and agents edit this. See `content/SCHEMA.md`.
- `src/` + `eleventy.config.js` — the GENERATOR (Eleventy 3). Turns data into `_site/`.
  Changed rarely, only when presentation changes.

## Status

Both build steps are complete and the site builds clean.

- **Step A (data)** — the WordPress content is migrated into `content/` (7 areas, 43 people,
  20 publications, 87 news items, 2 projects, 1 guide, 4 pages) and `assets/`.
  See `MIGRATION_REPORT.md` for the judgment calls made.
- **Step B (generator)** — Eleventy build, templates, one stylesheet, link checker and deploy
  script. `npm run build` writes 108 pages; `npm run linkcheck` passes.

Not done: the site has never been deployed (`deploy.env` does not exist yet), and there is no
CI workflow.

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
- `npm run deploy` — build, then rsync `_site/` to the CS server (config in `deploy.env`, not committed)

## Docs
- `README.md` — how to preview, edit, tune the design and deploy. Start here.
- `content/SCHEMA.md` — field-by-field schema of every content type. Read before editing content.
- `docs/spec-a-data.md`, `docs/spec-b-generator.md` — original build specs. Deviations from
  spec B are listed at the end of `README.md`.
