# TD&K Lab website

Static website for the [Technion Data & Knowledge Lab](https://tdk.cs.technion.ac.il),
replacing the previous WordPress site.

The repository has two strictly separated halves:

- **`content/` + `assets/` — the data.** Markdown with YAML front matter, plus images and
  files. This is the source of truth, and what humans and agents edit.
- **`src/` + `eleventy.config.js` — the generator.** An [Eleventy](https://www.11ty.dev/)
  build that turns the data into `_site/`. Changed rarely, only when presentation changes.

`content/` contains no generator files: no layouts, no permalinks, no `.json` data files.
Every type → layout/URL mapping lives in `eleventy.config.js`.

## Getting started

```sh
npm install
npm run dev          # preview at http://localhost:8080
```

Leave `npm run dev` running while you work. It rebuilds and reloads the browser on every save,
in both `content/` and `src/` — so **no, you do not regenerate the site by hand after a data
change.** You only run a build explicitly when you want to run the link checker; publishing
runs its own build on GitHub.

## The everyday loop

### Changing data — text, people, papers, news

```sh
npm run dev                       # leave running in one terminal
$EDITOR content/people/ada-lovelace.md
npm run validate                  # in another terminal, when you are done
```

Save the file and the open browser tab updates itself, usually within a second. Nothing else
is needed: lists that look copied — the people on a research area page, the papers in an area,
the news on the home page — are derived from the cross-references at build time, so adding
`areas: [text-analysis]` to a person makes them appear on that area's page immediately.

`npm run validate` is the check that matters. It catches typos the browser cannot: a misspelled
slug that resolves to nothing, an unknown field, an image path that does not exist on disk, a
news filename whose date disagrees with its front matter. Run it before you stop.

If the browser stops updating, the build most likely failed — look at the terminal running
`npm run dev`, which prints the error and the file it came from.

### Common tasks

Most requests come down to one or two files. You can edit them by hand, or ask the agent in
plain language — it follows the recipes in [`docs/playbook/`](docs/playbook/INDEX.md), which
record what was decided the last time so you are not asked the same question twice.

| What you want | What it takes |
|---|---|
| A paper was accepted or published | **two files** — a record in `content/publications/`, and a news item carrying `publications: [<slug>]`. The news body says where it was accepted and congratulates; it does *not* restate the title and authors, because the item renders the full record itself. |
| Add an older paper to the list | **one file** — just the publication record. Not every paper needs an announcement. |
| A new lab member | one file in `content/people/`, plus a photo at `/assets/images/people/<slug>.jpg` |
| Someone graduates | edit their file: `status: alumni`, remove `group`. Never delete it — papers and news still reference them. |
| Write up an event | one file in `content/news/`, images under `/assets/images/news/<year>/` |
| A new guide for lab members | one file in `content/guides/` |

The paper case is the one worth internalising, because it is the one that went wrong before:
`/publications/` is generated from `content/publications/`, so a paper announced only in prose
appears nowhere but that one news item. Filing the record is what makes it show up on the
publications page, on its research-area pages, and under its authors' names. `npm run validate`
warns when a news item tagged `paper` references no publication, so the omission surfaces
immediately rather than six years later.

### Tuning the look

[`src/css/site.css`](src/css/site.css) is the only stylesheet and it has two halves. The
`:root` block at the top holds the design tokens: edit a value, save, and the whole site
re-renders in the open tab. The rules below it are ordinary CSS, and that is where
*arrangement* lives — the grid tracks for a person card, a news teaser and a project row, and
every breakpoint. Reach for a rule there before you change any markup.

The tokens you are most likely to want:

| Property | Controls |
|---|---|
| `--color-accent` | the bordeaux used for links, tags and the active nav underline |
| `--color-text`, `--color-muted`, `--color-faint` | body text, secondary text, small print |
| `--color-line` | every hairline rule and border |
| `--font-display` | the serif used for headings, the lab name and paper titles |
| `--font-body` | everything else (a system stack, so nothing is downloaded) |
| `--size-xs` … `--size-3xl` | the type scale; change one step, not individual rules |
| `--space-1` … `--space-8` | the spacing scale, used for every margin and gap |
| `--measure-prose` | width of running text (~44rem) |
| `--measure-wide` | width of grids and listings (~72rem) |

Two rules of thumb for the tokens: change the *variable*, not the individual rule that uses
it, so the change stays consistent everywhere; and if you darken `--color-muted` or
`--color-faint`, keep contrast against white at 4.5:1 or better — `--color-faint` is currently
right at the limit.

There is one small script, `src/js/nav.js`, for the mobile navigation toggle, and it should
stay the only one. Everything else works without JavaScript: collapsible abstracts are
`<details>`, and with JS off the navigation simply stays expanded. Nothing is loaded from an
external host — no CDN fonts, scripts or analytics — and it is worth keeping it that way.

Structure — which fields appear and in what order — lives in the templates rather than in the
CSS: `src/pages/*.njk` for the listing pages, `src/_includes/layouts/` for the per-item pages,
and `src/_includes/partials/` for the pieces reused across them (a person card, a publication
entry, a news teaser). Changing `partials/publication.njk` changes how a paper is rendered on
`/publications/`, on every area page and on news items at once, because all three include it.

### Publishing

```sh
git push
```

That is the whole deploy. A GitHub Actions workflow validates the content, builds, runs the
link checker and publishes to GitHub Pages on every push to `main`; if validation fails,
nothing is published and the live site is untouched. Watch it in the Actions tab, or with
`gh run watch` — about a minute.

The one-time setup, and what has to happen for the site to answer at
`tdk.cs.technion.ac.il`, are in [`docs/deploy.md`](docs/deploy.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local preview at <http://localhost:8080> with live reload. What you use while working. |
| `npm run validate` | Checks `content/` against the schema. Must pass with zero errors. |
| `npm run build` | Validates, then writes `_site/`. |
| `npm run linkcheck` | After a build: verifies every internal link, anchor and asset in `_site/` resolves. |

## Troubleshooting

**The page did not update.** Check the terminal running `npm run dev`. A YAML syntax error in
front matter stops the build for that file, and Eleventy prints the filename.

**`npm run validate` says a slug "does not resolve".** The referenced file does not exist, or
its name differs — cross-references are filenames without `.md`. Renaming a content file
changes that entity's identity, so every reference to it has to change too.

**A new image does not show up.** Its path must start with `/assets/` and the file must exist
at that path on disk; `npm run validate` checks both. Images are copied through unchanged, so
crop and compress before adding them — people photos are displayed square, area and news
images at 3:2.

**An author name is not linked to their person page anchor.** The link is made when the author
string matches a person's `name` or one of their `aliases` exactly. `npm run validate` prints
the list of author names that match nobody; if one of them is a lab member, add that spelling
to their `aliases` — do not edit the publication.

**A person is in the wrong place on `/people/`.** Sections come from `group`, order within a
section from `order` (lower first), then `name`. Alumni are those with `status: alumni`, which
also removes their `group`.

**Everything looks unstyled.** `_site/css/site.css` is copied from `src/css/`; if you moved or
renamed that file, the `addPassthroughCopy` call in `eleventy.config.js` needs to match.

## Editing content

Read [`content/SCHEMA.md`](content/SCHEMA.md) first — it documents every content type and
field, with examples and common tasks. The rules that matter most:

- One file per entity; the filename is its slug and its identity.
- Every fact lives in exactly one file. Cross-reference by slug; never copy data between files.
  Lists that look derived — people in a research area, papers in an area, news about a person —
  *are* derived by the generator.
- Unknown fields are rejected by the validator.
- Run `npm run validate` after any change.

Two data conventions the generator leans on and that are worth keeping current:

- **`aliases` on a person** is how an author string in a publication gets linked to that
  person. `npm run validate` warns with the list of author names that match nobody; anyone in
  that list who *is* a lab member needs the spelling added to their `aliases`, rather than the
  publication being edited.
- **`areas` lives on the person and on the publication**, never on the area.

### The playbook

[`docs/playbook/`](docs/playbook/INDEX.md) holds recipes for the recurring update tasks — add
these papers, add a new member, write up this event. It starts empty and grows: when you ask
for something the playbook does not cover, the agent asks you the open questions, does the
work, and then records what was decided as a new recipe, so the second time it does not ask
again. `INDEX.md` is one line per recipe and is the only file read to find one.

Correct a recipe by saying so — it is folded into the existing file rather than piled up as a
second version of the same task.

## Layout

```
content/          the data (see content/SCHEMA.md)
  SCHEMA.md       field-by-field reference — read this before editing
  site.yaml       site-wide settings and navigation
  pages/ people/ areas/ publications/ news/ projects/ guides/
assets/           images and files referenced by content; copied to _site/assets/ unchanged
eleventy.config.js  routing, collections and filters — the only place URLs are decided
src/
  _data/site.js       loads content/site.yaml
  _includes/layouts/  base, page, area, news-item, guide
  _includes/partials/ header, nav, footer, person-card, person-compact, publication,
                      news-teaser, area-card
  pages/              one template per listing page, plus 404, sitemap.xml and feed.xml
  css/site.css        the only stylesheet
  js/nav.js           the only script
tools/
  validate.js     the content validator (npm run validate)
  linkcheck.js    internal link checker (npm run linkcheck)
  scrape/         one-off WordPress migration tool; do not re-run
.github/workflows/deploy.yml   builds and publishes to GitHub Pages on push to main
docs/
  deploy.md       how publishing works — read before the first deploy
  playbook/       content-update recipes
```

## Adding a new page type

Say you want `content/theses/`:

1. Add the type to `SCHEMA` in `tools/validate.js` and document it in `content/SCHEMA.md`.
2. In `eleventy.config.js`, add a branch to `routeFor()` mapping
   `content/theses/<slug>.md` to a permalink and a layout — this is the only place a URL is
   decided. A type with no page of its own returns `{ permalink: false }` and is rendered
   into other pages instead (that is how people, publications and projects work).
3. Add `eleventyConfig.addCollection('theses', …)` with the sort you want.
4. Add `src/_includes/layouts/thesis.njk` for the detail page, and — if it needs a listing
   page — `src/pages/theses.njk` plus an entry in `PAGE_ROUTES`. Every template under
   `src/pages/` must be in `PAGE_ROUTES`, because computed data overrides front matter.
5. Add the nav entry to `content/site.yaml`.

## Decisions worth knowing

Things that look like omissions but are deliberate. Change them if the reason stops holding —
each one is written down so you can tell whether it still does.

- **No `/people/<slug>/` pages.** People appear as cards on `/people/`, and every reference to
  a person elsewhere — publication authors, area members, news, project advisors — links to
  `/people/#<slug>`. A per-person `publicationsByPerson` filter would only be worth adding
  alongside such pages; today nothing would consume it.
- **No `@11ty/eleventy-img`.** `assets/` is copied through unchanged and CSS does the cropping
  (`aspect-ratio` + `object-fit`), which keeps the dependency list to Eleventy alone and the
  build under a second. Worth revisiting if the news galleries grow much larger.
- **`/publications/` lists every paper, not a curated subset.** The page began as a hand-picked
  "selected publications" list and went six years without an update: the only routine that ever
  ran was "a paper was accepted, write news", and that produced no publication record. Papers are
  now filed from the announcement (`publications:` on the news item), there is no `selected`
  field, and `tools/validate.js` warns when a `paper`-tagged news item references no publication.
  The general lesson: a list nobody is *forced* to update will not be updated.
- `markdownTemplateEngine` is `false`: Markdown under `content/` is data and is never run
  through a template engine, so `{{ }}` in a body would be printed, not evaluated.
