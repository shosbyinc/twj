import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isArchived } from '../src/publication.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const M = read('data/capture-manifest.json');
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * The capture manifest, checked against the repository.
 *
 * A queue of cities to source is worth nothing if it drifts from what has
 * actually been captured. These tests keep the two honest to each other in both
 * directions: a city cannot be published while still queued, and a queued city
 * cannot lose its blocking question without someone answering it.
 */
describe('the manifest and the repository agree', () => {
  test('every captured city has an archived source and a city record', () => {
    for (const c of M.captures) {
      const path = `data/cities/${c.city.replace('-', '')}.json`;
      const alt = `data/cities/${c.city}.json`;
      const file = existsSync(join(ROOT, path)) ? path : alt;
      assert.ok(existsSync(join(ROOT, file)), `${c.city} has no city record`);
      const city = read(file);
      assert.ok(city.sources.length > 0, `${c.city} cites no source`);
      for (const id of city.sources) {
        assert.ok(SOURCES[id], `${c.city} cites unknown source ${id}`);
        assert.ok(isArchived(SOURCES[id]), `${c.city} cites unarchived ${id}`);
      }
    }
  });

  /**
   * The capture log records events, and states nothing that can go stale.
   *
   * It previously carried a grade and a held_by sentence per entry, both
   * hand-written. Both drifted, and the drift was invisible because the log was
   * being read as if it were state: Seoul and Sydney each appeared twice with
   * contradictory lines, and five entries were still held by Rule 9.3 — the
   * two-person review, withdrawn in v1.3. `npm run list` printed all of it,
   * including a closing paragraph asking for a second reader nobody wanted any
   * more. Nothing in the repository could notice, because a sentence about a
   * rule is not checked by anything.
   *
   * A capture knows one thing: that a document was obtained, on a date. The
   * grade belongs to the tariff record and what holds a city belongs to the
   * acceptance gate, which recomputes both on every build.
   */
  test('a capture records only what a capture knows', () => {
    const allowed = new Set(['city', 'captured', 'note']);
    for (const c of M.captures) {
      assert.match(c.captured ?? '', /^\d{4}-\d{2}-\d{2}$/, `${c.city} has no capture date`);
      for (const k of Object.keys(c)) {
        assert.ok(allowed.has(k),
          `capture log entry for ${c.city} carries "${k}", which is state and will go stale — `
          + 'grade comes from the tariff record, what holds a city from the acceptance gate');
      }
    }
  });

  /**
   * Rule 9.3 was replaced rather than deleted, so the number still names a live
   * rule — the publication checklist. What must not survive is a request for
   * the withdrawn thing. This is narrow on purpose: it catches the phrasing that
   * was actually there rather than pretending to detect stale prose in general.
   */
  test('nothing asks for the withdrawn two-person review', () => {
    /* Widened after the same stale sentence turned up a second time, on three
       city records, where it reached no page only because `awaiting` is read
       for research-pending cities and those three are published. */
    const cityText = readdirSync(join(ROOT, 'data/cities'))
      .map(f => readFileSync(join(ROOT, `data/cities/${f}`), 'utf8')).join('\n');
    const text = JSON.stringify(M) + readFileSync(join(ROOT, 'scripts/shopping-list.js'), 'utf8')
      + '\n' + cityText;
    for (const phrase of [/second reader/i, /two-person review/i, /second verifier/i]) {
      const hits = text.split('\n').filter(l => phrase.test(l) && !/withdrawn|used to|previously|no longer/i.test(l));
      assert.equal(hits.length, 0,
        `the capture queue still asks for the two-person review withdrawn in v1.3: ${hits[0]?.trim().slice(0, 90)}`);
    }
  });

  test('no queued city has a published record (Rule 7.2)', () => {
    for (const q of M.queue) {
      for (const f of readdirSync(join(ROOT, 'data/cities'))) {
        const city = read(`data/cities/${f}`);
        if (city.id !== q.city) continue;
        /* Since per-metric blockers, a city can be published on its supply
           metric and still queued for another. What may not happen is a queued
           city with nothing left to obtain. */
        if (city.status === 'published') {
          assert.ok(q.queue_status && /metric|Queued only/.test(q.queue_status),
            `${q.city} is published and queued without saying which metric is outstanding`);
        }
      }
    }
  });

  test('every queued city names at least one document and what it answers', () => {
    for (const q of M.queue) {
      assert.ok(q.documents_required?.length, `${q.city} queues no document`);
      for (const d of q.documents_required) {
        assert.ok(d.what && d.what.length > 20, `${q.city} has a vague document`);
        assert.ok(d.answers && d.answers.length > 20,
          `${q.city}: a document with no stated question is a wish, not a task`);
      }
    }
  });

  test('a city whose arithmetic is verified points at the spec that verifies it', () => {
    for (const q of M.queue) {
      if (!q.arithmetic_verified) continue;
      assert.ok(q.spec, `${q.city} claims verified arithmetic with no spec`);
      assert.ok(existsSync(join(ROOT, q.spec)), `${q.city}: ${q.spec} is missing`);
    }
  });

  test('each blocker in the manifest is still open in its spec', () => {
    /* If a spec stops declaring an unresolved component, the manifest entry
       describing that blocker must go too — otherwise the queue starts lying. */
    for (const q of M.queue) {
      if (!q.spec || !existsSync(join(ROOT, q.spec))) continue;
      const spec = read(q.spec);
      const claimsBlocker = q.documents_required.some(d => /THE BLOCKER/.test(d.answers));
      if (!claimsBlocker) continue;
      const open = (spec.component_states ?? []).some(c => c.status === 'unresolved')
        || (spec.blocking ?? []).length > 0;
      assert.ok(open, `${q.city} lists a blocker the spec no longer has`);
    }
  });

  test('the traps are recorded, because they are the expensive part', () => {
    for (const q of M.queue) {
      assert.ok(q.known_traps?.length, `${q.city} records no trap`);
    }
  });
});
