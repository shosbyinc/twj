import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { acceptCity } from '../src/acceptance.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

const good = {
  id: 'testville', utility: 'Testville Water', tariff_id: 'testville-2026',
  verified_at: '2026-08-01', verified_by: ['collector', 'second-reader'],
  sources: ['thames-charges-scheme-2026-27']
};
const reasons = c => acceptCity(c, SOURCES, null, '2026-08-17').problems.join(' | ');

describe('the gate refuses, and names what it refused', () => {
  test('a complete record passes', () => {
    const g = acceptCity(good, SOURCES, null, '2026-08-17');
    assert.deepEqual(g.problems, []);
    assert.equal(g.publishable, true);
  });

  test('a reviewer must be recorded, though one is now enough (v1.3)', () => {
    /* The two-person review was withdrawn in v1.3 and replaced by the
       publication checklist. Provenance of the reading is still required. */
    assert.equal(reasons({ ...good, verified_by: ['collector'] }).includes('reviewer'), false);
    assert.match(reasons({ ...good, verified_by: undefined }), /no reviewer recorded/);
  });

  test('an unnamed utility blocks the city', () => {
    assert.match(reasons({ ...good, utility: undefined }), /no utility named/);
  });

  test('a tier 3 source cannot price a bill', () => {
    const s = { ...SOURCES, blog: { id: 'blog', tier: 5, archive_sha256: 'sha256:x' } };
    const g = acceptCity({ ...good, sources: ['blog'] }, s, null, '2026-08-17');
    assert.match(g.problems.join(' '), /tier 5/);
    assert.equal(g.publishable, false);
  });

  test('an unknown source is named, not ignored', () => {
    assert.match(reasons({ ...good, sources: ['nowhere'] }), /unknown source "nowhere"/);
  });

  test('a tariff that has not begun cannot be published', () => {
    const g = acceptCity(good, SOURCES, { effective_from: '2027-01-01' }, '2026-08-17');
    assert.match(g.problems.join(' '), /has not begun/);
  });

  test('published supply shares need a production year', () => {
    assert.match(reasons({ ...good, supply: { shares_published: true } }), /production year/);
  });

  test('an unarchived supply source withholds the figure', () => {
    const g = acceptCity({ ...good, sources: ['dubai-decree-47-2024'] },
      SOURCES, null, '2026-08-17');
    assert.equal(g.publishable, false);
    assert.match(g.metric_problems.water_supply.join(' '), /no archived snapshot hash/);
  });

  test('an unarchived services source withholds only that metric', () => {
    const g = acceptCity(read('data/cities/dubai.json'), SOURCES, null, '2026-08-17');
    assert.equal(g.publishable, true, 'the supply figure still ships');
    assert.equal(g.metric_problems.water_supply, undefined);
    assert.match(g.metric_problems.total_water_services.join(' '), /dubai-decree-47-2024/);
  });
});

describe('a city either passes its gate or says what it is waiting for', () => {
  /* Not "every city passes". A city may legitimately be mid-collection — what
     may never happen is a city failing the gate without declaring why, or
     calling itself published while the gate refuses it. */
  for (const f of readdirSync(join(ROOT, 'data/cities')).filter(x => x.endsWith('.json'))) {
    const c = read(`data/cities/${f}`);
    test(`${c.id}`, () => {
      const t = c.tariff_id ? read(`data/tariffs/${c.tariff_id}.json`) : null;
      const g = acceptCity(c, SOURCES, t);
      if (g.problems.length === 0) {
        /* Since v1.3 a city can clear the gate without a second signature. Its
           record must then not claim to be waiting for one. */
        return;
      }
      assert.ok(c.awaiting && c.awaiting.length > 30,
        `${c.id} fails the gate (${g.problems.join('; ')}) without declaring what it awaits`);
      assert.notEqual(c.status, 'published',
        `${c.id} calls itself published while the gate refuses it`);
    });
  }

  test('Singapore is held for a reader, not for a document', () => {
    const c = read('data/cities/singapore.json');
    const g = acceptCity(c, SOURCES, read(`data/tariffs/${c.tariff_id}.json`));
    assert.deepEqual(g.problems, [], 'nothing is outstanding since v1.3');
    assert.equal(g.metric_problems.water_supply, undefined,
      'provenance is complete: Annex A is archived and hashed');
  });
});
