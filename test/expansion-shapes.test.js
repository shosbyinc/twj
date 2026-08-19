import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill, calculateBothPrices, EngineError } from '../src/engine.js';
import { METHODOLOGY } from '../src/methodology.js';

const ROOT = new URL('..', import.meta.url).pathname;
const spec = n => JSON.parse(readFileSync(
  join(ROOT, `test/fixtures/expansion/${n}.json`), 'utf8'));
const near = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;

/**
 * The city-expansion calculation standard.
 *
 * Each figure below was computed by hand in the handoff and is asserted here
 * against the engine. That is the point of the exercise: a standard nobody has
 * executed is a proposal, and four of these tariff architectures did not exist
 * in the engine before.
 *
 * None of these is a publishable observation. Every spec carries
 * `blocking: ['no archived primary source']`, because Rule 7.2 is not waived
 * by arithmetic being correct.
 */

describe('one year length, declared once', () => {
  test('365.2425, and Hong Kong\'s legal period is derived from it', () => {
    assert.equal(METHODOLOGY.days_in_year, 365.2425);
    /* 121.64 days is the statutory four-month period; a third of the mean year
       is 121.7475. The law rounds; we use the law's number, not our third. */
    assert.equal(spec('hongkong').billing_period_days, 121.64);
  });
});

describe('PERTH — annual accumulating blocks', () => {
  const b = calculateBill(spec('perth'));
  test('150 kL at 2.108 plus 30 kL at 2.809 plus the annual service charge', () => {
    assert.equal(b.components.find(c => c.id === 'water_usage').annual, 400.47);
    assert.equal(b.components.find(c => c.id === 'water_service').annual, 305.05);
    assert.equal(b.water_supply.annual, 705.52);
  });
  test('monthly A$58.79, effective A$3.92/m³', () => {
    assert.ok(near(b.water_supply.monthly, 58.79));
    assert.ok(near(b.effective_per_m3, 3.92));
  });
  test('the 150 kL threshold is crossed once a year, not once a period', () => {
    /* Six two-monthly periods accumulating is one annual resolution. Resolving
       monthly would put 180 m³ entirely in the first block and understate the
       bill by A$84.27. */
    const monthly = calculateBill({ ...spec('perth'), shape: 'monthly_blocks' });
    assert.equal(monthly.components.find(c => c.id === 'water_usage').annual, 379.44);
    assert.notEqual(monthly.water_supply.annual, b.water_supply.annual);
  });
});

describe('SYDNEY — a fixed charge billed in days', () => {
  const b = calculateBill(spec('sydney'));
  test('usage 15 × 3.41, service charge annualised from 92 days', () => {
    assert.equal(b.components.find(c => c.id === 'water_usage').monthly, 51.15);
    assert.ok(near(b.water_supply.monthly, 59.97));
  });
  test('annualising by quarters instead of days would be wrong', () => {
    const quarters = calculateBill({
      ...spec('sydney'),
      components: spec('sydney').components.map(c =>
        c.id === 'water_service' ? { ...c, period: 'quarterly', period_days: undefined } : c)
    });
    /* 4 × 26.65 = 106.60 a year against 365.2425/92 × 26.65 = 105.79. */
    assert.notEqual(quarters.water_supply.annual, b.water_supply.annual);
  });
  test('a day-based charge that declares no period length is refused', () => {
    assert.throws(() => calculateBill({
      ...spec('sydney'),
      components: spec('sydney').components.map(c =>
        c.id === 'water_service' ? { ...c, period_days: undefined } : c)
    }), /period_days/);
  });
  test('the drought rate is recorded as not engaged, not omitted', () => {
    assert.equal(spec('sydney').drought_stage, false);
    assert.match(spec('sydney').drought_note, /60%.*70%/s);
  });
});

describe('ABU DHABI — a daily allowance', () => {
  const b = calculateBill(spec('abudhabi'));
  test('the scenario is 0.492823 m³/day, inside the 0.7 green band', () => {
    assert.equal(Number((METHODOLOGY.annual_m3 / METHODOLOGY.days_in_year).toFixed(6)), 0.492823);
  });
  test('AED 117.60 before VAT, AED 123.48 after', () => {
    assert.equal(b.components.find(c => c.id === 'water_usage').monthly, 117.6);
    assert.ok(near(b.water_supply.monthly, 123.48));
  });
  test('applying the daily threshold to a monthly volume would misprice it', () => {
    /* 15 m³ against a 0.7 threshold puts almost everything in the red band. */
    const wrong = calculateBill({ ...spec('abudhabi'), shape: 'monthly_blocks' });
    assert.ok(wrong.water_supply.monthly > 150, 'the error is large, not subtle');
  });
  test('Grade A is barred twice over: an assumed component and an unresolved one', () => {
    const vat = spec('abudhabi').components.find(c => c.id === 'vat');
    assert.equal(vat.assumed, true);
    /* §7.6 fires first — the VAT reading is unresolved, not merely assumed. */
    assert.throws(() => calculateBill({ ...spec('abudhabi'), grade: 'A' }), /7\.6/);
    /* With the states set aside, §9.1 still refuses on the assumption alone. */
    assert.throws(() => calculateBill({
      ...spec('abudhabi'), grade: 'A', component_states: undefined }), /9\.1/);
  });
});

describe('HONG KONG — a 121.64-day billing period', () => {
  const b = calculateBill(spec('hongkong'));
  test('the period volume is 59.947021 m³', () => {
    const v = METHODOLOGY.annual_m3 * 121.64 / METHODOLOGY.days_in_year;
    assert.equal(Number(v.toFixed(6)), 59.947021);
  });
  test('HK$238.27 per period → HK$59.62 a month, HK$3.97/m³', () => {
    assert.ok(near(b.water_supply.annual, 715.44, 0.02));
    assert.ok(near(b.water_supply.monthly, 59.62));
    assert.ok(near(b.effective_per_m3, 3.97));
  });
  test('the free 12 m³ allowance is per period, not per year', () => {
    /* Twelve free cubic metres once a year instead of three times is a
       different tariff. The repeat factor is what keeps them apart. */
    const yearly = calculateBill({ ...spec('hongkong'), shape: 'annual_bands' });
    assert.notEqual(yearly.water_supply.annual, b.water_supply.annual);
  });
  test('the shape refuses to run without a declared period length', () => {
    assert.throws(() => calculateBill({ ...spec('hongkong'), billing_period_days: undefined }),
      /billing_period_days/);
  });
});

describe('TOKYO — temporary relief, and two prices that both have to be published', () => {
  const both = calculateBothPrices(spec('tokyo'));
  test('payable ¥825 a month while the waiver runs', () => {
    assert.equal(both.payable.water_supply.monthly, 825);
    assert.equal(both.payable.effective_per_m3, 55);
  });
  test('structural ¥2,112 — what the standing tariff charges', () => {
    assert.equal(both.structural.water_supply.monthly, 2112);
    assert.equal(both.structural.effective_per_m3, 140.8);
  });
  test('the two differ by a factor of 2.56, which is why both are stored', () => {
    assert.ok(both.structural.water_supply.monthly / both.payable.water_supply.monthly > 2.5);
  });
  test('a city under live relief cannot enter the UWTI base basket', () => {
    /* The headline is what a household pays. The comparable figure is the
       structural one: a four-month waiver measured against a city without one
       measures policy, not water. And a frozen denominator must not embed a
       temporary budget decision that will expire while the base does not. */
    assert.equal(both.relief, true);
    assert.equal(both.basket_eligible, false);
    assert.match(both.basket_reason, /structural/);
  });
  test('the waived line says so rather than vanishing', () => {
    const basic = both.payable.components.find(c => c.id === 'basic_charge');
    assert.equal(basic.monthly, 0);
    assert.match(basic.rate_display, /waived 2026-05-01 to 2026-09-30/);
    /* Four months, running May-August or June-September by meter-read cycle.
       The earlier draft had a single month of July. */
    const p = spec('tokyo').temporary_policy_adjustments[0];
    assert.match(p.period_note, /even or an odd month/);
    assert.deepEqual(p.eligible_sizes, ['13mm', '20mm', '25mm']);
  });
  test('the truncation rule is the Bureau\'s, and rounding breaks its example', () => {
    /* (1,170 x 2 + 3,020 + 2,857) x 1.10 = 9,038.7, published as 9,038. */
    assert.equal(Math.floor((2340 + 3020 + 2857) * 1.10), 9038);
    assert.notEqual(Math.round((2340 + 3020 + 2857) * 1.10), 9038);
    assert.equal(spec('tokyo').billing_formula.rounding, 'truncate to the yen');
  });

  test('three of the Bureau\'s published totals are reproduced exactly', () => {
    const vol = m3 => [[5, 0], [5, 22], [10, 128], [4, 163]]
      .reduce((t, [q, r], i) => t + Math.max(0, Math.min(m3 - [0, 5, 10, 20][i], q)) * r, 0);
    assert.equal(Math.floor((1170 + vol(24)) * 1.10), 3533);
    assert.equal(Number((3533 / 24).toFixed(1)), 147.2, 'the Bureau says about 147.2 yen/m³');
    assert.equal(1170 * 1.10 * 4, 5148, 'the waiver value for a 20 mm connection');
  });

  test('the tier table is still unread, which is why Tokyo is unpriced', () => {
    const open = spec('tokyo').component_states.filter(c => c.status === 'unresolved');
    assert.equal(open.length, 3);
    assert.ok(open.some(c => c.component === 'volumetric_tier_table'));
    assert.ok(open.some(c => c.component === 'waiver_instrument'));
    /* Corroborating three totals constrains the tiers; it is not reading them. */
    const t = open.find(c => c.component === 'volumetric_tier_table');
    assert.match(t.question, /not the same as reading them/);
  });

  test('a policy targeting an unknown component is refused', () => {
    assert.throws(() => calculateBothPrices({
      ...spec('tokyo'),
      temporary_policy_adjustments: [{ ...spec('tokyo').temporary_policy_adjustments[0],
        component_id: 'nope' }]
    }), /unknown component/);
  });
});

describe('SEOUL — a mandatory volumetric levy', () => {
  const b = calculateBill(spec('seoul'));
  test('₩8,700 use + ₩1,080 basic + ₩2,550 levy = ₩12,330', () => {
    assert.equal(b.components.find(c => c.id === 'water_use_levy').monthly, 2550);
    assert.equal(b.water_supply.monthly, 12330);
    assert.equal(b.effective_per_m3, 822);
  });
  test('the unevidenced VAT treatment is a blocker, not a silent zero', () => {
    /* Rule 9.1: no unknown component may be silently assumed to be zero. The
       handoff computed Seoul with no tax line and said nothing about it. */
    assert.ok(spec('seoul').blocking.some(b => /VAT/.test(b)));
  });
});

describe('RIYADH — the cheapest bill in the set, and the least settled', () => {
  const b = calculateBill(spec('riyadh'));
  test('SAR 1.50 use + SAR 5.00 meter = SAR 6.50 before tax', () => {
    assert.equal(b.water_supply.monthly, 6.5);
    assert.ok(near(b.effective_per_m3, 0.43));
  });
  test('the 15% VAT is not applied automatically', () => {
    assert.equal(spec('riyadh').components.some(c => c.kind === 'tax_percent'), false);
    assert.ok(spec('riyadh').blocking.some(b => /VAT/.test(b)));
  });
  test('the first-band reading is flagged as resting on a press release', () => {
    assert.ok(spec('riyadh').blocking.some(b => /press release/.test(b)));
  });
});

describe('TORONTO — the engine refuses to invent a supply figure', () => {
  test('a combined rate cannot yield a supply-only bill (Rule 3.3)', () => {
    assert.throws(() => calculateBill({ ...spec('toronto'), grade: 'B' }), EngineError);
    try { calculateBill({ ...spec('toronto'), grade: 'B' }); }
    catch (e) { assert.match(e.message, /combines supply and wastewater/); }
  });
  test('total water services can still be computed, explicitly', () => {
    const b = calculateBill({ ...spec('toronto'), grade: 'B', allow_combined: true });
    assert.equal(b.components.find(c => c.id === 'combined_usage').monthly, 72.94);
  });
  test('and grade C alone already bars a comparative bill', () => {
    assert.throws(() => calculateBill(spec('toronto')), /5\.1/);
  });
});

describe('nothing here is publishable, and the specs say so', () => {
  for (const n of ['perth', 'sydney', 'tokyo', 'seoul', 'abudhabi', 'hongkong', 'riyadh', 'toronto']) {
    test(`${n} declares its missing provenance`, () => {
      const t = spec(n);
      assert.equal(t.status, 'draft');
      assert.ok(t.blocking.some(b => /archived primary source/.test(b)),
        'correct arithmetic does not waive Rule 7.2');
      assert.notEqual(t.grade, 'A', 'no city reaches Grade A without a hashed source');
    });
  }
});
