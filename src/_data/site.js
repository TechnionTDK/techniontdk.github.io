// Site-wide settings live in content/site.yaml (the data half); this only loads them.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export default function () {
  const file = path.join(import.meta.dirname, '..', '..', 'content', 'site.yaml');
  return yaml.load(fs.readFileSync(file, 'utf8'));
}
