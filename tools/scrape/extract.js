// Step A, extraction stage: tools/scrape/cache/*.html -> content/ + assets/.
// Deterministic and offline (assets are downloaded once, then reused).
// One-off migration tool. See README.md.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import {
  ROOT, SITE, slugify, shortSlug, uniqueSlug, writeDoc, toMarkdown,
  saveAsset, isPlaceholder, stripSizeSuffix,
} from './lib.js';

const CACHE = path.join(import.meta.dirname, 'cache');
const load = (name) => cheerio.load(fs.readFileSync(path.join(CACHE, name), 'utf8'));

// Everything notable that happens during extraction is recorded here and
// rendered into MIGRATION_REPORT.md, so the report describes the actual run.
const log = {
  counts: {},
  publication_merges: [],
  name_fixes: [],
  placeholder_images: [],
  assets_fallback: [],
  assets_failed: [],
  news_tags: [],
  news_detail_pages: [],
  news_no_photos: [],
  unresolved_anchors: [],
  notes: [],
};

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

// ===========================================================================
// People
// ===========================================================================

// In the order the research index page shows them. Object keys would not do:
// JS reorders integer-like keys numerically, which is not the site's order.
const AREAS = [
  [53, 'text-analysis'], [51, 'query-optimization'], [55, 'enumeration-algorithms'],
  [109, 'inconsistent-data-management'], [131, 'preference-data-management'],
  [129, 'knowledge-bases'], [113, 'databases-and-machine-learning'],
];
const AREA_BY_ID = Object.fromEntries(AREAS);
const AREA_ORDER = AREAS.map(([, slug]) => slug);

const GROUP_BY_HEADING = {
  'Faculty Members': 'faculty', 'Visiting Researchers': 'visiting', 'Staff': 'staff',
  'M.Sc.': 'msc', 'Ph.D.': 'phd', 'Software Developers': 'developer',
};

async function extractPeople() {
  const $ = load('people.html');
  const people = [];
  const byAnchor = new Map();
  const taken = new Set();
  let group = null, alumni = false;

  // The page is a flat sequence of headings and person cards; walk it in order
  // so each card picks up the group heading that precedes it.
  $('.pcomwrapper').find('h2, h3, .pcart_wrapper, .pcart_wrapper1').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'h2' || tag === 'h3') {
      const text = clean($(el).text());
      if (text === 'Alumni') { alumni = true; group = null; return; }
      if (text === 'Graduate Students') return;          // parent of M.Sc./Ph.D.
      if (GROUP_BY_HEADING[text]) { group = GROUP_BY_HEADING[text]; alumni = false; }
      return;
    }

    const $c = $(el);
    const anchor = $c.attr('id');
    // "Prof. Benny Kimelfeld</span>, Lab Head" -> name + honorific + trailing part
    const bold = clean($c.find('.bld').first().text());
    const trailing = clean($c.find('.pch_na, .pch_na1').first().contents()
      .filter((_, n) => n.type === 'text').text()).replace(/^,\s*/, '');

    let name = bold, honorific, boldRole;
    const h = bold.match(/^(Prof\.|Dr\.)\s+(.*)$/);
    if (h) { honorific = h[1]; name = h[2]; }
    // One card ("Dean Light, Research Consultant") keeps the role inside the
    // bold span instead of after it; the rest put it in the trailing text.
    const withRole = name.match(/^([^,]+),\s*(.+)$/);
    if (withRole) { name = clean(withRole[1]); boldRole = clean(withRole[2]); }

    const slug = uniqueSlug(slugify(name), taken);
    const person = { slug, name, honorific };

    if (alumni) {
      person.status = 'alumni';
      if (/^(Ph\.D\.|M\.Sc\.)$/.test(trailing)) person.degree = trailing;
      else if (trailing || boldRole) person.role = trailing || boldRole;
    } else {
      person.status = 'active';
      person.group = group;
      if (trailing || boldRole) person.role = trailing || boldRole;
      if (group === 'msc') person.degree = 'M.Sc.';
      if (group === 'phd') person.degree = 'Ph.D.';
    }

    const mailto = $c.find('a[href^="mailto:"]').first().attr('href');
    if (mailto) person.email = clean(decodeURIComponent(mailto.slice(7)));
    const site = $c.find('.pchicons a[target="_blank"], .pchicons1 a[target="_blank"]').first().attr('href');
    if (site) person.website = site;

    $c.find('.crtrow').each((_, row) => {
      const label = clean($(row).find('.crs_ds2, .crs_ds22').text()).replace(/:$/, '');
      const value = clean($(row).find('.csem, .pcart_content').text());
      if (!value) return;
      if (label === 'Phone') person.phone = value;
      else if (label === 'Office') person.office = value;
      else if (label === 'Research Interests') person.interests = value;
    });

    person._photoSrc = $c.find('.pciwr img').first().attr('src');
    person._anchor = anchor;
    people.push(person);
    if (anchor) byAnchor.set(anchor, slug);
  });

  // order: document order within each group / within alumni, in tens.
  const seen = {};
  for (const p of people) {
    const key = p.status === 'alumni' ? 'alumni' : p.group;
    seen[key] = (seen[key] ?? 0) + 1;
    p.order = seen[key] * 10;
  }

  // areas come from the research area pages, which point back by anchor
  const areaPeople = {};
  for (const [id, areaSlug] of AREAS) {
    const $a = load(`research-stl-${id}.html`);
    $a('.rspipitem a[href*="/people/#tdk"]').each((_, el) => {
      const anchor = $a(el).attr('href').split('#')[1];
      const slug = byAnchor.get(anchor);
      if (!slug) {
        log.unresolved_anchors.push({ area: areaSlug, anchor, text: clean($a(el).text()) });
        return;
      }
      (areaPeople[slug] ??= []).push(areaSlug);
    });
  }
  for (const p of people) {
    const areas = areaPeople[p.slug];
    if (areas) {
      p.areas = [...new Set(areas)].sort((a, b) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b));
    }
  }

  for (const p of people) {
    if (p._photoSrc && !isPlaceholder(p._photoSrc)) {
      p.photo = await saveAsset(p._photoSrc, 'images/people', p.slug, log);
    } else if (p._photoSrc) {
      log.placeholder_images.push({ type: 'person', slug: p.slug });
    }
  }

  for (const p of people) {
    await writeDoc(`content/people/${p.slug}.md`, {
      name: p.name, honorific: p.honorific, role: p.role, group: p.group,
      status: p.status, degree: p.degree, email: p.email, website: p.website,
      phone: p.phone, office: p.office, interests: p.interests, photo: p.photo,
      areas: p.areas, order: p.order,
    });
  }

  log.counts.people = people.length;
  return { people, byAnchor };
}

// ===========================================================================
// Areas
// ===========================================================================

async function extractAreas() {
  const $i = load('research.html');
  const index = [];
  $i('.rscard_wrapper').each((_, el) => {
    const id = Number($i(el).find('a[href*="stl="]').attr('href').match(/stl=(\d+)/)[1]);
    index.push({
      id, slug: AREA_BY_ID[id],
      title: clean($i(el).find('.rsinswr span').text()),
      tagline: clean($i(el).find('.rsdescrarea').text()),
      imageSrc: $i(el).find('.rsimgarea img').attr('src'),
      order: index.length + 1,
    });
  });

  for (const area of index) {
    const $a = load(`research-stl-${area.id}.html`);
    const image = await saveAsset(area.imageSrc, 'images/areas', area.slug, log);

    // Overview: the content between the "Overview" heading and the next h2.
    const overview = $a('h2').filter((_, el) => clean($a(el).text()) === 'Overview').first().next('div');
    overview.find('img').remove();          // same file as the index card image
    const body = toMarkdown($a, overview);

    // One area has no tagline on the index page. Rather than invent one, take
    // the overview's own "We ..." clause, which is how every other tagline reads.
    if (!area.tagline) {
      const sentence = body.split(/(?<=\.)\s+/).find((x) => /^We\s/.test(x)) ?? '';
      area.tagline = clean(sentence).replace(/,.*$/, '').replace(/\.$/, '');
      log.notes.push(`Area "${area.title}" has no tagline on the research index; ` +
        `derived from the first sentence of its overview: "${area.tagline}"`);
    }

    const collaborators = [];
    $a('.rspipitem.rsspp').each((_, el) => {
      const $link = $a(el).find('a').first();
      const c = { name: clean($link.text()) };
      const affiliation = clean($a(el).find('.rsclbw').text()).replace(/^,\s*/, '');
      if (affiliation) c.affiliation = affiliation;
      const url = $link.attr('href');
      if (url) c.url = url;
      collaborators.push(c);
    });

    await writeDoc(`content/areas/${area.slug}.md`, {
      title: area.title, tagline: area.tagline, image, order: area.order, collaborators,
    }, body);
  }

  log.counts.areas = index.length;
  return index;
}

// ===========================================================================
// Publications
// ===========================================================================

// DBLP-style venue strings as they appear in the citations, mapped to the short
// name the schema asks for. Anything not listed is used as-is.
const VENUE_ALIASES = {
  'SIGMOD Conference': 'SIGMOD',
  'ACM Trans. Database Syst.': 'ACM TODS',
};

const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'with',
  'from', 'by', 'over', 'into', 'at', 'as', 'via', 'towards']);

/** Pull venue, year and status out of the site's citation string. */
export function parseCitation(citation) {
  const c = clean(citation);

  // "CoRR abs/1712.08198 (2017). To appear in ICDT 2019" / "To appear in PODS, 2019"
  const appear = c.match(/To appear in\s+([A-Za-z. ]+?),?\s*(\d{4})/i);
  if (appear) {
    return { venue: normalizeVenue(appear[1]), year: Number(appear[2]), status: 'to-appear' };
  }
  // "CoRR abs/1801.06750, 2018" - an arXiv preprint with no venue yet
  const corr = c.match(/^CoRR\s+abs\/[\d.]+[,.]?\s*\(?(\d{4})\)?/i);
  if (corr) return { venue: 'CoRR', year: Number(corr[1]), status: 'preprint' };

  // Journal style: "J. ACM 62(2): 12:1-12:51 (2015)"
  const journal = c.match(/^(.*?)\s+\d+\(\d+\):.*\((\d{4})\)\s*$/);
  if (journal) return { venue: normalizeVenue(journal[1]), year: Number(journal[2]) };

  // Conference style: "PODS 2018: 137-149", "AAAI 2018"
  const conf = c.match(/^(.*?)\s+(\d{4})(?::|\s*$)/);
  if (conf) return { venue: normalizeVenue(conf[1]), year: Number(conf[2]) };

  return { venue: undefined, year: undefined };
}

function normalizeVenue(v) {
  // Keep a trailing period: it is part of "ACM Trans. Database Syst." as the
  // alias table spells it. Only a trailing comma is noise.
  const t = clean(v).replace(/,$/, '');
  return VENUE_ALIASES[t] ?? t;
}

/** "2018-pods-joining-extractions" from year, venue and the first title words. */
function publicationSlug(year, venue, title, taken) {
  const venuePart = slugify(venue).replace(/-/g, '');
  const words = slugify(title).split('-').filter((w) => w && !STOPWORDS.has(w));
  for (const n of [2, 3, 4]) {
    const candidate = `${year}-${venuePart}-${words.slice(0, n).join('-')}`;
    if (!taken.has(candidate)) { taken.add(candidate); return candidate; }
  }
  return uniqueSlug(`${year}-${venuePart}-${words.join('-')}`, taken);
}

const normalizeTitle = (t) =>
  t.toLowerCase().replace(/[\u2018\u2019\u201c\u201d"']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function extractPublications() {
  const $ = load('selected-publications.html');
  const byTitle = new Map();
  let area = null;

  $('.pub_wr').find('h2, .pubitemwr').each((_, el) => {
    if (el.tagName.toLowerCase() === 'h2') {
      area = AREA_BY_ID[Number($(el).attr('id'))];
      return;
    }
    const $item = $(el);
    const $title = $item.find('span.sbold').first();

    // Authors are the text before the title span; the citation is the text
    // after it, up to the first button.
    const title = clean($title.text()).replace(/^[\u201c"]|[\u201d"]$/g, '');
    const authors = clean($title.prevAll().addBack().not($title).text() ||
                          $item.contents().first().text())
      .replace(/,\s*$/, '')
      .split(/\s*,\s*|\s+and\s+/)
      .map(clean).filter(Boolean);

    let citation = '';
    for (const node of $title.nextAll().addBack().toArray()) {
      if (node === $title[0]) continue;
      if ($(node).hasClass('pbtn') || $(node).hasClass('to_expand')) break;
    }
    citation = clean($item.contents().filter((_, n) => n.type === 'text').last().text())
      .replace(/^,\s*/, '').replace(/\s*$/, '');

    const links = {};
    $item.find('a.mbtn[target="_blank"]').each((_, a) => {
      const label = clean($(a).text());
      const href = $(a).attr('href');
      if (['paper', 'arxiv', 'doi', 'code', 'slides', 'video'].includes(label)) links[label] = href;
    });
    // A DOI URL used as the paper link is also a doi link.
    if (links.paper && /doi\.org\//.test(links.paper)) links.doi = links.paper;

    const $abs = $item.find('.to_expand').first();
    const abstract = $abs.length ? toMarkdown($, $abs) : '';

    const key = normalizeTitle(title);
    const existing = byTitle.get(key);
    if (existing) {
      if (!existing.areas.includes(area)) existing.areas.push(area);
      log.publication_merges.push({ title, area, merged_into: existing.areas.join(', ') });
      return;
    }
    byTitle.set(key, { title, authors, citation, links, abstract, areas: [area] });
  });

  const taken = new Set();
  const pubs = [...byTitle.values()];
  for (const pub of pubs) {
    const { venue, year, status } = parseCitation(pub.citation);
    if (!venue || !year) {
      log.notes.push(`Could not parse venue/year from citation: "${pub.citation}" (${pub.title})`);
      continue;
    }
    pub.slug = publicationSlug(year, venue, pub.title, taken);
    pub.areas.sort((a, b) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b));
    await writeDoc(`content/publications/${pub.slug}.md`, {
      title: pub.title, authors: pub.authors, venue, year,
      citation: pub.citation, status, links: pub.links,
      areas: pub.areas, selected: true,
    }, pub.abstract);
  }

  log.counts.publications = pubs.length;
  return pubs;
}

// ===========================================================================
// Projects
// ===========================================================================

async function extractProjects(people) {
  const $ = load('projects.html');
  const byEmail = new Map(people.filter((p) => p.email).map((p) => [p.email.toLowerCase(), p.slug]));
  const byName = new Map(people.map((p) => [p.name.toLowerCase(), p.slug]));
  const taken = new Set();
  let count = 0;

  for (const el of $('.pcart_wrapper2').toArray()) {
    const $p = $(el);
    const title = clean($p.find('.bld').first().text());
    const slug = uniqueSlug(shortSlug(title), taken);

    const advisors = [];
    $p.find('a.tdk_advlk').each((_, a) => {
      const email = ($(a).attr('href') ?? '').replace(/^mailto:/, '').trim().toLowerCase();
      const name = clean($(a).text()).replace(/^(Prof\.|Dr\.)\s+/, '').toLowerCase();
      const resolved = byEmail.get(email) ?? byName.get(name);
      if (resolved) advisors.push(resolved);
      else log.notes.push(`Project "${title}": advisor "${clean($(a).text())}" <${email}> matched no person`);
    });

    const imgSrc = $p.find('.pciwr1 img').first().attr('src');
    let image;
    if (imgSrc && !isPlaceholder(imgSrc)) image = await saveAsset(imgSrc, 'images/projects', slug, log);
    else if (imgSrc) log.placeholder_images.push({ type: 'project', slug });

    const body = toMarkdown($, $p.find('.pcart_content').first());
    await writeDoc(`content/projects/${slug}.md`, { title, advisors, image, status: 'open' }, body);
    count++;
  }

  log.counts.projects = count;
  return clean($('.pcontent.stpage > p').first().text());
}

// ===========================================================================
// Pages and guides
// ===========================================================================

/** Download every <img> in `root` and rewrite its src to the local asset path. */
async function localizeImages($, root, destDir) {
  for (const img of $(root).find('img').toArray()) {
    const src = $(img).attr('src');
    if (!src || isPlaceholder(src)) { $(img).remove(); continue; }
    const base = slugify(path.basename(stripSizeSuffix(src)).replace(/\.[a-z0-9]+$/i, ''));
    const local = await saveAsset(src, destDir, base, log);
    if (local) $(img).attr('src', local); else $(img).remove();
  }
}

async function extractPages() {
  const $h = load('index.html');
  await writeDoc('content/pages/home.md', { title: 'Home' },
    toMarkdown($h, $h('.mptxtar p').first()));

  const $m = load('our-mission.html');
  const mission = $m('.pcontent').first();
  await localizeImages($m, mission, 'images/site');
  await writeDoc('content/pages/about.md', { title: 'Our Mission' }, toMarkdown($m, mission));

  const $c = load('courses.html');
  await writeDoc('content/pages/courses.md', { title: 'Courses' },
    toMarkdown($c, $c('.pcontent').first()));

  // The contact page's cards repeat person data that lives in content/people/
  // (with conflicting phone numbers, see MIGRATION_REPORT.md), so the page keeps
  // only what is genuinely its own: the address and the map.
  const $ct = load('contact-us.html');
  const org = clean($ct('.cnttbmst1').text());
  const address = clean($ct('.cnttbmst2').text());
  const coords = (fs.readFileSync(path.join(CACHE, 'contact-us.html'), 'utf8')
    .match(/LatLng\(([\d.]+),\s*([\d.]+)\)/) ?? []).slice(1);
  const map = coords.length
    ? `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`
    : null;
  const body = [
    `**${org}**`,
    '',
    address,
    '',
    'For general enquiries please contact the lab head or the lab engineer; their',
    'email addresses are listed on the [People](/people/) page.',
    ...(map ? ['', `[View the lab on a map](${map})`] : []),
  ].join('\n');
  await writeDoc('content/pages/contact.md', { title: 'Contact Us' }, body);

  log.counts.pages = 4;
}

async function extractGuides() {
  await writeDoc('content/guides/connecting-to-slurm.md', {
    title: 'Connecting to the SLURM cluster',
    summary: 'How to get an account, log in, and submit your first job.',
    updated: new Date('2026-09-07'),
    author: 'oren-mishali',
    order: 1,
  }, '_Draft — to be written._');
  log.counts.guides = 1;
}

// ===========================================================================
// News
// ===========================================================================

// Applied in order; every rule that matches contributes a tag.
// Applied in order; every rule that matches contributes a tag. Word boundaries
// matter here: without them "wonderful" matches "won" and tags a lab meeting
// as an award.
const TAG_RULES = [
  [/\b(accepted|published|to appear|papers?)\b/i, 'paper'],
  [/\b(award|awarded|awards|won|winner|fellowship|prize|test-of-time)\b/i, 'award'],
  [/\b(grant|granted|funding|erc|isf|bsf|gif|dip)\b/i, 'grant'],
  [/\b(trip|meeting|retreat|graduation|contest|workshop|celebration)\b/i, 'event'],
  [/\b(visit|visits|visiting|visitor|joined|joins|welcome)\b/i, 'visit'],
  [/\b(talk|talks|seminar|lecture|presentation|presentations|keynote|tutorial)\b/i, 'talk'],
  [/\b(haaretz|interview|media|press|newspaper)\b/i, 'media'],
  [/\b(server|cluster|anniversary|launched|milestone)\b/i, 'milestone'],
];

// Matched against the title only. "Congratulations" is the giveaway for a
// personal milestone in a headline, but it appears in the body of almost every
// paper announcement, so it cannot be a full-text rule.
const TITLE_TAG_RULES = [
  [/\b(promoted|promotion|graduated|degrees|congratulations)\b/i, 'milestone'],
  [/\b(demo|presented)\b/i, 'talk'],
];

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg)$/i;

function assignTags(title, body) {
  const hay = `${title}\n${body}`;
  const tags = [
    ...TAG_RULES.filter(([re]) => re.test(hay)).map(([, tag]) => tag),
    ...TITLE_TAG_RULES.filter(([re]) => re.test(title)).map(([, tag]) => tag),
  ];
  return [...new Set(tags)];
}

/** Full-name mentions in the *title* only; the human curates the rest. */
function peopleInTitle(title, people) {
  return people
    .filter((p) => new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(title))
    .map((p) => p.slug);
}

/** Read the "Latest Events" strip: detail page path -> curated lead image. */
function homeStripCovers() {
  const $ = load('index.html');
  const covers = new Map();
  $('.mslick2 .cimg_wrapper').each((_, el) => {
    const href = $(el).find('a').attr('href');
    const src = $(el).find('img').attr('src');
    if (href && src) covers.set(new URL(href).pathname, src);
  });
  return covers;
}

/** Parse every cached news detail page, keyed by its normalized title. */
function detailPages() {
  const manifest = JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8'));
  const byTitle = new Map();
  for (const p of manifest.detail_pages) {
    const name = p.replace(/^\/|\/$/g, '') + '.html';
    const $ = load(name);
    const title = clean($('h1.phnn').text());
    if (!title) continue;
    byTitle.set(normalizeTitle(title), { path: p, $, title });
  }
  return byTitle;
}

async function extractNews(people) {
  const $l = load('news-events.html');
  const covers = homeStripCovers();
  const details = detailPages();
  const taken = new Set();
  const matched = new Set();
  let count = 0;

  for (const el of $l('.newscontent').toArray()) {
    const $item = $l(el);
    const title = clean($item.find('h2.newsheader').text());
    const [dd, mm, yyyy] = clean($item.find('.pdate').text()).split('.');
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    const slug = uniqueSlug(`${yyyy}-${mm}-${dd}-${shortSlug(title)}`, taken);

    // Prefer the dedicated page's full body over the index excerpt.
    const detail = details.get(normalizeTitle(title));
    if (detail) matched.add(normalizeTitle(title));
    const $d = detail ? detail.$ : $l;
    const $body = detail ? detail.$('.pcontent2').first() : $item.find('.snewstxt').first();

    const gallery = [];
    if (detail) {
      $body.find('.popup-gallery .grid-item a[href]').each((_, a) => gallery.push($d(a).attr('href')));
      $body.find('.galcnt, .popup-gallery').remove();
    }

    // Cover: the curated strip thumbnail if the site had one, else the first
    // gallery picture. Whichever is used is not repeated in `photos`.
    const stripSrc = detail ? covers.get(detail.path) : undefined;
    let cover, photos = [];
    if (stripSrc) {
      cover = await saveAsset(stripSrc, `images/news/${yyyy}`, shortSlug(title), log);
      photos = gallery;
    } else if (gallery.length) {
      cover = await saveAsset(gallery[0], `images/news/${yyyy}`, shortSlug(title), log);
      photos = gallery.slice(1);
    }
    const photoPaths = [];
    for (const [i, url] of photos.entries()) {
      const saved = await saveAsset(url, `images/news/${yyyy}`,
        `${shortSlug(title)}-${String(i + 1).padStart(2, '0')}`, log);
      if (saved) photoPaths.push(saved);
    }

    // Inline body images, and locally hosted downloads such as the Haaretz PDF.
    await localizeImages($d, $body, `images/news/${yyyy}`);
    for (const a of $body.find('a[href*="wp-content/uploads"]').toArray()) {
      const href = $d(a).attr('href');
      if (IMAGE_EXT.test(href.split('?')[0])) continue;
      const base = slugify(path.basename(href).replace(/\.[a-z0-9]+$/i, ''));
      const saved = await saveAsset(href, `files/news/${yyyy}`, base, log);
      if (saved) $d(a).attr('href', saved);
    }

    const body = toMarkdown($d, $body);
    const tags = assignTags(title, body);
    const mentioned = peopleInTitle(title, people);

    if (detail) {
      log.news_detail_pages.push({ slug, page: detail.path, photos: photoPaths.length, cover: Boolean(cover) });
      if (/photos below/i.test(body) && photoPaths.length === 0) {
        log.news_no_photos.push({ slug, page: detail.path });
      }
    }
    log.news_tags.push({ slug, tags });

    await writeDoc(`content/news/${slug}.md`, {
      title, date, cover, photos: photoPaths, tags, people: mentioned,
    }, body);
    count++;
  }

  for (const [key, d] of details) {
    if (!matched.has(key)) log.notes.push(`Detail page ${d.path} ("${d.title}") matched no item on the news index`);
  }

  log.counts.news = count;
}

// ===========================================================================
// site.yaml
// ===========================================================================

async function extractSite(projectsIntro) {
  const $ = load('index.html');
  const logo = await saveAsset($('.logos_wrapper h1 img').attr('src'), 'images/site', 'logo-tdk', log);
  const csLogo = await saveAsset($('#logocs img').attr('src'), 'images/site', 'logo-cs', log);
  const techLogo = await saveAsset($('#logotech img').attr('src'), 'images/site', 'logo-technion', log);

  // One sentence describing the lab, taken from the mission page's Background.
  const $m = load('our-mission.html');
  const description = clean($m('.pcontent p').eq(1).text()).split(/(?<=\.)\s+/)[1]
    ?? clean($m('.pcontent p').eq(1).text());

  const yaml = `name: Technion Data & Knowledge Lab
short_name: TD&K
url: ${SITE}
description: ${description}
logo: ${logo}
affiliations:
  - name: Faculty of Computer Science
    url: https://cs.technion.ac.il/
    logo: ${csLogo}
  - name: Technion
    url: https://www.technion.ac.il/
    logo: ${techLogo}
nav:
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
  news_count: 5
  photo_news_count: 4
projects_intro: ${projectsIntro}
`;
  await fsp.writeFile(path.join(ROOT, 'content/site.yaml'), yaml);
}

// ===========================================================================

async function main() {
  const { people } = await extractPeople();
  await extractAreas();
  await extractPublications();
  const projectsIntro = await extractProjects(people);
  await extractNews(people);
  await extractPages();
  await extractGuides();
  await extractSite(projectsIntro);

  await fsp.writeFile(path.join(CACHE, 'extraction-log.json'), JSON.stringify(log, null, 2));
  console.log('Extracted:', log.counts);
  console.log(`Merges: ${log.publication_merges.length}  ` +
              `Placeholders skipped: ${log.placeholder_images.length}  ` +
              `Asset failures: ${log.assets_failed.length}  ` +
              `Notes: ${log.notes.length}`);
}

if (process.argv[1] === import.meta.filename) await main();

export {
  extractPeople, extractAreas, extractPublications, extractProjects,
  extractPages, extractGuides, extractNews, extractSite, main,
  AREA_BY_ID, AREA_ORDER, log, load, clean, CACHE,
};
