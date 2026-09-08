// Step A, network stage. Downloads every page of the live WordPress site into
// tools/scrape/cache/ so that extract.js can run offline and reproducibly.
// One-off migration tool. See README.md.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const SITE = 'https://tdk.cs.technion.ac.il';
const CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cache');
const DELAY_MS = 400;

const TOP_PAGES = [
  '/', '/our-mission/', '/people/', '/research/', '/selected-publications/',
  '/courses/', '/projects/', '/news-events/', '/contact-us/',
];
const AREA_IDS = [53, 51, 55, 109, 131, 129, 113];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A site path maps to a cache filename: '/' -> 'index.html',
// '/people/' -> 'people.html', '/research/?stl=53' -> 'research-stl-53.html'.
export function cacheName(sitePath) {
  if (sitePath === '/') return 'index.html';
  const m = sitePath.match(/^\/research\/\?stl=(\d+)$/);
  if (m) return `research-stl-${m[1]}.html`;
  return sitePath.replace(/^\/|\/$/g, '').replace(/\//g, '-') + '.html';
}

async function get(sitePath) {
  const name = cacheName(sitePath);
  const dest = path.join(CACHE, name);
  try {
    await fs.access(dest);
    console.log(`  cached  ${name}`);
    return await fs.readFile(dest, 'utf8');
  } catch {}
  const res = await fetch(SITE + sitePath, {
    headers: { 'User-Agent': 'tdk-website-migration/1.0 (one-off content migration)' },
  });
  if (!res.ok) throw new Error(`${res.status} for ${sitePath}`);
  const html = await res.text();
  await fs.writeFile(dest, html);
  console.log(`  fetched ${name} (${html.length} bytes)`);
  await sleep(DELAY_MS);
  return html;
}

// News detail pages are reachable from two places, and neither list is complete:
// the news index links a handful of "more details" pages, while the home page's
// "Latest Events" strip links the photo-bearing ones (some of which the index
// does not link at all). We take the union.
function detailLinks(html) {
  const $ = cheerio.load(html);
  const out = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href?.startsWith(SITE + '/')) return;
    const p = href.slice(SITE.length);
    if (!/^\/[a-z0-9%-]+\/$/.test(p)) return;
    if (TOP_PAGES.includes(p) || p === '/resources/') return;
    out.add(p);
  });
  return out;
}

async function main() {
  await fs.mkdir(CACHE, { recursive: true });

  console.log('Top-level pages:');
  const html = {};
  for (const p of TOP_PAGES) html[p] = await get(p);

  console.log('Research area pages:');
  for (const id of AREA_IDS) await get(`/research/?stl=${id}`);

  const details = new Set([
    ...detailLinks(html['/news-events/']),
    ...detailLinks(html['/']),
  ]);
  console.log(`News detail pages (${details.size}):`);
  for (const p of [...details].sort()) await get(p);

  const manifest = {
    fetched_at: new Date().toISOString(),
    site: SITE,
    top_pages: TOP_PAGES,
    area_pages: AREA_IDS.map((id) => `/research/?stl=${id}`),
    detail_pages: [...details].sort(),
  };
  await fs.writeFile(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${TOP_PAGES.length + AREA_IDS.length + details.size} pages in cache/.`);
}

main();
