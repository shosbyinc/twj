#!/usr/bin/env node
/**
 * Archives a source document and writes its hash into the source record.
 *
 *   npm run archive -- <source-id> <path/to/downloaded/file>
 *
 * This is the one step that stands between a modelled city and a published
 * one. A live URL is not provenance: a utility page replaced next April stops
 * proving a figure dated today. The archived copy does.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname;
const [id, file] = process.argv.slice(2);

if (!id || !file) {
  console.log('Usage: npm run archive -- <source-id> <file>\n');
  console.log('Sources still needing an archived copy:\n');
  for (const f of readdirSync(join(ROOT, 'data/sources')).filter(f => f.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(ROOT, 'data/sources', f), 'utf8'));
    const done = s.archive_sha256 && !String(s.archive_sha256).startsWith('PENDING');
    if (!done) console.log(`  ${s.id.padEnd(34)} ${s.url ?? '(no url)'}`);
  }
  process.exit(0);
}

const recPath = join(ROOT, 'data/sources', `${id}.json`);
if (!existsSync(recPath)) { console.error(`No source record "${id}"`); process.exit(1); }
if (!existsSync(file)) { console.error(`No such file: ${file}`); process.exit(1); }

const rec = JSON.parse(readFileSync(recPath, 'utf8'));
const bytes = readFileSync(file);
const hash = createHash('sha256').update(bytes).digest('hex');
const today = new Date().toISOString().slice(0, 10);
const dest = `archive/${id}-${today}${extname(file) || '.bin'}`;

if (!existsSync(join(ROOT, 'archive'))) mkdirSync(join(ROOT, 'archive'));
copyFileSync(file, join(ROOT, dest));

rec.archive_path = dest;
rec.archive_sha256 = `sha256:${hash}`;
rec.archived_at = today;
rec.archive_bytes = bytes.length;
writeFileSync(recPath, JSON.stringify(rec, null, 2) + '\n');

console.log(`archived  ${id}`);
console.log(`  file    ${dest} (${(bytes.length/1024).toFixed(0)} kB)`);
console.log(`  sha256  ${hash}`);
console.log(`\nRun npm run build to see whether the city now publishes.`);
