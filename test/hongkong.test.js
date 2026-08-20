import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill } from '../src/engine.js';
import { tariffCurve } from '../src/curve.js';
import { acceptCity } from '../src/acceptance.js';
import { isArchived } from '../src/publication.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/hongkong-wsd-1995-02-16.json');
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Hong Kong.
 *
 * Source capture sprint 01, city 1. The first city priced from a document that
 * publishes its own worked examples, which makes it the first city reconciled
 * against the publisher twice at two different reading intervals — a stronger
 * check than a single invoice, because the same volume over a shorter period
 * must cost more, and the engine has to get both directions right.
 */
describe('ACCEPTANCE — Hong Kong, the standardized bill', () => {
  const b = calculateBill(T());

  test('Water Supply = HK$59.62 a month', () => {
    assert.equal(b.water_supply.monthly, 59.62);
    assert.equal(b.water_supply.annual, 715.41);
  });

  test('Total Water Services = HK$94.65 a month', () => {
    assert.equal(b.total_services.monthly, 94.65);
  });

  test('the standardized price is HK$3.975/m³', () => {
    assert.equal(tariffCurve(T()).points.find(p => p.m3 === 15).supply_per_m3, 3.975);
  });

  test('the free 12 m³ recurs every statutory period, not once a year', () => {
    /* 180 m³ a year is 59.947021 m³ per 121.64-day period, and the allowance is
       granted about 3.0027 times. Spending it once would overstate the bill. */
    assert.equal(Number((180 * 121.64 / 365.2425).toFixed(6)), 59.947021);
    const yearly = calculateBill({ ...T(), shape: 'annual_bands' });
    assert.notEqual(yearly.water_supply.annual, b.water_supply.annual);
  });
});

describe('ACCEPTANCE — Hong Kong, reconciled against WSD\'s own examples', () => {
  const run = days => calculateBill({
    ...T(), reconciliation_volume_m3: 66, reconciliation_period_days: days });
  const water = bill => bill.components.find(c => c.id === 'water_usage').annual;

  test('example 1: 66 m³ over 127 days = HK$274.05', () => {
    assert.equal(water(run(127)), 274.05);
  });

  test('example 2: 66 m³ over 117 days = HK$299.51', () => {
    assert.equal(water(run(117)), 299.51);
  });

  test('the shorter period costs more, which is the point of proration', () => {
    assert.ok(water(run(117)) > water(run(127)));
  });

  test('the volume rounding stage is what makes example 1 exact', () => {
    /* WSD prints a prorated third tier of 19.837 m³ and bills HK$127.94.
       Without rounding the tier volume to three decimals the engine gets
       19.83722, bills 127.95, and lands a cent above the publisher. */
    const noRounding = calculateBill({
      ...T(), reconciliation_volume_m3: 66, reconciliation_period_days: 127,
      components: T().components.map(c => ({ ...c, block_volume_dp: undefined }))
    });
    assert.equal(water(noRounding), 274.06);
  });

  test('the truncation stage is what makes example 2 exact', () => {
    /* 6.366 × 9.05 = 57.6123. Rounded that is 57.61 either way, but the third
       tier at 18.275 × 6.45 = 117.87375 rounds to 117.88 and truncates to
       117.87 — and WSD bills 117.87. */
    const rounded = calculateBill({
      ...T(), reconciliation_volume_m3: 66, reconciliation_period_days: 117,
      components: T().components.map(c => ({ ...c, line_rounding: 'round' }))
    });
    assert.notEqual(water(rounded), 299.51);
  });
});

describe('ACCEPTANCE — Hong Kong, nothing assumed to be zero', () => {
  const t = T();

  test('the absent standing charge is confirmed, with a source', () => {
    const s = t.component_states.find(c => c.component === 'fixed_water_service_charge');
    assert.equal(s.status, 'confirmed_absent');
    assert.equal(s.source_id, 'wsd-water-sewage-tariff');
    assert.match(s.basis, /enumerates/);
  });

  test('every declared component state is resolved and sourced (Rule 7.6)', () => {
    for (const c of t.component_states) {
      assert.notEqual(c.status, 'unresolved', `${c.component} is still open`);
      assert.ok(c.source_id, `${c.component} has no source`);
    }
  });

  test('the 5% overdue surcharge is excluded as a penalty, not ignored', () => {
    const e = t.excluded.find(x => /overdue/.test(x.item));
    assert.ok(e && /penalty/i.test(e.reason));
  });

  test('the non-domestic concession was checked and recorded as inapplicable', () => {
    /* A 50% concession runs from 15 January 2026. It is for non-domestic
       accounts, and the record says so rather than staying silent. */
    assert.ok(t.excluded.some(x => /non-domestic concession/.test(x.item)));
  });

  test('the reference connection is size-independent, with a source (§2.5)', () => {
    assert.equal(t.reference_connection.basis, 'size_independent');
    assert.equal(t.reference_connection.source_id, 'wsd-water-sewage-tariff');
  });
});

describe('ACCEPTANCE — Hong Kong, provenance and the gate', () => {
  test('the source is archived under a real hash (Rule 7.2)', () => {
    assert.equal(isArchived(SOURCES['wsd-water-sewage-tariff']), true);
    assert.equal(SOURCES['wsd-water-sewage-tariff'].tier, 1);
  });

  test('the gate holds the city on the second reader alone', () => {
    const c = read('data/cities/hongkong.json');
    const g = acceptCity(c, SOURCES, T());
    assert.deepEqual(g.problems, [], 'the checklist is satisfied since v1.3');
    assert.equal(g.metric_problems.water_supply, undefined,
      'provenance is complete; only the review is outstanding');
  });

  /* This test used to assert that the record was waiting for Rule 9.3, and so
     pinned in place a sentence about a rule withdrawn in v1.3: the record and
     the test agreed with each other and both disagreed with the methodology.
     Hong Kong waits for nothing on the price. What it does still owe a reader is
     the date through which its 1995 tariff is shown to be in force. */
  test('and the record waits for nothing on the price', () => {
    const c = read('data/cities/hongkong.json');
    assert.equal(c.awaiting ?? null, null);
    assert.ok(!(c.open_items ?? []).some(x => /second reader/i.test(x)));
  });
});
