import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill } from '../src/engine.js';
import { tariffCurve } from '../src/curve.js';
import { acceptCity } from '../src/acceptance.js';
import { METHODOLOGY } from '../src/methodology.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/sydney-water-2026-07-01.json');
const open_ = () => ({ ...T(), component_states: undefined });
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Sydney.
 *
 * Source capture sprint 01, city 3. The first city whose published price
 * depends on a physical measurement that changes weekly, which is why it is
 * Grade B with every document in hand.
 */
describe('ACCEPTANCE — Sydney, the standardized bill', () => {
  const b = calculateBill(open_());

  test('usage 15 x 3.41 = A$51.15 a month', () => {
    assert.equal(b.components.find(c => c.id === 'water_usage').monthly, 51.15);
  });

  test('the service charge is annualised by days, not by quarters', () => {
    /* 365.2425/92 = 3.9700 quarters a year, so A$26.65 a quarter is A$105.80 a
       year. Four quarters would give A$106.60 and a different bill. */
    assert.equal(b.components.find(c => c.id === 'water_service').annual, 105.8);
    assert.notEqual(Number((26.65 * 4).toFixed(2)), 105.8);
  });

  test('Water Supply A$59.97, standardized price A$3.998/m³', () => {
    assert.equal(b.water_supply.monthly, 59.97);
    assert.equal(tariffCurve(open_()).points.find(p => p.m3 === 15).supply_per_m3, 3.998);
  });

  test('Total Water Services is comparable here, unlike Perth', () => {
    /* The wastewater charge is fixed and contains a deemed usage amount. It
       rests on the connection, not on what the property would rent for. */
    assert.equal(b.total_services.monthly, 122.79);
    assert.equal(b.total_services.withheld_because, null);
  });
});

describe('ACCEPTANCE — Sydney, reconciled against the published typical bill', () => {
  test('50 kL over a 92-day quarter = A$387.03, exactly as published', () => {
    const r = calculateBill({ ...open_(), reconciliation_volume_m3: 50, reconciliation_period_days: 92 });
    const q = id => r.components.find(c => c.id === id).annual;
    assert.equal(q('water_service'), 26.65);
    assert.equal(q('water_usage'), 170.5);
    assert.equal(q('ww_service'), 189.88);
    assert.equal(Number((q('water_service') + q('water_usage') + q('ww_service')).toFixed(2)), 387.03);
  });

  test('a reconciliation must prorate a fixed charge to its own period', () => {
    /* Without the period length the run falls back to a monthly slice and lands
       A$145 below the publisher — which is what it did before this city. */
    const noDays = calculateBill({ ...open_(), reconciliation_volume_m3: 50 });
    const q = id => noDays.components.find(c => c.id === id).annual;
    assert.notEqual(q('water_service'), 26.65);
  });

  test('the typical bundle excludes stormwater, which the reconciliation proves', () => {
    /* 387.03 is reached without the A$30.26 stormwater charge. Had the
       publisher included it, the sum would not close. */
    assert.notEqual(Number((26.65 + 170.5 + 189.88 + 30.26).toFixed(2)), 387.03);
    assert.ok(T().excluded.some(e => /Stormwater/.test(e.item)));
  });
});

describe('ACCEPTANCE — Sydney, the drought switch, resolved by two pieces of evidence', () => {
  test('rule plus dated state observation makes the applicable rate (§3.8)', () => {
    const ts = T().tariff_state;
    assert.equal(ts.type, 'drought');
    assert.equal(ts.is_structural, true, 'a drought rate is tariff architecture');
    assert.equal(ts.rule_source_id, 'sydneywater-residential-pricing-2026-27');
    assert.equal(ts.state_source_id, 'so-greater-sydney-2026-08-17');
    assert.equal(ts.state, 'normal');
    const s = T().component_states.find(c => c.component === 'tariff_state_drought');
    assert.equal(s.status, 'observed');
  });

  test('the state observation carries its own authority, date and hash', () => {
    const o = read('data/state-observations/so-greater-sydney-2026-08-17.json');
    assert.equal(o.authority, 'WaterNSW');
    assert.equal(o.value, 92);
    assert.equal(o.tariff_state_result, 'normal');
    assert.ok(o.snapshot_sha256.startsWith('sha256:'));
    /* Separate fields on purpose: a document archived today can prove a past
       state, and a historical benchmark would use the storage history series. */
    assert.ok('observed_at' in o && 'retrieved_at' in o);
  });

  test('the open trigger mechanics cannot change the rate at 92%', () => {
    /* Thirty-two points above the engagement threshold, moving 0.1 a week: no
       lag of any length selects the drought rate from here. Material only near
       a crossing, so it is a validation gap at this state and says so. */
    const s = T().component_states.find(c => c.component === 'drought_trigger_mechanics');
    assert.equal(s.status, 'unresolved');
    assert.equal(s.blocker_class, 'validation_gap');
    assert.match(s.reverts_to_material_when, /approaches 60%/);
  });

  test('the trigger comes from the retail instrument only (§3.8a)', () => {
    const ts = T().tariff_state;
    assert.equal(ts.rule_source_id, 'sydneywater-residential-pricing-2026-27');
    assert.ok(T().sources.includes(ts.rule_source_id),
      'the trigger must be cited by the tariff that uses it');
    assert.match(ts.trigger_provenance_note, /31-day lag/);
  });

  test('the two published rates differ by 10.8% of the supply bill', () => {
    const drought = calculateBill({
      ...open_(),
      components: T().components.map(c => c.id !== 'water_usage' ? c
        : { ...c, blocks: [{ from: 0, to: null, rate: T().tariff_state.rates_by_state.drought }] })
    });
    assert.equal(drought.water_supply.monthly, 66.42);
    const spread = drought.water_supply.monthly / 59.97 - 1;
    assert.ok(spread > 0.1 && spread < 0.11);
    /* Far above the 1% ceiling that separates Grade B from Grade A. */
    assert.ok(spread * 100 > METHODOLOGY.u_grade_b_ceiling);
  });

  test('the engine and the gate now share one rule about open questions', () => {
    /* The engine barred Grade A on any unresolved component while the gate
       honoured blocker_class. Two rules for one distinction is how a
       methodology drifts from its own code. */
    assert.doesNotThrow(() => calculateBill(T()));
    assert.equal(T().grade, 'A');
  });

  test('the bulk 31-day lag is recorded as belonging to another instrument', () => {
    const a = readFileSync(join(ROOT, SOURCES['sydneywater-residential-pricing-2026-27'].archive_path), 'utf8');
    assert.match(a, /31-day lag/);
    assert.match(a, /must not be conflated/);
  });

  test('and the freshness question it exposes is written down', () => {
    /* §6's cadence classes assume a document revised on a schedule. A tariff
       whose applicable rate follows a weekly measurement is not that, and the
       record says so rather than leaving it implicit. */
    const c = read('data/cities/sydney.json');
    assert.match(c.freshness_note, /switches with/i);
    assert.match(c.freshness_note, /re-reading in a way no tariff document does/);
    assert.ok(c.open_items.some(i => /storage history series/.test(i)),
      'and a past benchmark date would need a different source');
  });
});

describe('ACCEPTANCE — Sydney, exclusions and the gate', () => {
  test('the pension rebate is excluded under Rule 3.1, not netted off', () => {
    const e = T().excluded.find(x => /Pension/.test(x.item));
    assert.match(e.reason, /means-tested/);
  });

  test('every exclusion names a source', () => {
    for (const e of T().excluded) assert.ok(e.source_id, `${e.item} has no source`);
  });

  test('the gate holds the city on both reasons, in order', () => {
    const g = acceptCity(read('data/cities/sydney.json'), SOURCES, T());
    assert.deepEqual(g.problems, [], 'nothing holds Sydney since the state was captured');
  });
});
