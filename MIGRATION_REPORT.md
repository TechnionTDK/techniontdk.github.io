# Migration report — Step A

Migration of https://tdk.cs.technion.ac.il (WordPress) into `content/` + `assets/`.
Site fetched **2026-09-07**; cached HTML in `tools/scrape/cache/` (gitignored).

`npm run validate` passes with **0 errors** and 5 warnings (all expected — see below).

## Counts

| Type | Files | Notes |
|---|---|---|
| People | 43 | 18 active, 25 alumni |
| — faculty | 4 | |
| — visiting | 1 | |
| — staff | 3 | |
| — M.Sc. | 6 | |
| — Ph.D. | 3 | |
| — developer | 1 | |
| Research areas | 7 | |
| Publications | 20 | from 26 listed entries; 6 merges (below) |
| News items | 87 | 2017-03-06 … 2025-12-14 |
| Projects | 2 | |
| Pages | 4 | home, about, contact, courses |
| Guides | 1 | placeholder, authored not scraped |
| Assets | 78 files | 15 people photos, 7 area images, 50 news images, 1 project image, 5 site images |

## Judgment calls

### 1. `Databases & Machine Learning` had no tagline

`tagline` is required, but this area's card on `/research/` has an empty description
(all six others have one). Rather than invent a tagline, it was derived from the first
`We …` sentence of the area's own overview, which is how every other tagline reads:

> We develop and analyze database foundations for feature engineering

**Please review this one sentence.** It is the only text in `content/` not taken verbatim
from the site.

### 2. `contact.md` does not repeat person data

The Contact Us page shows cards for Benny Kimelfeld and Oren Mishali with photo, phone, fax
and email — data that also lives in `people/`. Duplicating it would violate "every fact lives
in exactly one file", and the two sources **disagree**:

| | People page (used) | Contact page (dropped) |
|---|---|---|
| Benny Kimelfeld | `+972 73 378 5528` | `+972 4 829 5528` |
| Oren Mishali | `+972 4 829 3375` | `+972 4 829 3375` (same) |

`people/*.md` carries the People-page numbers. **Which of Benny's two phone numbers is
current needs a human decision.** `contact.md` keeps only what is genuinely the page's own:
the lab name, postal address, and a map link built from the coordinates embedded in the
page's Google Maps script (32.77766138, 35.02151996). Fax numbers were dropped — there is no
`fax` field in the schema.

### 3. Publication venue names

Citation strings are DBLP-style. Two were normalised to the short form the schema asks for;
all others are used verbatim:

- `SIGMOD Conference` → `SIGMOD`
- `ACM Trans. Database Syst.` → `ACM TODS`

### 4. Area overview images

Each area page's overview begins with the same image the research index shows on its card.
The image was lifted into the `image:` field and removed from the body, so it is stored once.

### 5. News detail pages vs. index excerpts

The news index has 87 items. 15 of them also have a dedicated page, discovered from two
places that each list only some of them: the "more details" links on the index (9) and the
home page's "Latest Events" strip (13). The union was used. For those 15 the dedicated
page's full body replaces the index excerpt.

`cover` is the curated "Latest Events" thumbnail where the site had one (with the WordPress
`-336x194` suffix stripped to get the original), otherwise the first gallery image.
`photos` is the remaining gallery, in page order.

### 6. News tag heuristic

Tags are assigned by keyword match, on title **and** body unless noted. Every rule that
matches contributes a tag, so an item can carry several. This is a first pass — expect to
curate it.

| Tag | Matches (whole words) |
|---|---|
| `paper` | accepted, published, to appear, paper(s) |
| `award` | award(ed/s), won, winner, fellowship, prize, test-of-time |
| `grant` | grant(ed), funding, erc, isf, bsf, gif, dip |
| `event` | trip, meeting, retreat, graduation, contest, workshop, celebration |
| `visit` | visit(s/ing/or), joined, joins, welcome |
| `talk` | talk(s), seminar, lecture, presentation(s), keynote, tutorial |
| `media` | haaretz, interview, media, press, newspaper |
| `milestone` | server, cluster, anniversary, launched, milestone |
| `milestone` | **title only**: promoted, promotion, graduated, degrees, congratulations |
| `talk` | **title only**: demo, presented |

Two rules are title-only on purpose: "congratulations" appears in the body of nearly every
paper announcement, so matching it in bodies would tag everything as a milestone.

Resulting distribution across 87 items (0 untagged): paper 62, event 12, talk 10, award 9,
milestone 5, grant 4, visit 3, media 1.

### 7. News `people` cross-links

Filled only where a person's **full name** appears in the item's **title** — 16 of 87 items.
Body mentions were deliberately not matched (too noisy: co-author lists name many
non-members). `publications` was left empty for every item, as specified.

### 8. News slugs

`YYYY-MM-DD-` followed by the title slugified and truncated at a word boundary to 60
characters, so several long headlines are shortened, e.g.
`2017-03-06-accepted-to-sigmod-2018-a-query-engine-for-probabilistic`.
No collisions occurred. Many items share a date (the site was bulk-posted); that is expected
and preserved.

### 9. Person `order`

Document order within each group, numbered in tens (10, 20, 30 …) so the generator reproduces
the current on-site order and there is room to insert people later.

## Merged publications (deduplicated by title)

The site lists the same paper under each area it belongs to. 26 entries became 20 files;
`areas` is the union. The 6 merges:

| Paper | Areas merged into one file |
|---|---|
| Joining Extractions of Regular Expressions | text-analysis, query-optimization, enumeration-algorithms |
| Enumeration Complexity of Conjunctive Queries with Functional Dependencies | query-optimization, enumeration-algorithms |
| Counting and Enumerating (Preferred) Database Repairs | enumeration-algorithms, inconsistent-data-management |
| Detecting Ambiguity in Prioritized Database Repairing | inconsistent-data-management, preference-data-management |
| Towards Linked Data of Bible Quotations in Jewish Texts | text-analysis, knowledge-bases |

(Joining Extractions appears in three sections, hence two merge events for one paper.)

## Author name fixes

**None were needed.** Every author string on the publications page was already spelled
consistently; no typo of the "Beny Kimelfeld" kind was found. All author names are stored
verbatim as strings.

## Unresolved items and things to check

### Broken link on the source site (1)

`news/2019-05-05-haaretz-post-about-kira-and-galia-s-research-on-parkinson.md` links to a
locally hosted PDF copy of the Haaretz article:

```
/wp-content/uploads/2019/05/מחקר_-תרופות-ללחץ-דם-מגדילות-...-1.pdf
```

**This URL returns 404 on the live site** (verified directly, and with percent-encoding — the
file is gone, not a fetch problem). The link is therefore left pointing at the original
absolute URL rather than an asset that does not exist. Either restore the PDF and re-run the
scraper, or remove the sentence.

### Missing photo gallery (1)

`news/2025-08-31-extended-lab-meeting-august-19th-2025.md` ends with the line
*"(photos below)"* — but the gallery markup is **absent from the served HTML** of
`/extended-lab-meeting-august-19th-2025/`. The item got its `cover` from the home page strip
and has no `photos`.

This is loss on the source site, not in the migration: the pictures are not reachable from
the live page at all. **They will need to be re-uploaded from wherever the originals are
kept.** Note that the spec's acceptance criteria expected this item to carry a gallery.

For completeness, 8 other detail pages also have a `cover` and no `photos`, but those never
had a gallery — they are single-thumbnail items and are migrated faithfully:
`lab-meeting-9-5-24`, `group-meeting-with-jonas-israel`,
`our-innovative-tool-in-sefaria-2021-contest`, `cs-graduation-event…`,
`phd-seminar-by-liat-peterfreund`, `a-new-xeon-gold-server`, `dip-grant-awarded…`
(the last two carry an inline image inside the body instead), and
`accepted-to-sigmod-2018…`, which has no image anywhere and so has no `cover` either.

### Placeholder images skipped (4)

These used the theme's empty-silhouette placeholder, so `photo`/`image` was omitted per the
schema rather than pointing at a grey box:

- `people/along-goldenberg.md`, `people/hila-levy.md`, `people/boaz-berger.md` (M.Sc. students)
- `projects/automated-fair-causal-recommendations.md`

Only 15 of 43 people have a photo: all 25 alumni are listed without one on the source site,
and the 3 above use the placeholder.

### Field holding a URL (1)

`people/dean-light.md` has `office: "https://whereby.com/deanlight"` — a video-call link where
every other person has a room number. Kept verbatim as the spec requires, but it is clearly
being used as an ad-hoc "where to find me" field. Worth deciding whether the schema wants a
separate field or whether this belongs in `website`.

### Validator warnings (5, all expected)

- `2019-pods-regularizing-conjunctive` has no links — the site offers no paper link for it.
- 3 active people have no photo (the placeholders above).
- 21 publication author names match no person — external co-authors (Ronald Fagin, Julia
  Stoyanovich, Christopher Ré, …). Informational only. If any of them should link to a lab
  member under a different spelling, add that spelling to the person's `aliases`.

## Content deliberately not migrated

- **The Resources page** — dropped as specified; replaced by `guides/`, seeded with the
  placeholder `connecting-to-slurm.md`.
- **Home page sliders** (`slider-pic-*`) — decorative.
- **Facebook and Twitter icons** — they link to `#` on the live site.
- **Fax numbers** — no schema field.
- **The home page news ticker** — loaded by JavaScript and empty in the HTML; the generator
  will derive it from `news/` using `site.yaml`'s `home.news_count`.

## Notes on conversion

- All bodies are Markdown. **No HTML tags remain anywhere** in `content/` (verified by grep).
- Newer news bodies were pasted from chat tools and carried Tailwind class attributes
  (`class="font-claude-response-body …"`, `data-start=…`). All attributes except `href` on
  links and `src`/`alt` on images are stripped before conversion, so only structure survives.
- Abstracts on the publications page carried inline `style=` attributes and an `X` close
  button from the show/hide widget; both are removed.
- Images were downloaded at original resolution by stripping WordPress `-WxH` size suffixes.
  No fallback to a sized copy was needed — every original resolved.
- Every file in `assets/` is referenced by some content file, and every `/assets/` path in
  content exists on disk (checked in both directions).
