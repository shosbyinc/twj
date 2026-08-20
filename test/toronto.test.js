import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill, EngineError } from '../src/engine.js';
import { acceptCity } from '../src/acceptance.js';
import { isArchived } from '../src/publication.js';
import { payload } from '../scripts/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/toronto-2025.json');
const open_ = () => ({ ...T(), component_states: undefined });
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Toronto, the negative case.
 *
 * The inverse of Perth. Perth's water charge is a clean function of volume and
 * its sewerage charge rests on a property valuation; Toronto's combined charge
 * is a clean function of volume and cannot be split at all. Between them they
 * are the argument for grading per metric.
 */
describe('ACCEPTANCE — Toronto, the 2025 observation', () => {
  const b = calculateBill(open_());

  test('Total Water Services = C$70.31 a month, from the by-law', () => {
    assert.equal(b.total_services.monthly, 70.31);
    assert.equal(Number((15 * 4.6872).toFixed(2)), 70.31);
  });

  test('Water Supply is null and is never estimated (Rule 3.3)', () => {
    assert.equal(b.water_supply.monthly, null);
    assert.equal(b.streams_separable, false);
  });

  test('the refusal is per metric, not per city (§5)', () => {
    /* Grade C on supply and A on services. Refusing the whole record would
       throw away a figure the methodology says is publishable. */
    assert.equal(T().metric_grades.water_supply.grade, 'C');
    assert.equal(T().metric_grades.total_water_services.grade, 'A');
    assert.doesNotThrow(() => calculateBill(open_()));
  });

  test('a record that is Grade C on every metric is still refused', () => {
    assert.throws(() => calculateBill({
      ...open_(),
      metric_grades: { water_supply: { grade: 'C' }, total_water_services: { grade: 'C' } }
    }), /Grade C on every metric/);
  });

  test('the observation is closed with a date, not overwritten (Rule 7.3)', () => {
    assert.equal(T().effective_to, '2025-12-31');
    assert.equal(T().closed, true);
    assert.match(T().closed_note, /Nothing here is recalculated/);
  });
});

describe('ACCEPTANCE — Toronto, the inference that was refused', () => {
  const t = T();

  test('the 57% sewer surcharge is recorded and not used', () => {
    const r = t.refused_inferences[0];
    assert.match(r.found_in, /57% of the Block 1 rate/);
    assert.match(r.why_refused, /Rule 3\.3/);
    /* The arithmetic it would give is written down, so nobody has to redo it
       to understand what was declined. */
    assert.match(r.arithmetic_it_would_give, /2\.0155/);
    assert.equal(Number((4.6872 * 0.43).toFixed(4)), 2.0155);
  });

  test('the refusal states why it is recorded at all', () => {
    assert.match(t.refused_inferences[0].recorded_because, /later reader/);
  });

  test('no supply figure appears anywhere in the record', () => {
    assert.equal(t.metric_grades.water_supply.publishable, false);
    const s = t.component_states.find(c => c.component === 'supply_only_rate');
    assert.equal(s.status, 'confirmed_absent');
  });
});

describe('ACCEPTANCE — Toronto, nothing assumed to be zero', () => {
  test('the absent recurring charge is confirmed by enumeration', () => {
    const s = T().component_states.find(c => c.component === 'recurring_fixed_charge');
    assert.equal(s.status, 'confirmed_absent');
    assert.match(s.basis, /every fee in Schedule 2 is a one-off event/);
  });

  test('the tax line is closed by a bill, not by a missing mention', () => {
    /* The record was right that a differential proves nothing: HST named
       against technical review fees and not against the consumption rate is
       suggestive and no more. It was wrong about where the answer lived. The
       City's own worked bill states the amount due as the water charge plus
       the solid waste charge, and the arithmetic closes with no residual — a
       tax on consumption would have to appear in it. Same move as Abu Dhabi's
       recurring charge: an enumerated bill settles an absence a schedule cannot. */
    const s = T().component_states.find(c => c.component === 'hst_or_gst');
    assert.equal(s.status, 'confirmed_absent');
    assert.equal(s.source_id, 'toronto-utility-billing');
    assert.equal(187.22 + 111.20, 298.42);
    assert.equal(Number((197.07 + 111.20).toFixed(2)), 308.27);
  });

  test('the caveat is kept: the bill shows no tax and does not say why', () => {
    const s = T().component_states.find(c => c.component === 'hst_or_gst');
    assert.match(s.residual_caveat, /does not establish why/);
    /* And the statute stays in the queue as provenance, holding no figure. */
    assert.ok(read('data/cities/toronto.json').open_items
      .some(i => /Excise Tax Act/.test(i) && /provenance/.test(i)));
  });

  test('the late-payment rate is excluded as a penalty', () => {
    const e = T().excluded.find(x => /Late-payment/.test(x.item));
    assert.match(e.reason, /penalty/);
    assert.equal(Number((4.9338 / 4.6872).toFixed(4)), 1.0526);
  });

  test('the low-income rebate is excluded under Rule 3.1', () => {
    assert.ok(T().excluded.some(e => /Rule 3\.1/.test(e.reason)));
  });
});

describe('ACCEPTANCE — Toronto, provenance and the 2026 gap', () => {
  test('the source is a by-law, archived and hashed', () => {
    const s = SOURCES['toronto-municode-441-schedule1'];
    assert.equal(s.class, 'statute');
    assert.equal(s.tier, 1);
    assert.equal(isArchived(s), true);
  });

  test('the capture carries its own document date, which is how we know it is stale', () => {
    assert.equal(SOURCES['toronto-municode-441-schedule1'].document_date, '2025-02-11');
    assert.match(SOURCES['toronto-municode-441-schedule1'].archive_note, /printed in the footer/);
  });

  test('the 2026 rate is now observed, and still not the published one', () => {
    /* 4.6872 x 1.0375 = 4.862970: rounds to 4.8630, truncates to 4.8629. The
       circulating figure was 4.8629, consistent with truncation and not
       evidence of it — and the City now prints 4.8629 itself, which settles
       what the rate is without settling how it was rounded. The observation
       this record publishes is still 2025, because rolling it forward is a
       decision and not a consequence of learning a number. */
    assert.equal(Number((4.6872 * 1.0375).toFixed(6)), 4.86297);
    assert.equal(Math.floor(4.6872 * 1.0375 * 10000) / 10000, 4.8629);
    const s = T().component_states.find(c => c.component === 'rate_2026');
    assert.equal(s.status, 'observed');
    assert.equal(s.source_id, 'toronto-water-rates-fees');
    assert.equal(T().effective_from.slice(0, 4), '2025');
    assert.ok(read('data/cities/toronto.json').open_items
      .some(i => /roll the observation to 2026/.test(i)));
  });

  test('the city is marked verification_due, because the capture is a year old', () => {
    assert.equal(read('data/cities/toronto.json').freshness, 'verification_due');
  });

  test('the gate no longer holds it, and one metric publishes', () => {
    /* The gate reported one problem for a year: an unresolved tax component.
       It is closed, so the city passes — and passing does not make the supply
       price appear. Toronto stays an exception record with a published
       services figure, which is the state the Index was missing a shape for. */
    const g = acceptCity(read('data/cities/toronto.json'), SOURCES, T());
    assert.deepEqual(g.problems, []);
    assert.equal(read('data/cities/toronto.json').publication_status, 'exception_record');
    assert.equal(T().metric_grades.total_water_services.publishable, true);
    assert.equal(T().metric_grades.water_supply.publishable, false);
    assert.match(read('data/cities/toronto.json').awaiting, /Rule 5\.1/);
  });

  test('the exception record carries the figure it proved', () => {
    const c = payload.cities.find(x => x.id === 'toronto');
    assert.equal(c.not_priced, true, 'no supply price exists to publish');
    /* The not_priced branch omits price_m3 rather than nulling it; either way
       there is no supply figure, and the assertion should not depend on which. */
    assert.ok(c.price_m3 == null);
    assert.equal(c.services_publishable, true);
    assert.equal(c.services_month, 70.31);
    assert.equal(c.services_grade, 'A');
  });
});
