import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { payload } from '../scripts/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const TARIFFS = readdirSync(join(ROOT, 'data/tariffs')).filter(f => f.endsWith('.json'))
  .map(f => read(`data/tariffs/${f}`));
const CITIES = readdirSync(join(ROOT, 'data/cities')).filter(f => f.endsWith('.json'))
  .map(f => read(`data/cities/${f}`));
const JURIS = Object.fromEntries(readdirSync(join(ROOT, 'data/jurisdictions'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const j = read(`data/jurisdictions/${f}`); return [j.tariff_jurisdiction_id, j]; }));

/**
 * City ≠ observation unit.
 *
 * A tariff is set by a jurisdiction, a utility, a service area and a customer
 * class — never by a city. City stays the display layer and the public URL, and
 * the observation belongs to the jurisdiction. Migrated at six published
 * observations rather than at thirty, on the case that forced it: Riyadh and
 * Jeddah share one national schedule, and the inverse case — one city served by
 * several jurisdictions — is handled by the same separation.
 */
describe('every tariff belongs to a jurisdiction, not to a city', () => {
  for (const t of TARIFFS) {
    test(`${t.id}`, () => {
      const j = t.jurisdiction;
      assert.ok(j, 'no jurisdiction declared');
      assert.ok(JURIS[j.tariff_jurisdiction_id],
        `unknown jurisdiction ${j.tariff_jurisdiction_id}`);
      assert.ok(j.utility_id && j.customer_class_id && j.tariff_schedule_id && j.observation_id);
      const utilities = JURIS[j.tariff_jurisdiction_id].utilities.map(u => u.id);
      assert.ok(utilities.includes(j.utility_id),
        `${j.utility_id} is not a utility of ${j.tariff_jurisdiction_id}`);
    });
  }
});

describe('SAUDI ARABIA — the structural test the migration was made for', () => {
  const riyadh = CITIES.find(c => c.id === 'riyadh');
  const jeddah = CITIES.find(c => c.id === 'jeddah');

  test('two cities exist and point at one schedule', () => {
    assert.equal(riyadh.tariff_id, 'saudi-nwc-2026');
    assert.equal(jeddah.tariff_id, 'saudi-nwc-2026');
    assert.equal(riyadh.tariff_jurisdiction_id, jeddah.tariff_jurisdiction_id);
  });

  test('the tariff logic exists once and neither city owns it', () => {
    const shared = TARIFFS.filter(t => t.id === 'saudi-nwc-2026');
    assert.equal(shared.length, 1, 'the schedule must not be duplicated per city');
    assert.equal(shared[0].city, null, 'a shared schedule has no owning city');
    assert.deepEqual(shared[0].display_cities, ['riyadh', 'jeddah']);
    /* No other tariff record carries these rates. */
    const dupes = TARIFFS.filter(t => t.id !== 'saudi-nwc-2026'
      && t.jurisdiction?.tariff_jurisdiction_id === 'sa-nwc-national');
    assert.deepEqual(dupes, []);
  });

  test('a blocker is a property of the schedule, so it holds both cities', () => {
    const t = TARIFFS.find(x => x.id === 'saudi-nwc-2026');
    assert.ok(t.component_states.every(c => c.status === 'unresolved'));
    for (const c of [riyadh, jeddah]) {
      assert.equal(c.publication_status, 'research_pending');
      assert.match(c.shared_tariff_note, /Resolving a blocker resolves it for both/);
    }
  });

  test('at most one may enter the basket, and the record says so', () => {
    /* freezeBase() refuses more than one territory per country. Both can be
       published city records; only one can be a constituent. */
    const t = TARIFFS.find(x => x.id === 'saudi-nwc-2026');
    assert.match(t.basket_note, /one territory per country/);
  });

  test('and Rule 13 is pre-empted, because this will be the cheapest bill', () => {
    const t = TARIFFS.find(x => x.id === 'saudi-nwc-2026');
    assert.match(t.register_note, /forbids calling it cheap or efficient/);
    assert.match(t.register_note, /most water-scarce/);
  });
});

describe('the migration moved no published figure', () => {
  const before = read('test/fixtures/pre-migration-snapshot.json');
  /* The payload as produced now. Reading dist/site.json compared the snapshot
     against whatever was last built, which on a clean checkout does not exist. */
  const after = payload;

  test('the snapshot exists and covers the cities that were public', () => {
    assert.ok(Object.keys(before).length >= 8);
  });

  for (const [id, was] of Object.entries(read('test/fixtures/pre-migration-snapshot.json'))) {
    test(`${id} is unchanged`, () => {
      const now = after.cities.find(c => c.id === id);
      assert.ok(now, `${id} left the public catalogue during a schema migration`);
      assert.deepEqual(now.price_m3 ?? null, was.price_m3, 'standardized price moved');
      assert.deepEqual(now.grade ?? null, was.grade, 'grade moved');
      /* Keyed on position and name together: Singapore carries two components
         both called GST, one per stream, so the name alone is not a key. */
      for (const [i, name, amount] of was.components) {
        const c = (now.components ?? [])[i];
        assert.ok(c, `component ${i} ("${name}") disappeared`);
        assert.equal(c.name, name, `component ${i} changed identity`);
        assert.equal(c.monthly ?? c.annual, amount, `"${name}" moved`);
      }
    });
  }
});

describe('a jurisdiction may serve many cities and a city many jurisdictions', () => {
  test('the national Saudi jurisdiction lists two display cities', () => {
    assert.deepEqual(JURIS['sa-nwc-national'].display_cities, ['riyadh', 'jeddah']);
    assert.equal(JURIS['sa-nwc-national'].service_areas.length, 2);
  });

  test('every jurisdiction names its authority, not just its utility', () => {
    for (const [id, j] of Object.entries(JURIS)) {
      assert.ok(j.authority && j.authority.length > 10, `${id} names no authority`);
    }
  });

  test('Sydney records that the wholesale jurisdiction is a different one', () => {
    /* §3.8a. The two are easy to conflate and the model now says they are not
       the same instrument. */
    assert.match(JURIS['au-nsw-sydneywater'].note, /WaterNSW wholesale jurisdiction/);
    assert.match(JURIS['au-nsw-sydneywater'].note, /31-day/);
  });
});
