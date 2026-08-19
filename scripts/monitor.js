#!/usr/bin/env node
/**
 * Runs the source monitor and writes the What Changed record.
 * In production this fetches each source URL; offline it reads a captured
 * snapshot from archive/ so the run is reproducible either way.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkSource, changeLog } from '../src/monitor.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);

const sources = readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => read(`data/sources/${f}`))
  .map(s => ({ ...s,
    class: s.class ?? (s.cadence?.includes('monthly') ? 'monthly_surcharge' : 'tariff_schedule'),
    last_checked_at: s.accessed_at,
    content_hash: s.archive_sha256 && !String(s.archive_sha256).startsWith('PENDING')
      ? s.archive_sha256 : null }));

const checks = sources.map(s => {
  /* A hash-only source is held privately and has no copy here to re-read.
     Its hash is the record. Absence of a file is not absence of provenance. */
  if (s.archive_kind === 'hash_only') {
    return { id: s.id, state: 'current', changed: false, age: null, window: null,
      reason: null, note: 'hash-only source, held privately and not re-readable here' };
  }
  const snap = join(ROOT, s.archive_path ?? '');
  const body = s.archive_path && existsSync(snap) ? readFileSync(snap) : null;
  if (!s.content_hash) {
    return { id: s.id, state: 'stale', changed: null, age: null, window: null,
      reason: 'no baseline hash captured — source has never been archived' };
  }
  return checkSource(s, body, today);
});

const log = changeLog(checks, sources);
log.run_date = today;
log.note = 'Detection is automatic. Publication is not. A changed source moves its observations to stale and opens a review.';

if (!existsSync(join(ROOT, 'dist'))) mkdirSync(join(ROOT, 'dist'));
writeFileSync(join(ROOT, 'dist/what-changed.json'), JSON.stringify(log, null, 2));

console.log(`What changed · ${today}`);
console.log(`  ${log.headline}`);
console.log(`  checked ${log.checked} · current ${log.current} · due ${log.verification_due} · stale ${log.stale}`);
for (const c of checks.filter(c => c.state !== 'current')) {
  console.log(`  − ${c.id}: ${c.reason}`);
}
console.log('\n  → dist/what-changed.json');
