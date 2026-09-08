# Content schema

This directory is the **data** for the TD&K Lab website. It is the source of truth.
The generator (`src/`, `eleventy.config.js`) reads it and produces `_site/`; nothing here
knows about layouts, URLs or templates.

Read this file before editing anything under `content/`. After any change run:

```
npm run validate
```

which enforces every rule below and must pass with zero errors.

## Ground rules

1. **One file per entity.** The filename without `.md` is the entity's **slug** and its identity.
   Slugs are lowercase ASCII words joined by `-`. Renaming a file changes the entity's identity,
   so every reference to it must be updated too.
2. **Every fact lives in exactly one file.** Never copy data between files. Lists that look
   derived — the people in a research area, the papers by a person, the news mentioning someone —
   *are* derived by the generator from the cross-references described below.
3. **Front matter is YAML** between `---` lines; the body below it is CommonMark Markdown.
4. **Unknown fields are rejected.** Only the fields listed for a type may appear. This is what
   keeps the data predictable for agents; if you need a new field, change the schema *and*
   `tools/validate.js` deliberately.
5. **Omit empty optional fields.** Never write `field:` with nothing after it, `null`, or `""`.
6. **Dates are unquoted ISO** `YYYY-MM-DD`.
7. **Cross-references are slugs**, e.g. `advisors: [benny-kimelfeld]`. The validator checks that
   each one resolves to an existing file of the right type.
8. **Asset paths are root-relative** and start with `/assets/`, e.g.
   `/assets/images/people/benny-kimelfeld.jpg`. The validator checks the file exists on disk.
9. **Fields hold plain text, not HTML.** Bodies hold Markdown. No raw HTML anywhere.

## Types at a glance

| Type | Directory | Slug shape |
|---|---|---|
| Site settings | `site.yaml` | — (single file) |
| Page | `pages/` | fixed: `home`, `about`, `contact`, `courses` |
| Person | `people/` | `firstname-lastname` |
| Research area | `areas/` | `topic-name` |
| Publication | `publications/` | `<year>-<venue>-<keywords>` |
| News item | `news/` | `YYYY-MM-DD-<short-title>` |
| Project | `projects/` | `project-title` |
| Guide | `guides/` | `guide-title` |

---

## `site.yaml`

Site-wide settings. Plain YAML, no front matter markers, no body.

```yaml
name: Technion Data & Knowledge Lab
short_name: TD&K
url: https://tdk.cs.technion.ac.il
description: <one sentence describing the lab>
logo: /assets/images/site/logo-tdk.png
affiliations:                  # shown in the header/footer
  - name: Faculty of Computer Science
    url: https://cs.technion.ac.il/
    logo: /assets/images/site/logo-cs.png
nav:                           # order of the main navigation
  - { label: About, url: /about/ }
footer:
  copyright: "© Technion Data & Knowledge Lab"
  links:
    - { label: Accessibility, url: https://www.technion.ac.il/en/accessaility-statement/ }
home:
  news_count: 5                # how many news items on the home page
  photo_news_count: 4          # how many photo-bearing news items on the home page
projects_intro: <intro paragraph shown above the projects list>
```

`nav` urls are root-relative and end in `/`. `footer.links` urls are absolute.

---

## `pages/*.md`

A fixed set of four: `home.md`, `about.md`, `contact.md`, `courses.md`. You may edit them but
must not add or remove pages here — a new page needs a generator change.

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | text | Page heading. Ignored by the generator for `home.md`. |

```yaml
---
title: Our Mission
---
Body in Markdown.
```

`home.md`'s body is the introduction shown on the home page. `contact.md` deliberately does **not**
repeat phone numbers or email addresses — those live in `people/` (rule 2).

---

## `people/<slug>.md`

Slug is `firstname-lastname`. The body is normally empty; if written, it is a short bio in Markdown.

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | yes | text | As displayed, **without** honorific. |
| `status` | yes | `active` \| `alumni` | |
| `group` | active only | `faculty` \| `visiting` \| `staff` \| `phd` \| `msc` \| `developer` | Required while `status: active`; alumni have no group. |
| `honorific` | no | `Prof.` \| `Dr.` | |
| `role` | no | text | Free text shown after the name, e.g. `Lab Head`, `Research Consultant`. |
| `degree` | no | `Ph.D.` \| `M.Sc.` | The degree pursued (students) or obtained (alumni). |
| `advisors` | no | list of `people` slugs | |
| `email` | no | text | |
| `website` | no | url | |
| `phone` | no | quoted text | Quote it — it is not a number. |
| `office` | no | quoted text | As written on the site. |
| `interests` | no | text | Plain prose, comma-separated topics. |
| `photo` | no | asset path | Omit when there is no real photo; never point at a placeholder. |
| `areas` | no | list of `areas` slugs | Which research areas this person works in. |
| `aliases` | no | list of text | Alternative spellings used in publication author lists. |
| `order` | no | integer | Lower sorts earlier **within the person's group**. |

```yaml
---
name: Benny Kimelfeld
honorific: Prof.
role: Lab Head
group: faculty
status: active
email: bennyk@cs.technion.ac.il
website: http://benny.net.technion.ac.il
phone: "+972 73 378 5528"
office: "651"
interests: Database systems and theory, information extraction, ...
photo: /assets/images/people/benny-kimelfeld.jpg
areas: [text-analysis, query-optimization]
order: 10
---
```

**`areas` lives here, not on the area.** To add a person to a research area, add the area's slug
to that person's `areas` list. An alumnus may keep their `areas`.

**`aliases` matter for publications.** The generator links an author name in a publication to a
person when the string equals the person's `name` or one of their `aliases`. If a paper spells
someone `B. Kimelfeld`, add that spelling to `aliases` — do not edit the publication.

---

## `areas/<slug>.md`

The body is the area's overview text in Markdown.

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | text | |
| `tagline` | yes | text | One line, shown on the research index. |
| `image` | no | asset path | |
| `order` | no | integer | Position on the research index. |
| `collaborators` | no | list | Each entry: `name` (required), `affiliation`, `url`. |

```yaml
---
title: Text Analysis
tagline: We develop foundations of declarative languages for analyzing text alongside structured data
image: /assets/images/areas/text-analysis.jpg
order: 1
collaborators:
  - name: Ron Fagin
    affiliation: IBM, USA
    url: https://researcher.watson.ibm.com/researcher/view.php?person=us-fagin
---
Overview in Markdown.
```

**People and publications are not listed here.** They are derived from `areas:` on each person and
each publication.

---

## `publications/<slug>.md`

Slug is `<year>-<venue>-<two-or-three-keywords>`, e.g. `2018-pods-joining-extractions`.
The body is the abstract in Markdown, and may be empty.

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | text | |
| `authors` | yes | list of text | In display order, full names as published. **Plain strings, not slugs.** |
| `venue` | yes | text | Short name as commonly cited: `PODS`, `SIGMOD`, `ICDT`, `J. ACM`, `ACM TODS`. |
| `year` | yes | integer | |
| `areas` | yes | list of `areas` slugs | At least one. |
| `selected` | yes | boolean | `true` for papers featured as selected publications. |
| `citation` | no | quoted text | The full venue/pages string as cited. |
| `status` | no | `published` \| `to-appear` \| `preprint` | Defaults to `published` when omitted. |
| `links` | no | mapping | Keys from exactly: `paper`, `arxiv`, `doi`, `code`, `slides`, `video`. |

```yaml
---
title: Joining Extractions of Regular Expressions
authors:
  - Dominik D. Freydenberger
  - Benny Kimelfeld
  - Liat Peterfreund
venue: PODS
year: 2018
citation: "PODS 2018: 137-149"
links:
  paper: https://arxiv.org/pdf/1703.10350.pdf
areas: [text-analysis, query-optimization, enumeration-algorithms]
selected: true
---
Abstract in Markdown.
```

**Authors stay as strings.** The generator links them to people by name (see `aliases` above).
A paper belonging to several research areas is **one file** listing all of them in `areas`.

For a `to-appear` paper, `venue` and `year` are the *target* venue's, while `citation` keeps the
original string, e.g. `"CoRR abs/1712.08198 (2017). To appear in ICDT 2019"`.

---

## `news/<slug>.md`

Slug is `YYYY-MM-DD-<short-title>`; the date prefix must equal the `date` field, so the directory
sorts chronologically. The body is the item's text in Markdown.

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | text | |
| `date` | yes | date | Unquoted `YYYY-MM-DD`. |
| `summary` | no | text | One sentence; use when the body is long. |
| `cover` | no | asset path | Lead image / thumbnail. |
| `photos` | no | list of asset paths | Gallery, in display order, excluding `cover`. |
| `tags` | no | list | From: `paper`, `award`, `grant`, `event`, `visit`, `talk`, `media`, `milestone`. |
| `people` | no | list of `people` slugs | Lab members this item is about. |
| `publications` | no | list of `publications` slugs | Papers this item is about. |

```yaml
---
title: Three papers accepted to SIGMOD 2026
date: 2025-12-14
cover: /assets/images/news/2025/extended-lab-meeting.jpg
photos:
  - /assets/images/news/2025/extended-lab-meeting-01.jpg
tags: [paper]
people: [shunit-agmon, brit-youngmann]
---
Body in Markdown.
```

News images live under `/assets/images/news/<year>/`; downloadable files under
`/assets/files/news/<year>/`.

---

## `projects/<slug>.md`

Student projects offered by the lab. The body is the project description in Markdown.

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | text | |
| `advisors` | yes | list of `people` slugs | At least one. |
| `image` | no | asset path | Omit rather than pointing at a placeholder. |
| `status` | no | `open` \| `closed` | Defaults to `open`. |
| `audience` | no | list of `msc` \| `phd` \| `undergrad` | Defaults to all three. |

```yaml
---
title: The Jewish Bookshelf Project
advisors: [oren-mishali]
image: /assets/images/projects/the-jewish-bookshelf-project.jpg
status: open
audience: [msc, phd, undergrad]
---
Description in Markdown.
```

The paragraph introducing the projects page is `projects_intro` in `site.yaml`, not here.

---

## `guides/<slug>.md`

How-to documents for lab members. The body is the guide in Markdown.

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | text | |
| `summary` | yes | text | One sentence, shown in the guides index. |
| `updated` | yes | date | Bump this whenever you edit the body. |
| `author` | no | `people` slug | |
| `order` | no | integer | Position in the guides index. |

```yaml
---
title: Connecting to the SLURM cluster
summary: How to get an account, log in, and submit your first job.
updated: 2026-09-07
author: oren-mishali
order: 1
---
Body in Markdown.
```

---

## Common tasks

**Add a person.** Create `people/<firstname-lastname>.md` with at least `name` and `status`
(plus `group` if active). Put the photo at `/assets/images/people/<slug>.jpg`. Set `order` relative
to the others in their group. Add `areas` for the research areas they work in.

**A student graduates.** In their file: set `status: alumni`, remove `group`, keep `degree`,
`email` and `areas`. Do not delete the file — publications and news still reference the person
by name and slug.

**Add a publication.** Create one file, list *all* its research areas in `areas`, and keep the
author names exactly as published. If a lab member's name is spelled differently there, add that
spelling to their `aliases` instead of changing the publication.

**Add a news item.** Filename date must match the `date` field. Put images in
`/assets/images/news/<year>/`.

**Check your work.** `npm run validate` — it reports errors (which must be fixed) and warnings
(worth reading: a publication with no links, an active person with no photo, an author name that
matches no person).
