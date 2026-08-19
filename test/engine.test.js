import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateBill, resolveBlocks, EngineError, SCENARIO } from '../src/engine.js';

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

describe('block resolution', () => {
  test('Qi(V) = max(0, min(V,Ui) − Li)', () => {
    const blocks = [{ from: 0, to: 10, rate: 8 }, { from: 10, to: 27, rate: 10 }, { from: 27, to: null, rate: 12 }];
    assert.equal(resolveBlocks(15, blocks).charge, 10 * 8 + 5 * 10);
    assert.equal(resolveBlocks(5, blocks).charge, 5 * 8);
    assert.equal(resolveBlocks(30, blocks).charge, 10 * 8 + 17 * 10 + 3 * 12);
  });

  test('a missing rate raises rather than being read as zero (Rule 9.1)', () => {
    assert.throws(() => resolveBlocks(15, [{ from: 0, to: null, rate: null }]), EngineError);
  });
});

/* ─────────── FIXTURE A · Singapore shape ───────────
   The Singapore tariff is grade C: PUB publishes its rate table as an image,
   so the rates themselves are not established by anything we hold. The shape
   it tests — several statutory charges on one volume, with a tax over a base
   that already contains a tax — still needs a fixture, so it runs against a
   copy graded B with the rates marked unestablished. */
const sgShape = () => {
  const t = load('../data/tariffs/singapore-pub-2025-04-01.json');
  t.grade = 'B'; delete t.blocking;
  return t;
};
describe('Fixture A — Singapore tariff shape', () => {
  const bill = calculateBill(sgShape());

  test('Water Supply = (1.43 + 0.715) × 15 × 1.09 = S$ 35.07', () => {
    assert.equal(bill.water_supply.monthly, 35.07);
  });

  test('Total Water Services = (1.43 + 0.715 + 1.09) × 15 × 1.09 = S$ 52.89', () => {
    assert.equal(bill.total_services.monthly, 52.89);
  });

  test('effective price per m³ = S$ 3.53', () => {
    assert.equal(bill.effective_per_m3, 3.53);
  });

  test('annual basis is consistent with the monthly display', () => {
    assert.equal(bill.total_services.annual, 634.71);
    assert.equal(Math.round(bill.total_services.annual / 12 * 100) / 100, bill.total_services.monthly);
  });

  test('U-Save is excluded by the universality test (Rule 3.1)', () => {
    const rebate = bill.excluded.find(e => e.id === 'u_save');
    assert.ok(rebate, 'rebate must appear in the excluded list, not vanish');
    assert.match(rebate.reason, /universality test/);
  });

  test('the Waterborne Tax keeps its statutory name and sits in wastewater (Rule 3.4)', () => {
    const wbt = bill.components.find(c => c.id === 'waterborne_tax');
    assert.equal(wbt.name, 'Waterborne Tax');
    assert.equal(wbt.stream, 'wastewater');
  });

  test('both headline figures are returned together (Rule 3.2)', () => {
    assert.ok(bill.water_supply.monthly !== null && bill.total_services.monthly !== null);
  });

  test('the calculation is hashed and reproducible (Rule 9.2)', () => {
    const again = calculateBill(sgShape());
    assert.equal(bill.calculation_hash, again.calculation_hash);
    assert.match(bill.calculation_hash, /^sha256:[0-9a-f]{32}$/);
  });
});

/* ─────────── FIXTURE B · separable streams + annual fixed charges ─────────── */
describe('Fixture B — separable water and wastewater with fixed charges', () => {
  const bill = calculateBill(load('./fixtures/shape-b-separable-fixed.json'));

  test('Water Supply = (2.00 × 15) + (60 ÷ 12) = 35.00', () => {
    assert.equal(bill.water_supply.monthly, 35.00);
  });

  test('Total Water Services = 35.00 + (1.00 × 15) + (120 ÷ 12) = 60.00', () => {
    assert.equal(bill.total_services.monthly, 60.00);
  });

  test('annual fixed charges are prorated, not counted twelve times', () => {
    const fixed = bill.components.find(c => c.id === 'water_fixed');
    assert.equal(fixed.annual, 60.00);
    assert.equal(fixed.monthly, 5.00);
  });

  test('the disclosed assumption is carried on the result', () => {
    assert.equal(bill.assumptions.length, 1);
    assert.match(bill.assumptions[0].note, /metered/);
  });
});

/* ─────────── FIXTURE C · slabs + surcharge + VAT + second authority ─────────── */
describe('Fixture C — progressive slabs, surcharge, VAT, second authority', () => {
  const bill = calculateBill(load('./fixtures/shape-c-slabs-surcharge-vat.json'));

  test('slabs resolve at 15 m³: (10 × 8) + (5 × 10) = 130.00', () => {
    const slab = bill.components.find(c => c.id === 'slab');
    assert.equal(slab.monthly, 130.00);
  });

  test('Water Supply = (130 + 16.50) × 1.05 = 153.83', () => {
    assert.equal(bill.water_supply.monthly, 153.83);
  });

  test('VAT applies only over its declared base, not the whole bill', () => {
    const vat = bill.components.find(c => c.id === 'vat_water');
    assert.deepEqual(vat.base, ['slab', 'fuel']);
    assert.equal(vat.monthly, 7.33);
  });

  test('the second authority sits in wastewater and is included in the total only', () => {
    assert.equal(bill.total_services.monthly, 185.33);
    assert.ok(bill.total_services.monthly > bill.water_supply.monthly);
  });
});

/* ─────────── methodology guardrails ─────────── */
describe('guardrails', () => {
  test('Grade A is refused when a component is assumed (Rule 9.1)', () => {
    const t = load('./fixtures/shape-b-separable-fixed.json');
    t.grade = 'A';
    assert.throws(() => calculateBill(t), /9\.1/);
  });

  test('a Grade C system may not publish a comparative bill (Rule 5.1)', () => {
    const t = load('./fixtures/shape-b-separable-fixed.json');
    t.grade = 'C';
    assert.throws(() => calculateBill(t), /5\.1/);
  });

  test('Water Supply is null, never estimated, when streams are inseparable (Rule 3.3)', () => {
    const t = load('./fixtures/shape-b-separable-fixed.json');
    t.streams_separable = false;
    const bill = calculateBill(t);
    assert.equal(bill.water_supply.monthly, null);
    assert.equal(bill.total_services.monthly, 60.00);
  });

  test('a tax without a declared base is refused', () => {
    const t = load('./fixtures/shape-c-slabs-surcharge-vat.json');
    t.components.find(c => c.id === 'vat_water').base = [];
    assert.throws(() => calculateBill(t), EngineError);
  });

  test('a tariff written for another scenario is refused', () => {
    const t = load('./fixtures/shape-b-separable-fixed.json');
    t.scenario = 'TWJ-R180-v2.0';
    assert.throws(() => calculateBill(t), /scenario/);
  });

  test('scenario constants are frozen', () => {
    assert.equal(SCENARIO.annual_m3, 180);
    assert.equal(SCENARIO.monthly_m3, 15);
    assert.equal(SCENARIO.id, 'TWJ-R180-v1.0');
  });
});

/* ─────────── FIXTURE D · London (real tariff) ───────────
   Separable streams, each with a volumetric rate and an annual fixed
   charge prorated across twelve months. No VAT on domestic charges. */
describe('Fixture D — London (real tariff)', () => {
  const bill = calculateBill(load('../data/tariffs/london-thames-2026-04-01.json'));

  test('Water Supply = (2.7346 × 15) + (66.87 ÷ 12) = £46.59', () => {
    assert.equal(bill.water_supply.monthly, 46.59);
  });

  test('Total Water Services = above + (1.4721 × 15) + (128.13 ÷ 12) = £79.35', () => {
    assert.equal(bill.total_services.monthly, 79.35);
  });

  test('effective price per m³ = £5.29', () => {
    assert.equal(bill.effective_per_m3, 5.29);
  });

  test('Grade A: the scope disclosures are not error bars', () => {
    /* Metering scope and the unabated wastewater charge define who the figure
       describes. Neither makes the figure uncertain, so neither lowers it. */
    assert.equal(bill.grade, 'A');
    assert.equal(bill.assumptions.length, 0);
  });
});

/* ─────────── FIXTURE E · New York (real tariff) ───────────
   A rate published per hundred cubic feet, and a wastewater charge
   defined as a percentage of the water charge. */
describe('Fixture E — New York (real tariff)', () => {
  /* New York is held under Rule 7.6 since v1.2; the blocker is set aside here so
     the arithmetic stays under test. See test/acceptance.test.js. */
  const bill = calculateBill({ ...load('../data/tariffs/newyork-waterboard-2026-07-01.json'),
    component_states: undefined });

  test('180 m³ ÷ 2.8316846592 × $5.35 ÷ 12 = $28.34 water', () => {
    assert.equal(bill.water_supply.monthly, 28.34);
  });

  test('wastewater at 159% of the water charge = $45.06', () => {
    const ww = bill.components.find(c => c.id === 'wastewater_charge');
    assert.equal(ww.monthly, 45.06);
  });

  test('Total Water Services = $73.40', () => {
    assert.equal(bill.total_services.monthly, 73.40);
  });

  test('the published unit is preserved; conversion is declared', () => {
    const w = bill.components.find(c => c.id === 'water_metered');
    assert.match(w.rate_display, /100 cu ft/);
  });
});

/* ─────────── Source precedence and unresolved components ─────────── */
describe('source precedence — Singapore', () => {
  const bill = calculateBill(sgShape());

  test('the statutory 50% formula is used, not the rounded table: S$ 35.07', () => {
    assert.equal(bill.water_supply.monthly, 35.07);
  });

  test('total water services follow from the same precedence: S$ 52.89', () => {
    assert.equal(bill.total_services.monthly, 52.89);
  });

  /* Until 17 August 2026 the stored tariff was grade C and the engine refused
     to bill it, because the rates rested on a page whose table is an image.
     PUB's Annex A established them, so the assertion is now the opposite one:
     the rates are established, and what remains open is the rounding stage. */
  test('the rates are established, so the tariff bills', () => {
    const stored = load('../data/tariffs/singapore-pub-2025-04-01.json');
    assert.equal(stored.grade, 'B');
    assert.deepEqual(stored.blocking, []);
    assert.equal(calculateBill(stored).water_supply.monthly, 35.07);
  });

  test('the rounding stage is carried as an assumption, not buried', () => {
    const stored = load('../data/tariffs/singapore-pub-2025-04-01.json');
    const wct = stored.components.find(c => c.id === 'water_conservation_tax');
    assert.equal(wct.assumed, true, 'an unsettled rate must declare itself');
    assert.equal(wct.blocks[0].rate, 0.715, 'the formula, not the printed 0.72');
    assert.equal(wct.alternative_if_utility_rounds_first, 0.72,
      'the losing value stays visible');
    assert.equal(calculateBill(stored).assumptions.length, 1);
  });

  test('an assumed component forbids grade A (Rule 5.2)', () => {
    const stored = load('../data/tariffs/singapore-pub-2025-04-01.json');
    assert.throws(() => calculateBill({ ...stored, grade: 'A' }), /9\.1/,
      'declaring A while the rounding stage is open must be refused');
  });
});

describe('unresolved components block publication', () => {
  /* Dubai was blocked by exactly this mechanism until a verified invoice
     resolved the meter service charge. The guardrail is tested on a synthetic
     tariff so it keeps working after the real case is closed. */
  const withUnresolved = () => {
    const t = load('./fixtures/shape-b-separable-fixed.json');
    t.grade = 'B';
    t.components.push({
      id: 'mystery_charge', name: 'Some mandatory charge', stream: 'water',
      kind: 'fixed', period: 'monthly', amount: null,
      unresolved: true, unresolved_note: 'no official mapping to a standard connection'
    });
    return t;
  };

  test('an unresolved fixed charge names itself rather than defaulting to zero', () => {
    let e;
    try { calculateBill(withUnresolved()); } catch (err) { e = err; }
    assert.ok(e, 'an unresolved component must throw');
    assert.equal(e.unresolved, 'mystery_charge');
    assert.match(e.message, /not a zero component/);
  });

  test('a grade C tariff is refused before any component is evaluated', () => {
    const t = withUnresolved();
    t.grade = 'C';
    t.grade_reason = 'meter profile unresolved';
    let e;
    try { calculateBill(t); } catch (err) { e = err; }
    assert.match(e.message, /Grade C/);
    assert.match(e.message, /meter profile unresolved/);
  });
});

/* ─────────── RECONCILIATION · Dubai, against a verified invoice ───────────
   The engine is run at the invoice's own volume. If it cannot reproduce a
   real bill to the fils, nothing else it produces can be trusted. */
describe('Reconciliation — DEWA invoice, January 2025', () => {
  const IG_PER_M3 = 219.9692;
  const INVOICE_IG = 3740;

  // The scenario is defined in m³; reconciliation runs the same components
  // at the invoice volume by expressing it in the scenario's annual basis.
  const bill = calculateBill(load('./fixtures/dubai-invoice-reconciliation.json'));

  test('water charge reproduces AED 130.90', () => {
    assert.equal(bill.components.find(c => c.id === 'water_slab').monthly, 130.90);
  });

  test('fuel surcharge reproduces AED 18.70 at 0.005 per imperial gallon', () => {
    assert.equal(bill.components.find(c => c.id === 'fuel_surcharge').monthly, 18.70);
  });

  test('meter service charge is AED 5.00, once per monthly bill', () => {
    assert.equal(bill.components.find(c => c.id === 'meter_service_charge').monthly, 5.00);
  });

  test('VAT of AED 7.73 confirms the meter charge sits inside the VAT base', () => {
    assert.equal(bill.components.find(c => c.id === 'vat').monthly, 7.73);
  });

  test('water total reproduces AED 162.33 exactly', () => {
    assert.equal(bill.water_supply.monthly, 162.33);
  });

  test('the invoice carries no sewerage line, so services stay withheld', () => {
    assert.equal(bill.total_services.monthly, null);
  });
});

/* ─────────── Dubai under the TWJ scenario, post-reconciliation ─────────── */
describe('Dubai — August 2026, full evidence chain', () => {
  const bill = calculateBill(load('../data/tariffs/dubai-dewa-2026-08.json'));

  test('Water Supply at 15 m³ is AED 143.85', () => {
    assert.equal(bill.water_supply.monthly, 143.85);
  });

  test('the statutory per-gallon rate and the published per-m³ rate agree at 220', () => {
    /* 3.5 fils/IG × 220 = 7.700, exactly what DEWA prints. The two routes are
       the same rate expressed twice, so the choice of unit costs nothing. */
    const water = bill.components.find(c => c.id === 'water_slab');
    assert.equal(water.monthly, 115.50);
    assert.equal(Math.round(15 * 7.70 * 100) / 100, 115.50);
  });

  test('sewerage at 2.0 fils per gallon gives AED 66.00, outside the VAT base', () => {
    const s = bill.components.find(c => c.id === 'municipal_sewerage');
    assert.equal(s.monthly, 66.00);
    const vat = bill.components.find(c => c.id === 'vat');
    assert.ok(!vat.base.includes('municipal_sewerage'));
  });

  test('Total Water Services is AED 209.85 and no longer withheld', () => {
    assert.equal(bill.total_services.monthly, 209.85);
  });

  test('grade A: the meter type is scope, not an assumption', () => {
    assert.equal(bill.grade, 'A');
    assert.equal(bill.assumptions.length, 0);
    assert.ok(bill.scope_disclosures.length >= 2);
    assert.ok(bill.scope_disclosures.some(s => /Type 1/.test(s)));
  });
});

/* ─────────── Billing lag ───────────
   On the verified invoice the water line covers 3,740 IG while the sewerage
   line covers 3,300 IG — the previous month's volume. Summing the lines on one
   calendar invoice would compare one month of water with another of sewerage. */
describe('billing lag', () => {
  const bill = calculateBill(load('../data/tariffs/dubai-dewa-2026-08.json'));

  test('both services are computed for the same standardized volume', () => {
    const water = bill.components.find(c => c.id === 'water_slab');
    const sewer = bill.components.find(c => c.id === 'municipal_sewerage');
    // 3,299.538 IG at each rate — the ratio must be exactly the rate ratio
    const ratio = sewer.monthly / water.monthly;
    assert.ok(Math.abs(ratio - (0.020 / 0.035)) < 0.001,
      'sewerage and water must reflect the same volume, not two invoice lines');
  });

  test('the housing fee on the same invoice belongs to neither metric', () => {
    assert.ok(!bill.components.some(c => /housing/i.test(c.name)));
  });
});
