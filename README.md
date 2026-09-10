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
change.** You only run a build explicitly when you are about to publish (`npm run deploy` does
it for you) or when you want to run the link checker.

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
npm run deploy
```

That validates, builds, and rsyncs. Before the first deploy, set up the server details once:

```sh
cp deploy.env.example deploy.env
$EDITOR deploy.env          # DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH
```

`deploy.env` is gitignored because it holds server details. The script prints the `rsync`
command before running it and aborts with an explanation if the file is missing or incomplete.
Note the `--delete` flag: anything on the server that is not in `_site/` is removed.

It is worth running `npm run build && npm run linkcheck` before a deploy that touched anything
structural — it catches a renamed slug that left dangling links behind.

Setting up a server from scratch — a Linux VM on a bare IP first, then a domain with HTTPS,
plus the security settings that matter for a static site — is written up step by step in
[`docs/deploy-vm.md`](docs/deploy-vm.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local preview at <http://localhost:8080> with live reload. What you use while working. |
| `npm run validate` | Checks `content/` against the schema. Must pass with zero errors. |
| `npm run build` | Validates, then writes `_site/`. |
| `npm run linkcheck` | After a build: verifies every internal link, anchor and asset in `_site/` resolves. |
| `npm run deploy` | Builds, then rsyncs `_site/` to the CS server. |

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
  deploy.sh       rsync to the CS server (npm run deploy)
  scrape/         one-off WordPress migration tool; do not re-run
docs/             the original build specifications
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

## Deviations from the specs

`docs/spec-b-generator.md` left a few things open; what was decided:

- **No `/people/<slug>/` pages.** People appear as cards on `/people/`, and every reference to
  a person elsewhere — publication authors, area members, news, project advisors — links to
  `/people/#<slug>`. Consequently the spec's `publicationsByPerson` filter is not implemented;
  it had no consumer.
- **No `@11ty/eleventy-img`.** `assets/` is copied through unchanged and CSS does the cropping
  (`aspect-ratio` + `object-fit`), which keeps the dependency list to Eleventy alone and the
  build under a second. Worth revisiting if the news galleries grow much larger.
- **No GitHub Actions workflow**, since the project is not a git repository yet.
- `markdownTemplateEngine` is `false`: Markdown under `content/` is data and is never run
  through a template engine, so `{{ }}` in a body would be printed, not evaluated.
