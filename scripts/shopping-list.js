#!/usr/bin/env node
/**
 * The capture shopping list, generated from data/capture-manifest.json.
 *
 * Written rather than typed, so it cannot drift from the manifest the tests
 * check. Each document is followed by the question it has to answer, because a
 * document with no question is a wish rather than a task.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { payload } from './site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const M = JSON.parse(readFileSync(join(ROOT, 'data/capture-manifest.json'), 'utf8'));
const out = [];

out.push('# TWJ — documents to obtain', '');
out.push(`Generated from \`data/capture-manifest.json\` on ${new Date().toISOString().slice(0, 10)}.`);
out.push('Do not edit by hand: run `npm run list`.', '');
out.push('For each document, what it must answer is printed beneath it. A capture that');
out.push('does not answer its question has not closed anything.', '');
out.push('**What a usable capture is:** the publisher\'s own file where possible, or the');
out.push('text of the sections used from a direct fetch. A URL is not provenance —');
out.push('every source is archived at collection and stored with a SHA-256 hash,');
out.push('because a page updated next April stops proving this year\'s figure. Where the');
out.push('publisher blocks automated fetching, a saved PDF or a print-to-PDF of the page');
out.push('is worth more than any quantity of quoting.', '');

const blockers = [];
for (const q of M.queue) {
  out.push(`## ${q.city.replace(/(^|-)([a-z])/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase())}`);
  if (q.utility) out.push(`*${q.utility}*  ·  wave ${q.wave}`);
  if (q.queue_status) out.push('', q.queue_status);
  out.push('');
  q.documents_required.forEach((d, i) => {
    const isBlocker = /THE BLOCKER/.test(d.answers);
    if (isBlocker) blockers.push(`${q.city} — ${d.what}`);
    out.push(`**${i + 1}. ${d.what}**${isBlocker ? '  ← blocker' : ''}`);
    out.push('');
    out.push(`> ${d.answers.replace(/^THE BLOCKER[.,]?\s*/, '')}`);
    out.push('');
  });
  if (q.known_traps?.length) {
    out.push('Traps:', '');
    for (const t of q.known_traps) out.push(`- ${t}`);
    out.push('');
  }
}

out.push('---', '', '## The blockers, in one place', '');
out.push('Nothing else in these cities can be published until these arrive.', '');
blockers.forEach((b, i) => out.push(`${i + 1}. ${b}`));
out.push('');
/* Where each captured city now stands.
 *
 * This section used to print manifest.completed line by line, which was an
 * append-only log being read as a statement of state. Seoul and Sydney each
 * appeared twice with contradictory lines — Sydney as grade B held by two
 * rules and, four lines later, as grade A held by nothing — and five entries
 * cited Rule 9.3, the two-person review, withdrawn in v1.3. The list was
 * telling its only reader to go and fetch things that were no longer wanted.
 *
 * A grade lives in the tariff record and what holds a city is what the
 * acceptance gate says today. Neither is a fact about a capture, so neither is
 * stored here any more: both are read from the payload, and the log keeps what
 * only it knows — that a document was obtained, on a date. */
out.push('## Where the captured cities stand', '');
out.push('Grade and status below are computed from the tariff records and the');
out.push('acceptance gate at the moment this list was generated, not stored in the');
out.push('manifest. The dates are the capture log.', '');

const byCity = new Map();
for (const c of M.captures) {
  const seen = byCity.get(c.city) ?? [];
  seen.push(c);
  byCity.set(c.city, seen);
}
const queued = new Map(M.queue.map(q => [q.city, q]));

for (const [city, events] of byCity) {
  const p = payload.cities.find(c => c.id === city);
  const dates = [...new Set(events.map(e => e.captured))].sort();
  const held = [];
  if (p) {
    for (const g of p.gate_problems ?? []) held.push(g);
    if (p.services_publishable === false && p.services_blocked_by) held.push(p.services_blocked_by);
  }
  const open = queued.get(city)?.documents_required?.length ?? 0;
  if (open) held.push(`${open} document${open > 1 ? 's' : ''} outstanding in the queue above`);

  const grade = p ? `grade ${p.grade}` : 'no priced record';
  const status = p?.publication_status ? p.publication_status.replace(/_/g, ' ') : 'not modelled';
  out.push(`- **${city}** — captured ${dates.join(', ')} · ${grade} · ${status}`);
  if (!held.length) out.push('  - held by: nothing');
  else for (const h of held) out.push(`  - held by: ${h}`);
}
/* The log begins at sprint 01. Three cities were sourced before it existed and
   would otherwise be absent from a section headed "where the captured cities
   stand" while being published on the site — a list that omits its oldest
   records is a worse instrument than one that admits the omission. */
const unlogged = payload.cities.filter(c => !byCity.has(c.id));
if (unlogged.length) {
  out.push('');
  out.push(`Modelled before the capture log began, and so not dated here: `
    + unlogged.map(c => `**${c.id}** (grade ${c.grade}, ${c.publication_status?.replace(/_/g, ' ')})`).join(', ')
    + '. Their provenance is in `data/sources/`; what is missing is the capture date, not the source.');
}

out.push('');
out.push('## And the ones only you can fetch', '');
const handDocs = M.queue.flatMap(q =>
  q.documents_required.filter(d => d.hand_capture).map(d => `${q.city} — ${d.what}`));
if (!handDocs.length) {
  out.push('None outstanding: every queued document can be fetched.');
} else {
  out.push('These are marked `hand_capture` in the manifest, because the publisher');
  out.push('refuses automated access or because the evidence is an action rather than');
  out.push('a file — a calculator run at a known volume produces no document until');
  out.push('somebody runs it.', '');
  handDocs.forEach((d, i) => out.push(`${i + 1}. ${d}`));
}

const text = out.join('\n') + '\n';
writeFileSync(join(ROOT, 'docs/documents-to-obtain.md'), text);
console.log(`docs/documents-to-obtain.md · ${M.queue.length} cities · ${blockers.length} blockers`);
for (const b of blockers) console.log(`  blocker: ${b}`);
