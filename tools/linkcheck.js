// Checks that every internal link and asset reference in _site/ resolves.
// External URLs, mailto:, tel: and data: are skipped. Run with: npm run linkcheck
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, '_site');

if (!fs.existsSync(SITE)) {
  console.error('_site/ does not exist — run `npm run build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(SITE);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// url path -> set of element ids on that page, for fragment checks
const idsByPage = new Map();
const parsed = new Map();

for (const file of htmlFiles) {
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  parsed.set(file, $);
  const url = '/' + path.relative(SITE, file).split(path.sep).join('/');
  const ids = new Set();
  $('[id]').each((_, el) => ids.add($(el).attr('id')));
  idsByPage.set(url, ids);
  if (url.endsWith('/index.html')) idsByPage.set(url.slice(0, -'index.html'.length), ids);
}

// Resolves a site-root path to a file on disk, applying the /foo/ -> /foo/index.html rule.
function resolveTarget(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\//, '');
  const direct = path.join(SITE, rel);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const index = path.join(direct, 'index.html');
  if (fs.existsSync(index)) return index;
  return null;
}

const problems = [];
let checked = 0;

for (const file of htmlFiles) {
  const $ = parsed.get(file);
  const from = '/' + path.relative(SITE, file).split(path.sep).join('/');
  const here = from.replace(/index\.html$/, '');

  const refs = [];
  $('a[href]').each((_, el) => refs.push(['href', $(el).attr('href')]));
  $('img[src], script[src]').each((_, el) => refs.push(['src', $(el).attr('src')]));
  $('link[href]').each((_, el) => refs.push(['href', $(el).attr('href')]));

  for (const [attr, raw] of refs) {
    if (!raw) continue;
    const value = raw.trim();
    if (/^(https?:|mailto:|tel:|data:|#)/.test(value)) {
      // Same-page fragment: check the id exists here.
      if (value.startsWith('#') && value.length > 1) {
        checked++;
        if (!idsByPage.get(here)?.has(value.slice(1))) {
          problems.push(`${here}  ${attr}="${value}"  (no such id on this page)`);
        }
      }
      continue;
    }
    checked++;
    const [urlPath, fragment] = value.split('#');
    const abs = urlPath.startsWith('/')
      ? urlPath
      : path.posix.normalize(path.posix.join(path.posix.dirname(here), urlPath));

    if (!resolveTarget(abs)) {
      problems.push(`${here}  ${attr}="${value}"  (target missing)`);
      continue;
    }
    if (fragment && idsByPage.has(abs) && !idsByPage.get(abs).has(fragment)) {
      problems.push(`${here}  ${attr}="${value}"  (no such id on ${abs})`);
    }
  }
}

console.log(`Checked ${checked} internal references across ${htmlFiles.length} pages.`);
if (problems.length) {
  console.log(`\nBroken (${problems.length})`);
  for (const p of problems) console.log(`  x ${p}`);
  console.log('\nFAILED');
  process.exit(1);
}
console.log('OK — every internal link and asset resolves.');
