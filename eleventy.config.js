// The generator. Turns content/ + assets/ into _site/.
//
// content/ knows nothing about layouts or URLs: every type -> layout/permalink
// mapping lives in routeFor() below, and every derived list (people per area,
// publications per area, author -> person) is computed from the cross-references
// documented in content/SCHEMA.md.

import path from 'node:path';

// --- routing ---------------------------------------------------------------

// Listing pages and the two XML feeds. Everything under src/pages/ must appear
// here: eleventyComputed overwrites front matter, so front matter cannot supply
// a permalink of its own.
const PAGE_ROUTES = {
  'index.njk':        { permalink: '/index.html',  layout: 'layouts/base.njk' },
  'people.njk':       { permalink: '/people/',     layout: 'layouts/base.njk' },
  'research.njk':     { permalink: '/research/',   layout: 'layouts/base.njk' },
  'publications.njk': { permalink: '/publications/', layout: 'layouts/base.njk' },
  'news.njk':         { permalink: '/news/',       layout: 'layouts/base.njk' },
  'projects.njk':     { permalink: '/projects/',   layout: 'layouts/base.njk' },
  'guides.njk':       { permalink: '/guides/',     layout: 'layouts/base.njk' },
  '404.njk':          { permalink: '/404.html',    layout: 'layouts/base.njk' },
  'sitemap.njk':      { permalink: '/sitemap.xml' },
  'feed.njk':         { permalink: '/feed.xml' },
};

// Content types that are data only: they are rendered into listings by other
// templates and never get a URL of their own.
const DATA_ONLY = ['people', 'publications', 'projects'];

const NO_PAGE = { permalink: false };

function routeFor(inputPath) {
  const p = String(inputPath).replace(/^\.\//, '');
  const slug = path.basename(p).replace(/\.[^.]+$/, '');

  if (p.startsWith('src/pages/')) return PAGE_ROUTES[path.basename(p)] ?? NO_PAGE;

  if (p.startsWith('content/pages/')) {
    // home.md is the intro paragraph on /, not a page of its own.
    if (slug === 'home') return NO_PAGE;
    return { permalink: `/${slug}/`, layout: 'layouts/page.njk' };
  }
  if (p.startsWith('content/areas/')) {
    return { permalink: `/research/${slug}/`, layout: 'layouts/area.njk' };
  }
  if (p.startsWith('content/news/')) {
    const m = slug.match(/^(\d{4})-\d{2}-\d{2}-(.+)$/);
    if (!m) throw new Error(`news filename is not YYYY-MM-DD-<slug>: ${p}`);
    return { permalink: `/news/${m[1]}/${m[2]}/`, layout: 'layouts/news-item.njk' };
  }
  if (p.startsWith('content/guides/')) {
    return { permalink: `/guides/${slug}/`, layout: 'layouts/guide.njk' };
  }
  if (DATA_ONLY.some((d) => p.startsWith(`content/${d}/`))) return NO_PAGE;

  return NO_PAGE;
}

// --- derived indexes -------------------------------------------------------
// Rebuilt by the collection callbacks on every build, so they stay fresh under
// --serve and the filters below keep a single-argument signature.

let peopleByName = new Map();   // name or alias -> person item
let peopleBySlug = new Map();
let peopleByArea = new Map();   // area slug -> person items
let pubsByArea = new Map();     // area slug -> publication items
let areasBySlug = new Map();

const GROUP_ORDER = ['faculty', 'visiting', 'staff', 'phd', 'msc', 'developer'];

const GROUP_LABELS = {
  faculty: 'Faculty',
  visiting: 'Visiting Researchers',
  staff: 'Staff',
  phd: 'Ph.D. Students',
  msc: 'M.Sc. Students',
  developer: 'Software Developers',
  alumni: 'Alumni',
};

const slugOf = (item) => path.basename(item.inputPath).replace(/\.md$/, '');

// Active people first in group order, then alumni; `order` then `name` within.
function comparePeople(a, b) {
  const rank = (p) => (p.data.status === 'alumni' ? GROUP_ORDER.length : GROUP_ORDER.indexOf(p.data.group));
  const byRank = rank(a) - rank(b);
  if (byRank) return byRank;
  const byOrder = (a.data.order ?? Infinity) - (b.data.order ?? Infinity);
  if (byOrder) return byOrder;
  return a.data.name.localeCompare(b.data.name);
}

function comparePublications(a, b) {
  return b.data.year - a.data.year || a.data.title.localeCompare(b.data.title);
}

// --- date helpers ----------------------------------------------------------
// YAML dates parse to Date at UTC midnight; always format in UTC so the day
// never shifts with the machine's timezone.

const asDate = (v) => (v instanceof Date ? v : new Date(v));
const utc = (opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts });

const fmtLong = utc({ day: 'numeric', month: 'short', year: 'numeric' });
const fmtRss = utc({ weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export default function (eleventyConfig) {
  for (const glob of [
    'node_modules/**',
    '_site/**',
    'tools/**',
    'docs/**',
    '*.md',
    'content/SCHEMA.md',
  ]) eleventyConfig.ignores.add(glob);

  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy({ 'src/css': 'css', 'src/js': 'js' });
  eleventyConfig.addWatchTarget('./content/');

  // Layout and URL per content type — the one place that maps data to pages.
  eleventyConfig.addGlobalData('eleventyComputed', {
    permalink: (data) => routeFor(data.page.inputPath).permalink,
    layout: (data) => routeFor(data.page.inputPath).layout,
  });

  // --- collections ---------------------------------------------------------

  eleventyConfig.addCollection('people', (api) => {
    const people = api.getFilteredByGlob('./content/people/*.md').sort(comparePeople);

    peopleByName = new Map();
    peopleBySlug = new Map();
    peopleByArea = new Map();
    for (const person of people) {
      person.data.slug = slugOf(person);
      peopleBySlug.set(person.data.slug, person);
      peopleByName.set(person.data.name, person);
      for (const alias of person.data.aliases ?? []) peopleByName.set(alias, person);
      for (const area of person.data.areas ?? []) {
        if (!peopleByArea.has(area)) peopleByArea.set(area, []);
        peopleByArea.get(area).push(person);
      }
    }
    return people;
  });

  eleventyConfig.addCollection('publications', (api) => {
    const pubs = api.getFilteredByGlob('./content/publications/*.md').sort(comparePublications);

    pubsByArea = new Map();
    for (const pub of pubs) {
      pub.data.slug = slugOf(pub);
      for (const area of pub.data.areas ?? []) {
        if (!pubsByArea.has(area)) pubsByArea.set(area, []);
        pubsByArea.get(area).push(pub);
      }
    }
    return pubs;
  });

  eleventyConfig.addCollection('areas', (api) => {
    const areas = api.getFilteredByGlob('./content/areas/*.md')
      .sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || a.data.title.localeCompare(b.data.title));

    areasBySlug = new Map();
    for (const area of areas) {
      area.data.slug = slugOf(area);
      areasBySlug.set(area.data.slug, area);
    }
    return areas;
  });

  eleventyConfig.addCollection('news', (api) =>
    api.getFilteredByGlob('./content/news/*.md')
      .sort((a, b) => asDate(b.data.date) - asDate(a.data.date)));

  eleventyConfig.addCollection('guides', (api) =>
    api.getFilteredByGlob('./content/guides/*.md')
      .sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || a.data.title.localeCompare(b.data.title)));

  eleventyConfig.addCollection('projects', (api) =>
    api.getFilteredByGlob('./content/projects/*.md')
      .sort((a, b) => a.data.title.localeCompare(b.data.title)));

  eleventyConfig.addCollection('contentPages', (api) =>
    api.getFilteredByGlob('./content/pages/*.md'));

  // --- filters -------------------------------------------------------------

  // Resolves an author string to a person by `name` or `aliases`.
  eleventyConfig.addFilter('personByName', (name) => peopleByName.get(name) ?? null);
  eleventyConfig.addFilter('personBySlug', (slug) => peopleBySlug.get(slug) ?? null);
  eleventyConfig.addFilter('areaBySlug', (slug) => areasBySlug.get(slug) ?? null);

  // Derived lists: a person declares their areas, an area never lists people.
  eleventyConfig.addFilter('peopleInArea', (slug) => peopleByArea.get(slug) ?? []);
  eleventyConfig.addFilter('publicationsInArea', (slug) => pubsByArea.get(slug) ?? []);

  // News mentioning a person, derived from each item's `people:` list.
  eleventyConfig.addFilter('newsAbout', (news, slug) =>
    (news ?? []).filter((item) => (item.data.people ?? []).includes(slug)));

  eleventyConfig.addFilter('formatDate', (d) => fmtLong.format(asDate(d)));
  eleventyConfig.addFilter('isoDate', (d) => asDate(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter('rssDate', (d) => {
    // "Sun, 14 Dec 2025 00:00:00 GMT"
    const [weekday, rest] = fmtRss.format(asDate(d)).split(', ');
    return `${weekday}, ${rest} 00:00:00 GMT`;
  });
  eleventyConfig.addFilter('year', (d) => asDate(d).getUTCFullYear());
  eleventyConfig.addFilter('groupLabel', (g) => GROUP_LABELS[g] ?? g);

  eleventyConfig.addFilter('absoluteUrl', (url, base) => new URL(url, base).href);

  // Groups an already-sorted list into [{key, items}], preserving order.
  eleventyConfig.addFilter('groupBy', (items, key) => {
    const groups = new Map();
    for (const item of items ?? []) {
      const k = typeof key === 'function' ? key(item) : item.data[key];
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(item);
    }
    return [...groups].map(([k, v]) => ({ key: k, items: v }));
  });

  eleventyConfig.addFilter('byYear', (items) => {
    const groups = new Map();
    for (const item of items ?? []) {
      const y = asDate(item.data.date).getUTCFullYear();
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(item);
    }
    return [...groups].map(([k, v]) => ({ key: k, items: v }));
  });

  eleventyConfig.addFilter('head', (items, n) => (items ?? []).slice(0, n));
  eleventyConfig.addFilter('inGroup', (people, group) =>
    (people ?? []).filter((p) => p.data.status === 'active' && p.data.group === group));
  eleventyConfig.addFilter('selected', (pubs) => (pubs ?? []).filter((p) => p.data.selected));
  eleventyConfig.addFilter('withCover', (news) => (news ?? []).filter((n) => n.data.cover));
  eleventyConfig.addFilter('audienceLabel', (a) =>
    ({ msc: 'M.Sc.', phd: 'Ph.D.', undergrad: 'Undergraduate' })[a] ?? a);

  // Placeholder monogram for people with no photo.
  eleventyConfig.addFilter('initials', (name) =>
    String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''));

  // First paragraph of rendered markdown, used where no `summary` is given.
  eleventyConfig.addFilter('firstParagraph', (html) => {
    const m = String(html ?? '').match(/<p>([\s\S]*?)<\/p>/);
    return m ? m[1] : '';
  });

  // Plain text from rendered markdown: drop the tags, then decode the entities
  // the renderer introduced, so templates re-escape them exactly once.
  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  eleventyConfig.addFilter('stripTags', (html) =>
    String(html ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, name) => {
        if (Object.hasOwn(ENTITIES, name)) return ENTITIES[name];
        if (name[0] === '#') {
          const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
          return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return m;
      })
      .replace(/\s+/g, ' ')
      .trim());

  eleventyConfig.addFilter('truncate', (text, n = 200) => {
    const s = String(text ?? '');
    return s.length <= n ? s : `${s.slice(0, s.lastIndexOf(' ', n))}…`;
  });

  return {
    dir: { input: '.', output: '_site', includes: 'src/_includes', data: 'src/_data' },
    templateFormats: ['njk', 'md'],
    // content/ is data: never run its markdown through a template engine.
    markdownTemplateEngine: false,
    htmlTemplateEngine: 'njk',
  };
}
