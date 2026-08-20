/**
 * Developer acceptance values.
 *
 * These are the hard QA targets. If the engine fails one of them against the
 * defined tariff version and customer profile, publication is blocked until it
 * is reconciled. They are separated from the unit tests deliberately: a unit
 * test protects an implementation, an acceptance test protects a published
 * number.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateBill } from '../src/engine.js';
import { tariffCurve } from '../src/curve.js';

const load = f => JSON.parse(readFileSync(new URL(`../data/tariffs/${f}.json`, import.meta.url), 'utf8'));
const at15 = t => tariffCurve(t).points.find(p => p.m3 === 15);

describe('ACCEPTANCE — Dubai, August 2026', () => {
  const t = load('dubai-dewa-2026-08');
  const bill = calculateBill(t);

  test('Standard Water Supply Bill = AED 143.85', () => {
    assert.equal(bill.water_supply.monthly, 143.85);
  });

  test('Standardized price = AED 9.590 per m³', () => {
    assert.equal(at15(t).supply_per_m3, 9.59);
  });

  test('Sewerage = AED 66.00 and Total Water Services = AED 209.85', () => {
    assert.equal(bill.components.find(c => c.id === 'municipal_sewerage').monthly, 66.00);
    assert.equal(bill.total_services.monthly, 209.85);
  });

  test("the utility's conversion factor is 220, not the physical 219.9692", () => {
    /* Every rate on DEWA's per-m³ table is the statutory per-gallon rate times
       exactly 220, and 220.00 is the meter multiplication factor on the
       invoice. Using the physical constant instead would give 143.83 and would
       import a number the utility does not bill with. */
    assert.equal(t.volume_conversion.ig_per_m3, 220);
    assert.equal(Math.round(3.5 / 100 * 220 * 1000) / 1000, 7.700);
    assert.equal(Math.round(4.0 / 100 * 220 * 1000) / 1000, 8.800);
    assert.equal(Math.round(4.6 / 100 * 220 * 1000) / 1000, 10.120);
    const physical = Math.round(((15 * 219.9692 * 0.035 + 15 * 219.9692 * 0.005 + 5) * 1.05) * 100) / 100;
    assert.equal(physical, 143.83);
    assert.notEqual(bill.water_supply.monthly, physical);
  });
});

describe('ACCEPTANCE — Dubai invoice reconciliation, 3,740 IG', () => {
  const bill = calculateBill(JSON.parse(
    readFileSync(new URL('./fixtures/dubai-invoice-reconciliation.json', import.meta.url), 'utf8')));

  test('reproduces the invoice total of AED 162.33 exactly', () => {
    assert.equal(bill.water_supply.monthly, 162.33);
  });

  test('every line matches: 130.90 · 18.70 · 5.00 · 7.73', () => {
    const m = id => bill.components.find(c => c.id === id).monthly;
    assert.equal(m('water_slab'), 130.90);
    assert.equal(m('fuel_surcharge'), 18.70);
    assert.equal(m('meter_service_charge'), 5.00);
    assert.equal(m('vat'), 7.73);
  });
});

describe('ACCEPTANCE — London, 2026-27', () => {
  const t = load('london-thames-2026-04-01');
  const bill = calculateBill(t);

  test('Standard Water Supply Bill = £46.59', () => {
    assert.equal(bill.water_supply.monthly, 46.59);
  });

  test('Standardized price = £3.106 per m³', () => {
    assert.equal(at15(t).supply_per_m3, 3.106);
  });

  test('Total Water Services = £79.35, no surface water drainage rebate', () => {
    assert.equal(bill.total_services.monthly, 79.35);
    assert.ok(t.scope_disclosures.some(s => /abated|rebate/i.test(s)));
  });
});

describe('ACCEPTANCE — New York, FY2027', () => {
  const t = load('newyork-waterboard-2026-07-01');

  /* Held from 17 August 2026 under Rule 7.6, on the hypothesis that the Rate
     Schedule set minimum charges by meter size. It sets one at USD 0.49 a day
     instead — wrong about the form, right that something existed. Resolved the
     same day as not_applicable: the floor does not bind at 15 m³. */
  const bill = calculateBill(t);

  test('the minimum charge exists, is a floor, and does not bind here', () => {
    assert.equal(bill.minimum_charge.applied, false);
    assert.equal(bill.minimum_charge.top_up, 0);
    const s = t.component_states.find(c => c.component === 'minimum_charge');
    assert.equal(s.status, 'not_applicable');
    assert.match(s.resolution, /not a meter-size charge/);
  });

  test('and it binds below about 7.9 m³ a month, which the curve shows', () => {
    const small = calculateBill({ ...t, measure_at_monthly_m3: 5 });
    assert.equal(small.minimum_charge.applied, true);
    assert.ok(small.minimum_charge.top_up > 60);
  });

  test('Standard Water Supply Bill = $28.34', () => {
    assert.equal(bill.water_supply.monthly, 28.34);
  });

  test('Total Water Services = $73.40', () => {
    assert.equal(bill.total_services.monthly, 73.40);
  });

  test('the canonical combined rate is 13.86, not the 13.50 on the DEP page', () => {
    const conflicts = JSON.parse(readFileSync(new URL('../data/conflicts.json', import.meta.url), 'utf8'));
    const c = conflicts.conflicts.find(x => x.id === 'nyc-combined-rate-2026');
    assert.equal(c.canonical.value, 13.86);
    assert.equal(c.secondary_official_page.value, 13.50);
    /* 5.35 × 2.59 = 13.8565, which the Board prints as 13.86 */
    assert.ok(Math.abs(5.35 * 2.59 - 13.86) < 0.01);
  });
});

describe('ACCEPTANCE — an invoice is never a tariff source', () => {
  test('every published tariff cites a schedule, legislation or regulator', () => {
    for (const f of ['dubai-dewa-2026-08', 'london-thames-2026-04-01', 'newyork-waterboard-2026-07-01']) {
      const t = load(f);
      assert.ok(t.source_id, `${f} has no source_id`);
      assert.ok(!/invoice/.test(t.source_id),
        'an invoice validates a calculation; it never supplies the rate');
    }
  });

  test('the Dubai invoice appears as validation, not as the tariff source', () => {
    const t = load('dubai-dewa-2026-08');
    assert.equal(t.source_id, 'dewa-slab-tariff');
    assert.equal(t.validated_against, 'dewa-invoice-2025-01');
  });
});

describe('ACCEPTANCE — the concessionary plan is held apart', () => {
  const t = load('dubai-dewa-2026-08-nationals');
  const bill = calculateBill(t);

  test('a UAE national household pays nothing for water at the reference volume', () => {
    /* Resolution 16/2011, Schedule 2, item 7: 0.0 fils per gallon to 10,000
       gallons. The reference volume of 15 m³ is 3,300 gallons. */
    assert.equal(bill.components.find(c => c.id === 'water_slab').monthly, 0);
  });

  test('and pays no fuel surcharge — Article 2(f) exempts the category', () => {
    assert.ok(!bill.components.some(c => c.id === 'fuel_surcharge'));
  });

  test('the plan is excluded from the benchmark and never averaged with it', () => {
    assert.equal(t.benchmark_eligible, false);
    assert.equal(calculateBill(load('dubai-dewa-2026-08')).water_supply.monthly, 143.85);
  });
});

describe('ACCEPTANCE — one city, one conversion', () => {
  const t = load('dubai-dewa-2026-08');
  const bill = calculateBill(t);

  test('water and sewerage are computed on the same factor', () => {
    /* The supplied source registry applied 220 to water and 219.9692 to
       sewerage, which would place two different households in one record.
       The January 2025 invoice bills sewerage on 3,300 IG — a whole number
       only under 220 — so 220 governs both. */
    const water = bill.components.find(c => c.id === 'water_slab').monthly;
    const sewer = bill.components.find(c => c.id === 'municipal_sewerage').monthly;
    assert.equal(water, 115.50);
    assert.equal(sewer, 66.00);
    assert.equal(Math.round((sewer / 0.020) * 1000) / 1000, 3300);
    assert.equal(Math.round((water / 0.035) * 1000) / 1000, 3300);
  });

  test('the invoice validates the 2025 sewerage rate, not the 2026 step', () => {
    assert.equal(Math.round(3300 * 0.015 * 100) / 100, 49.50);
    assert.equal(t.metric_grades.total_water_services.publishable, false);
    assert.match(t.metric_grades.total_water_services.blocked_by, /Decree No\. 47/);
  });

  test('water supply ships while total services waits', () => {
    assert.equal(t.metric_grades.water_supply.publishable, true);
    assert.equal(bill.water_supply.monthly, 143.85);
  });
});
