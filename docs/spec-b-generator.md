# docs/spec-b-generator.md — Step B: Eleventy generator

**Prerequisite: Step A approved.** If `content/SCHEMA.md` and this spec disagree, `SCHEMA.md` wins — it may have been revised during review.

## Goal

A static site generator that turns `content/` + `assets/` into `_site/`, with local preview and a deploy script. Simple, dependency-light, and presentation fully separated from data: templates define structure, one CSS file defines appearance.

## Technology

- **Eleventy 3.x**, Nunjucks templates, Markdown via Eleventy's default markdown-it. Pin versions in `package.json`.
- **No CSS framework, no JS framework, no build pipeline for CSS** (no Sass/PostCSS/Tailwind). One hand-written `src/css/site.css` using CSS custom properties. A second small `print.css` is optional.
- **JavaScript:** at most one small vanilla file for the mobile navigation toggle. Collapsible abstracts use `<details>/<summary>`. Nothing else. The site must be fully usable with JS disabled.
- Fonts: system font stack (no web-font downloads). If you want one display font, self-host it in `/assets/fonts/`; never load from a third-party CDN.
- Dependencies allowed: `@11ty/eleventy`, `gray-matter`/`js-yaml` (already there for the validator), optionally `@11ty/eleventy-img` for resizing photos. Nothing else without a stated reason in the README.

## Layout

```
eleventy.config.js
src/
  _includes/
    layouts/base.njk        # html skeleton, header, footer
    layouts/page.njk        # generic content page (title + body)
    layouts/news-item.njk
    layouts/area.njk
    layouts/guide.njk
    partials/header.njk, footer.njk, nav.njk
    partials/person-card.njk, person-compact.njk
    partials/publication.njk
    partials/news-teaser.njk
    partials/area-card.njk
  _data/
    site.js                 # loads content/site.yaml
  css/site.css
  js/nav.js
  pages/                    # one .njk per listing page (index, people, research, publications, news, projects, guides)
```

### Config requirements

- `content/` stays free of generator files. Use `dir.input = "."` with ignores for `node_modules`, `_site`, `tools`, `docs`, `*.md` at root, or another approach that achieves the same. Assign layout and permalink per content type in `eleventy.config.js` (e.g. via `addGlobalData("eleventyComputed", …)` keyed on `inputPath`), not via directory data files inside `content/`.
- Collections: `people`, `areas`, `publications`, `news`, `projects`, `guides`, `pages`, each built from its folder. Sort: people by `group` order then `order` then `name`; areas by `order`; publications by `year` desc then `title`; news by `date` desc; guides by `order` then `title`.
- Passthrough copy: `assets/` → `_site/assets/` (so data paths work unchanged), `src/css`, `src/js`.
- Add filters/shortcodes:
  - `personByName(name)` — resolves an author string to a person by `name` or `aliases`, used to link authors in publication lists.
  - `peopleInArea(slug)`, `publicationsInArea(slug)`, `publicationsByPerson(slug)` — derived lists.
  - `formatDate` (e.g. "14 Dec 2025"), `groupLabel` (`phd` → "Ph.D. Students", etc.).
- `npm run validate` runs before `build` and `deploy` (build fails if content is invalid).

## Pages and URLs

| URL | Source | Content |
|---|---|---|
| `/` | `src/pages/index.njk` + `pages/home.md` | Intro paragraph; research areas as a grid of 7 cards (image, title, tagline); latest `home.news_count` news items (date, title, summary or first paragraph); "In pictures": latest `home.photo_news_count` news items that have a `cover`, as image cards. No sliders, no carousels. |
| `/about/` | `pages/about.md` | Page layout |
| `/people/` | listing | Sections in this order: Faculty, Visiting Researchers, Staff, Ph.D. Students, M.Sc. Students, Software Developers, Alumni. Section anchors `#faculty`, `#phd`, … with a small in-page index at the top. Active people rendered as cards (photo or neutral placeholder, honorific + name, role, advisors as links, email/website icons as text links, office/phone, interests). Alumni rendered compactly: name, degree, email/website links — in two or three columns. |
| `/people/<slug>/` | per person | Optional but recommended: a small page with the card details plus "Publications" (derived) and "News" (derived from `people:`). Person names elsewhere link here. |
| `/research/` | listing | Cards for all areas by `order`. |
| `/research/<slug>/` | per area | Image, title, overview body, People (derived; active first, then alumni, marked), Collaborators, Publications (derived, year desc). |
| `/publications/` | listing | Only `selected: true`, grouped by year descending, each publication rendered **once** with its area tags (linking to area pages), author names linked where they match a person, links row (paper / arXiv / DOI / code…), abstract in `<details>`. |
| `/news/` | listing | All items, grouped by year with year headings, each: date, title (link), summary or excerpt, thumbnail if `cover`. |
| `/news/<yyyy>/<slug-without-date>/` | per item | Title, date, tags, body, cover, photo gallery (simple responsive grid of images, each linking to the full-size file), related people/publications if present. |
| `/projects/` | listing | `projects_intro`, then each open project: image (optional), title, advisors (mailto links via the person's email), body. |
| `/guides/` and `/guides/<slug>/` | listing + per guide | List with summary and updated date; guide page with body and "last updated". |
| `/courses/`, `/contact/` | pages | Page layout |
| `/404.html` | | Minimal |

Also generate `sitemap.xml` and `feed.xml` (RSS for news) — both cheap with Eleventy.

## Design brief

The current site is a 2018 agency template. Replace it with a calm, typographic, academic design:

- Single column of readable width (`max-width` ~72rem for grids, ~44rem for prose), generous whitespace, clear hierarchy through size and weight, not boxes and shadows.
- One accent color, a deep red in the spirit of the existing site's bordeaux (define as `--color-accent`); neutral grays for text; white background. All colors, font sizes, spacing scale and radii as custom properties at the top of `site.css`, so the look can be re-tuned without touching templates.
- Header: lab name/logo left, nav right; collapses to a toggle below ~48rem. Small affiliation logos (CS, Technion) in the footer, not the header.
- Photos: people photos square-cropped via CSS (`aspect-ratio: 1; object-fit: cover`), area/news images 3:2. Always set `width`/`height` or `aspect-ratio` to avoid layout shift. Use `loading="lazy"` below the fold.
- Responsive from 360px up. Check the People grid and the publications list at narrow widths.
- Accessibility: semantic landmarks, skip link, alt text (person name / news title), visible focus styles, color contrast ≥ 4.5:1.
- No animations beyond `<details>` opening. No hover-only information.

Provide the look in one pass; the owner will iterate on `site.css` variables afterwards.

## Scripts (`package.json`)

- `validate` — `node tools/validate.js`
- `dev` — `npx @11ty/eleventy --serve` (localhost:8080, live reload)
- `build` — `npm run validate && npx @11ty/eleventy`
- `deploy` — `npm run build && bash tools/deploy.sh`

`tools/deploy.sh`: reads `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` from `deploy.env` (gitignored; ship `deploy.env.example`), then `rsync -avz --delete _site/ $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/`. Print the command and abort with a clear message if `deploy.env` is missing.

Optional: a GitHub Actions workflow that runs `npm run build` on every push (build check only, no deployment).

## Acceptance criteria

- `npm run build` succeeds from a clean clone after `npm install`; `_site/` contains every URL in the table above.
- Every image path in `_site/` resolves; every internal link resolves (add a tiny link checker to `tools/` or use an existing one as a dev dependency).
- `npm run dev` serves the site locally with live reload on changes to both `content/` and `src/`.
- Each publication appears exactly once on `/publications/` and on each of its area pages.
- The site renders and is navigable with JavaScript disabled.
- No external requests at runtime (no CDN fonts, scripts, or analytics).
- `README.md` documents: how to preview, build, deploy; where to change colors/fonts; how to add a new page type (short).

Stop after acceptance criteria are met and summarize what was built, including any deviation from this spec and why.