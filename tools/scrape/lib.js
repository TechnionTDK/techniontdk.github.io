// Shared helpers for extract.js: slugs, YAML emission, HTML->Markdown, assets.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const SITE = 'https://tdk.cs.technion.ac.il';

// --- slugs -----------------------------------------------------------------

export function slugify(s) {
  return s
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')  // strip accents (Kröll -> Kroll)
    .replace(/[‘’“”]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Truncate a slug at a word boundary so filenames stay readable.
export function shortSlug(s, max = 60) {
  const full = slugify(s);
  if (full.length <= max) return full;
  const cut = full.slice(0, max + 1);
  const at = cut.lastIndexOf('-');
  return (at > 0 ? cut.slice(0, at) : full.slice(0, max)).replace(/-+$/, '');
}

export function uniqueSlug(base, taken) {
  let slug = base, n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  taken.add(slug);
  return slug;
}

// --- YAML front matter -----------------------------------------------------

const NEEDS_QUOTES = /^[\s>|*&!%@`{}\[\],#?:-]|[:#]\s|\s$|^$|^(yes|no|true|false|null|on|off|~)$/i;

function scalar(v, forceQuote = false) {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (forceQuote || NEEDS_QUOTES.test(s) || /["\\\n]/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

// Fields the spec shows as quoted strings, and lists it shows in flow style.
const ALWAYS_QUOTED = new Set(['phone', 'office', 'citation']);
const FLOW_LISTS = new Set(['advisors', 'areas', 'aliases', 'tags', 'people', 'publications', 'audience']);

export function frontMatter(fields) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0) ||
        (v?.constructor === Object && Object.keys(v).length === 0)) continue;

    if (Array.isArray(v)) {
      if (FLOW_LISTS.has(k)) {
        lines.push(`${k}: [${v.map((x) => scalar(x)).join(', ')}]`);
      } else if (v[0]?.constructor === Object) {          // collaborators
        lines.push(`${k}:`);
        for (const item of v) {
          const keys = Object.entries(item).filter(([, x]) => x !== undefined);
          lines.push(`  - ${keys[0][0]}: ${scalar(keys[0][1])}`);
          for (const [ik, iv] of keys.slice(1)) lines.push(`    ${ik}: ${scalar(iv)}`);
        }
      } else {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${scalar(item)}`);
      }
    } else if (v?.constructor === Object) {               // links
      lines.push(`${k}:`);
      for (const [ik, iv] of Object.entries(v)) lines.push(`  ${ik}: ${scalar(iv)}`);
    } else {
      lines.push(`${k}: ${scalar(v, ALWAYS_QUOTED.has(k))}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

export async function writeDoc(relPath, fields, body = '') {
  const full = path.join(ROOT, relPath);
  await fsp.mkdir(path.dirname(full), { recursive: true });
  const text = frontMatter(fields) + '\n' + (body.trim() ? body.trim() + '\n' : '');
  await fsp.writeFile(full, text);
}

// --- HTML -> Markdown ------------------------------------------------------

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// The site's newer news bodies were pasted from chat tools and carry Tailwind
// class soup and data-* attributes. Nothing but structure should survive.
const KEEP_ATTRS = { a: ['href'], img: ['src', 'alt'] };

const clean$ = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

export function stripAttrs($, root) {
  $(root).find('*').addBack().each((_, el) => {
    if (!el.attribs) return;
    const keep = KEEP_ATTRS[el.tagName?.toLowerCase()] ?? [];
    for (const name of Object.keys(el.attribs)) {
      if (!keep.includes(name)) delete el.attribs[name];
    }
  });
  return root;
}

export function toMarkdown($, root) {
  const clone = $(root).clone();
  // <p><strong><img></strong></p> is a layout habit of the old editor; the
  // emphasis around an image means nothing in Markdown.
  clone.find('strong > img, b > img, em > img').each((_, img) => {
    const $img = $(img);
    const $wrap = $img.parent();
    if (clean$($wrap.text()) === '') $wrap.replaceWith($img);
  });
  // Drop theme chrome first: it is selected by class, and stripAttrs would
  // remove the very classes these selectors match on.
  clone.find('div.clearfix, div.espan, a.to_exp_close, .bti').remove();
  stripAttrs($, clone);
  clone.find('span:empty, div:empty').remove();
  return turndown.turndown($.html(clone))
    // Turndown pads bullets to "-   "; no content list is nested, so a single
    // space is unambiguous and far easier for a human to edit.
    .replace(/^(\s*)([-*+])   /gm, '$1$2 ')
    // "<b>A</b><strong>B</strong>" becomes "**A** **B**"; rejoin the run.
    .replace(/\*\* \*\*/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

// --- assets ----------------------------------------------------------------

// WordPress writes resized copies next to the original: foo-336x194.jpg.
export const stripSizeSuffix = (url) => url.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');

const downloaded = new Map();   // source url -> site-root asset path

// The server drops connections now and then on a long run of downloads.
async function fetchRetry(url, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

/**
 * Download `url` (preferring the unresized original) to /assets/<destDir>/<base>.<ext>.
 * Existing files are left alone, so re-running extract.js needs no network.
 */
export async function saveAsset(url, destDir, base, log) {
  const key = `${destDir}/${base}`;
  if (downloaded.has(key)) return downloaded.get(key);

  const original = stripSizeSuffix(url);
  const ext = (path.extname(new URL(original).pathname) || '.jpg').toLowerCase();
  const rel = `/assets/${destDir}/${base}${ext}`;
  const full = path.join(ROOT, rel.slice(1));

  if (!fs.existsSync(full)) {
    let res = await fetchRetry(original);
    if (!res.ok && original !== url) {
      log?.assets_fallback.push({ tried: original, used: url, status: res.status });
      res = await fetchRetry(url);
    }
    if (!res.ok) {
      log?.assets_failed.push({ url, status: res.status });
      return undefined;
    }
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, Buffer.from(await res.arrayBuffer()));
  }
  downloaded.set(key, rel);
  return rel;
}

export const isPlaceholder = (src) => /\/wp-content\/themes\//.test(src);
