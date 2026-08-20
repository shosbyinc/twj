import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { archiveStatus, isArchived } from '../src/publication.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

describe('a hash, not a URL, is what archived means', () => {
  test('a PENDING placeholder is not provenance', () => {
    assert.equal(isArchived({ archive_sha256: 'PENDING — original not obtained' }), false);
    assert.equal(isArchived({}), false);
    assert.equal(isArchived(undefined), false);
    assert.equal(isArchived({ archive_sha256: 'sha256:32df95213f70f' }), true);
  });
});

describe('publication is per metric, not per city', () => {
  const dubai = read('data/cities/dubai.json');

  test('the unobtained decree holds the services figure', () => {
    const s = archiveStatus(dubai, SOURCES);
    assert.equal(s.by_metric.total_water_services, false);
    assert.deepEqual(s.sources_missing.total_water_services, ['dubai-decree-47-2024']);
  });

  test('and does not hold the water supply figure', () => {
    const s = archiveStatus(dubai, SOURCES);
    assert.equal(s.by_metric.water_supply, true);
    assert.deepEqual(s.sources_missing.water_supply, []);
    assert.equal(s.archived, true);
  });

  test('a declared metric still inherits the shared documents', () => {
    /* The invoice is listed once, under shared, and must reach both metrics. */
    const s = archiveStatus({
      sources: ['a', 'b'],
      sources_by_metric: { shared: ['a'], water_supply: [], total_water_services: ['b'] }
    }, { a: {}, b: { archive_sha256: 'sha256:x' } });
    assert.equal(s.by_metric.water_supply, false, 'shared source is unarchived');
    assert.deepEqual(s.sources_missing.water_supply, ['a']);
  });

  test('a city that declares nothing is judged on all its documents', () => {
    const s = archiveStatus({ sources: ['a', 'b'] },
      { a: { archive_sha256: 'sha256:x' }, b: {} });
    assert.equal(s.by_metric.water_supply, false);
    assert.equal(s.by_metric.total_water_services, false);
  });

  test('every other city is unaffected by the change', () => {
    for (const f of readdirSync(join(ROOT, 'data/cities')).filter(x => x.endsWith('.json'))) {
      const c = read(`data/cities/${f}`);
      if (c.sources_by_metric) continue;
      const s = archiveStatus(c, SOURCES);
      const all = (c.sources ?? []).every(id => isArchived(SOURCES[id]));
      assert.equal(s.archived, all, `${c.id} changed meaning`);
    }
  });
});
