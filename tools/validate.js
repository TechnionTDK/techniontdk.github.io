// Validates content/ against the schema documented in content/SCHEMA.md.
// Exits non-zero on any error. Run with: npm run validate
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT = path.join(ROOT, 'content');

// Course runs name a semester, and the list of semesters the page covers is a
// site-wide setting. Load it once here so the schema can check each run against
// it; checkSite() does its own read and reports a missing or broken file.
const COURSE_SEMESTERS = (() => {
  try {
    const site = yaml.load(fs.readFileSync(path.join(CONTENT, 'site.yaml'), 'utf8'));
    return Array.isArray(site?.course_semesters) ? site.course_semesters : [];
  } catch {
    return [];
  }
})();

// ---------------------------------------------------------------------------
// The schema. This object is the single source of truth for the checks below;
// content/SCHEMA.md documents the same rules for humans and agents.
//   req/opt  - field name -> type
//   types:   string | text | int | bool | date | url | assetPath | slugRef:<type>
//            | enum:<a|b|c> | list:<type> | links | collaborators
// ---------------------------------------------------------------------------
const SCHEMA = {
  people: {
    dir: 'people',
    req: { name: 'string' },
    opt: {
      honorific: 'enum:Prof.|Dr.',
      role: 'string',
      group: 'enum:faculty|visiting|staff|phd|msc|developer',
      status: 'enum:active|alumni',
      degree: 'enum:Ph.D.|M.Sc.',
      advisors: 'list:slugRef:people',
      email: 'string',
      website: 'url',
      phone: 'string',
      office: 'string',
      interests: 'text',
      photo: 'assetPath',
      areas: 'list:slugRef:areas',
      aliases: 'list:string',
      order: 'int',
    },
    // `status` is required, and `group` is required while the person is active.
    extra(fm, err) {
      if (!('status' in fm)) err('missing required field: status');
      if (fm.status === 'active' && !('group' in fm)) {
        err('active person must have a group');
      }
    },
  },
  areas: {
    dir: 'areas',
    req: { title: 'string', tagline: 'text' },
    opt: { image: 'assetPath', order: 'int', collaborators: 'collaborators' },
  },
  publications: {
    dir: 'publications',
    req: {
      title: 'string',
      authors: 'list:string',
      venue: 'string',
      year: 'int',
    },
    opt: {
      citation: 'string',
      status: 'enum:published|to-appear|preprint',
      links: 'links',
      // Optional: a paper with no areas is listed on /publications/ but on no
      // area page. Filed later rather than guessed at announcement time.
      areas: 'list:slugRef:areas',
    },
    extra(fm, err) {
      if (Array.isArray(fm.authors) && fm.authors.length === 0) err('authors must not be empty');
    },
  },
  news: {
    dir: 'news',
    req: { title: 'string', date: 'date' },
    opt: {
      summary: 'text',
      cover: 'assetPath',
      photos: 'list:assetPath',
      tags: 'list:enum:paper|award|grant|event|visit|talk|media|milestone',
      people: 'list:slugRef:people',
      publications: 'list:slugRef:publications',
    },
  },
  projects: {
    dir: 'projects',
    req: { title: 'string', advisors: 'list:slugRef:people' },
    opt: {
      image: 'assetPath',
      status: 'enum:open|closed',
      audience: 'list:enum:msc|phd|undergrad',
    },
    extra(fm, err) {
      if (Array.isArray(fm.advisors) && fm.advisors.length === 0) err('advisors must not be empty');
    },
  },
  guides: {
    dir: 'guides',
    req: { title: 'string', summary: 'text', updated: 'date' },
    opt: { author: 'slugRef:people', order: 'int' },
  },
  courses: {
    dir: 'courses',
    // A course is listed once per *run*: the same course can run in several
    // semesters under different lecturers, so who gives it and which semester's
    // page to link live on the run, not on the course.
    req: { title: 'string', runs: 'courseRuns' },
    // `number` is optional because a course may have no catalogue entry to cite.
    // `url` is the course's own site when it has one, and wins over every run's
    // `url` (which is the faculty or Technion course page for that semester).
    opt: {
      number: 'string',
      url: 'url',
    },
    extra(fm, err) {
      if ('number' in fm && !/^\d{8}$/.test(String(fm.number))) {
        err('number: expected eight digits, quoted (e.g. "02360028")');
      }
    },
  },
  pages: {
    dir: 'pages',
    req: { title: 'string' },
    opt: {},
    fixed: ['home', 'about', 'contact'],
  },
};

const LINK_KEYS = ['paper', 'arxiv', 'doi', 'code', 'slides', 'video'];
const RUN_KEYS = ['semester', 'instructors', 'lecturer', 'url'];

// ---------------------------------------------------------------------------
const errors = [];
const warnings = [];
const counts = {};
const slugs = {};   // type -> Set of slugs
const docs = {};    // type -> [{slug, file, fm, body}]

const isKebab = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
const isPlainString = (v) => typeof v === 'string' && !/<[a-zA-Z/][^>]*>/.test(v);

function loadAll() {
  for (const [type, def] of Object.entries(SCHEMA)) {
    const dir = path.join(CONTENT, def.dir);
    docs[type] = [];
    slugs[type] = new Set();
    if (!fs.existsSync(dir)) {
      errors.push(`content/${def.dir}/ is missing`);
      continue;
    }
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.md') || file === 'SCHEMA.md') continue;
      const slug = file.slice(0, -3);
      const full = path.join(dir, file);
      let parsed;
      try {
        parsed = matter(fs.readFileSync(full, 'utf8'));
      } catch (e) {
        errors.push(`content/${def.dir}/${file}: front matter does not parse: ${e.message}`);
        continue;
      }
      docs[type].push({ slug, file: `content/${def.dir}/${file}`, fm: parsed.data, body: parsed.content });
      slugs[type].add(slug);
    }
    counts[type] = docs[type].length;
  }
}

function checkValue(type, where, field, spec, value, err) {
  if (spec.startsWith('list:')) {
    if (!Array.isArray(value)) return err(`${field}: expected a list`);
    const inner = spec.slice(5);
    value.forEach((v, i) => checkValue(type, where, `${field}[${i}]`, inner, v, err));
    return;
  }
  if (spec.startsWith('enum:')) {
    const allowed = spec.slice(5).split('|');
    if (!allowed.includes(value)) err(`${field}: "${value}" is not one of ${allowed.join(', ')}`);
    return;
  }
  if (spec.startsWith('slugRef:')) {
    const target = spec.slice(8);
    if (typeof value !== 'string') return err(`${field}: expected a slug string`);
    if (!slugs[target].has(value)) err(`${field}: "${value}" does not resolve to a ${target} file`);
    return;
  }
  switch (spec) {
    case 'string':
    case 'text':
      if (typeof value !== 'string') return err(`${field}: expected a string`);
      if (value.trim() === '') return err(`${field}: empty (omit the field instead)`);
      if (!isPlainString(value)) err(`${field}: contains HTML tags`);
      break;
    case 'int':
      if (!Number.isInteger(value)) err(`${field}: expected an integer`);
      break;
    case 'bool':
      if (typeof value !== 'boolean') err(`${field}: expected true or false`);
      break;
    case 'date':
      if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
        err(`${field}: expected an unquoted ISO date (YYYY-MM-DD)`);
      }
      break;
    case 'url':
      if (typeof value !== 'string' || !/^https?:\/\//.test(value)) {
        err(`${field}: expected an http(s) URL`);
      }
      break;
    case 'assetPath':
      checkAsset(field, value, err);
      break;
    case 'links':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return err(`${field}: expected a mapping`);
      }
      for (const [k, v] of Object.entries(value)) {
        if (!LINK_KEYS.includes(k)) err(`${field}.${k}: not one of ${LINK_KEYS.join(', ')}`);
        if (typeof v !== 'string' || !/^https?:\/\//.test(v)) err(`${field}.${k}: expected a URL`);
      }
      if (Object.keys(value).length === 0) err(`${field}: empty (omit the field instead)`);
      break;
    case 'courseRuns':
      if (!Array.isArray(value) || value.length === 0) {
        return err(`${field}: expected a non-empty list of runs`);
      }
      value.forEach((r, i) => {
        if (typeof r !== 'object' || r === null || Array.isArray(r)) {
          return err(`${field}[${i}]: expected a mapping`);
        }
        for (const k of Object.keys(r)) {
          if (!RUN_KEYS.includes(k)) {
            err(`${field}[${i}].${k}: unknown key (allowed: ${RUN_KEYS.join(', ')})`);
          }
        }
        if (!COURSE_SEMESTERS.includes(r.semester)) {
          err(`${field}[${i}].semester: "${r.semester}" is not one of site.yaml's course_semesters (${COURSE_SEMESTERS.join(', ') || 'none defined'})`);
        }
        // A lab member goes in `instructors` as a slug; anyone else is plain
        // text in `lecturer`, because only lab members have a people file.
        if ('instructors' in r && 'lecturer' in r) {
          err(`${field}[${i}]: has both instructors and lecturer (a lab member goes in instructors, anyone else in lecturer)`);
        }
        if ('instructors' in r) {
          if (Array.isArray(r.instructors) && r.instructors.length === 0) {
            err(`${field}[${i}].instructors: empty (omit the field instead)`);
          } else {
            checkValue(type, where, `${field}[${i}].instructors`, 'list:slugRef:people', r.instructors, err);
          }
        }
        if ('lecturer' in r) checkValue(type, where, `${field}[${i}].lecturer`, 'string', r.lecturer, err);
        if ('url' in r) checkValue(type, where, `${field}[${i}].url`, 'url', r.url, err);
      });
      break;
    case 'collaborators':
      if (!Array.isArray(value)) return err(`${field}: expected a list`);
      value.forEach((c, i) => {
        if (typeof c !== 'object' || c === null) return err(`${field}[${i}]: expected a mapping`);
        for (const k of Object.keys(c)) {
          if (!['name', 'affiliation', 'url'].includes(k)) {
            err(`${field}[${i}].${k}: unknown key (allowed: name, affiliation, url)`);
          }
        }
        if (typeof c.name !== 'string') err(`${field}[${i}].name: required`);
        if ('url' in c && !/^https?:\/\//.test(c.url)) err(`${field}[${i}].url: expected a URL`);
      });
      break;
    default:
      err(`${field}: internal — unknown spec "${spec}"`);
  }
}

function checkAsset(field, value, err) {
  if (typeof value !== 'string') return err(`${field}: expected an asset path string`);
  if (!value.startsWith('/assets/')) return err(`${field}: must start with /assets/`);
  if (!fs.existsSync(path.join(ROOT, value.replace(/^\//, '')))) {
    err(`${field}: ${value} does not exist on disk`);
  }
}

function checkDocs() {
  for (const [type, def] of Object.entries(SCHEMA)) {
    for (const doc of docs[type]) {
      const err = (msg) => errors.push(`${doc.file}: ${msg}`);

      // filename conventions
      if (type === 'news') {
        const m = doc.slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
        if (!m) err('news filename must start with YYYY-MM-DD-');
        else {
          if (!isKebab(m[2])) err('news filename tail must be lowercase-kebab');
          const d = doc.fm.date;
          if (d instanceof Date && d.toISOString().slice(0, 10) !== m[1]) {
            err(`filename date ${m[1]} disagrees with front matter date ${d.toISOString().slice(0, 10)}`);
          }
        }
      } else if (!isKebab(doc.slug)) {
        err('filename must be lowercase-kebab');
      }

      // required / unknown / typed fields
      for (const [field, spec] of Object.entries(def.req)) {
        if (!(field in doc.fm)) err(`missing required field: ${field}`);
        else checkValue(type, doc.file, field, spec, doc.fm[field], err);
      }
      for (const [field, value] of Object.entries(doc.fm)) {
        if (field in def.req) continue;
        if (field in def.opt) {
          if (value === null || value === '') err(`${field}: empty (omit the field instead)`);
          else checkValue(type, doc.file, field, def.opt[field], value, err);
        } else {
          err(`unknown field: ${field}`);
        }
      }
      def.extra?.(doc.fm, err);

      // assets referenced from the body
      for (const m of doc.body.matchAll(/\(\s*(\/assets\/[^)\s]+)/g)) {
        checkAsset('body', m[1], err);
      }
    }

    if (def.fixed) {
      for (const s of def.fixed) if (!slugs[type].has(s)) errors.push(`content/${def.dir}/${s}.md is missing`);
      for (const s of slugs[type]) if (!def.fixed.includes(s)) errors.push(`content/${def.dir}/${s}.md: not one of the fixed pages (${def.fixed.join(', ')})`);
    }
  }
}

function checkSite() {
  const file = path.join(CONTENT, 'site.yaml');
  if (!fs.existsSync(file)) return errors.push('content/site.yaml is missing');
  let site;
  try {
    site = yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return errors.push(`content/site.yaml: does not parse: ${e.message}`);
  }
  const err = (m) => errors.push(`content/site.yaml: ${m}`);
  for (const k of ['name', 'short_name', 'url', 'description', 'logo', 'nav', 'footer', 'home', 'course_semesters']) {
    if (!(k in site)) err(`missing key: ${k}`);
  }
  if (site.logo) checkAsset('logo', site.logo, err);
  if (site.favicon) checkAsset('favicon', site.favicon, err);
  for (const a of site.affiliations ?? []) if (a.logo) checkAsset(`affiliations[${a.name}].logo`, a.logo, err);
  (site.nav ?? []).forEach((n, i) => {
    if (!n.label) err(`nav[${i}]: missing label`);
    if (!/^\/([a-z0-9-]+\/)*$/.test(n.url ?? '')) err(`nav[${i}]: url "${n.url}" is not a well-formed root-relative path`);
  });
  for (const l of site.footer?.links ?? []) {
    if (!/^https?:\/\//.test(l.url ?? '')) err(`footer link "${l.label}": expected an absolute URL`);
  }
  for (const k of ['news_count', 'photo_news_count']) {
    if (!Number.isInteger(site.home?.[k])) err(`home.${k}: expected an integer`);
  }
  // Newest first: the first entry is the current semester, and the courses page
  // splits on it.
  if ('course_semesters' in site) {
    if (!Array.isArray(site.course_semesters) || site.course_semesters.length === 0) {
      err('course_semesters: expected a non-empty list, newest first');
    } else {
      site.course_semesters.forEach((sem, i) => {
        if (typeof sem !== 'string' || sem.trim() === '') err(`course_semesters[${i}]: expected a non-empty string`);
      });
    }
  }
}

function checkWarnings() {
  const thisYear = new Date().getUTCFullYear();
  for (const doc of docs.publications ?? []) {
    if (!doc.fm.links) warnings.push(`${doc.file}: publication has no links`);
    // `to-appear` is a promise with an expiry: once the target year is behind us
    // the paper has appeared, and the record needs a citation and status.
    if (doc.fm.status === 'to-appear' && Number(doc.fm.year) < thisYear) {
      warnings.push(`${doc.file}: still "to-appear" but ${doc.fm.year} has passed — add the citation and drop the status`);
    }
  }
  // A paper announcement that files no publication is how /publications/ went
  // stale for six years. Make the omission visible the day it happens.
  for (const doc of docs.news ?? []) {
    if ((doc.fm.tags ?? []).includes('paper') && !(doc.fm.publications ?? []).length) {
      warnings.push(`${doc.file}: tagged "paper" but references no publications — file the paper under content/publications/ and list its slug`);
    }
  }
  const noAreas = (docs.publications ?? []).filter((d) => !(d.fm.areas ?? []).length);
  if (noAreas.length) {
    warnings.push(`${noAreas.length} publication(s) have no areas, so they appear on no research-area page: ${noAreas.map((d) => d.slug).sort().join(', ')}`);
  }
  for (const doc of docs.people ?? []) {
    if (doc.fm.status === 'active' && !doc.fm.photo) warnings.push(`${doc.file}: active person has no photo`);
  }
  // A course kept on the page although no run of it is given by a lab member is
  // there only because the current semester runs it; worth a look each refresh.
  for (const doc of docs.courses ?? []) {
    const runs = Array.isArray(doc.fm.runs) ? doc.fm.runs : [];
    if (!runs.some((r) => (r?.instructors ?? []).length)) {
      warnings.push(`${doc.file}: no run of this course is given by a lab member`);
    }
    if (!doc.fm.number) warnings.push(`${doc.file}: course has no catalogue number, so it cannot be linked`);
  }
  // Author strings that match no person are informational: most co-authors are external.
  const known = new Set();
  for (const doc of docs.people ?? []) {
    known.add(doc.fm.name);
    for (const a of doc.fm.aliases ?? []) known.add(a);
  }
  const unmatched = new Set();
  for (const doc of docs.publications ?? []) {
    for (const a of doc.fm.authors ?? []) if (!known.has(a)) unmatched.add(a);
  }
  if (unmatched.size) {
    warnings.push(`${unmatched.size} publication author name(s) match no person (external co-authors, informational): ${[...unmatched].sort().join('; ')}`);
  }
}

loadAll();
checkDocs();
checkSite();
checkWarnings();

console.log('Content counts');
for (const type of Object.keys(SCHEMA)) console.log(`  ${type.padEnd(14)} ${counts[type] ?? 0}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length})`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\nErrors (${errors.length})`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log('\nFAILED');
  process.exit(1);
}
console.log('\nOK — no errors.');
