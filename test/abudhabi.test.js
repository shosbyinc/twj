import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill } from '../src/engine.js';
import { isArchived } from '../src/publication.js';
import { METHODOLOGY } from '../src/methodology.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/abudhabi-addc-2025.json');
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Abu Dhabi, the ambiguity that was resolved by arithmetic.
 *
 * This file used to protect a finding: that Abu Dhabi held its tariff page in
 * hand and still could not be published, because one sentence on it read two
 * ways and the two readings differed by five per cent of the bill.
 *
 * On 18 August 2026 that sentence stopped mattering. ADDC's own 2017 tariff
 * booklet and TAQA Distribution's Utility Tariff 2025 publish the same two
 * expatriate water rates, and UAE VAT was introduced between them. A rate that
 * had absorbed the tax would have had to fall by 4.762%. It did not move.
 *
 * The tests below protect the resolution, and the arithmetic that produced it,
 * in the same way the earlier ones protected the ambiguity. What has not
 * changed is that the city is still not published — one component is open, and
 * it is a different one.
 */
describe('ACCEPTANCE — Abu Dhabi, the ambiguity resolved by an unchanged rate', () => {
  test('the rate is identical on both sides of the introduction of VAT', () => {
    const booklet = SOURCES['addc-tariff-booklet-2017'];
    const guide = SOURCES['taqa-utility-tariff-2025'];
    assert.equal(isArchived(booklet), true, '2017 booklet is archived under a real hash');
    assert.equal(isArchived(guide), true, '2025 guide is archived under a real hash');
    assert.ok(booklet.establishes.some(e => /7\.84/.test(e) && /10\.41/.test(e)));
    assert.ok(guide.establishes.some(e => /7\.84/.test(e) && /Identical to the 2017 booklet/.test(e)));
  });

  test('absorbing the tax would have required a cut that did not happen', () => {
    /* If 7.84 were VAT-inclusive from 2018, the pre-tax rate would be
       7.84 / 1.05 = 7.4667, a fall of 4.762% against the 2017 published rate. */
    const cutRequired = (1 - 1 / 1.05) * 100;
    assert.equal(Number(cutRequired.toFixed(3)), 4.762);
    assert.equal(Number((7.84 / 1.05).toFixed(4)), 7.4667);
  });

  test('the record states the resolution and keeps the superseded reading visible', () => {
    const m = T().materiality;
    assert.equal(m.was.u_percent, 4.878, 'the ambiguity that was, still on the record');
    assert.equal(m.was.grade_ceiling, 'C');
    assert.equal(m.now.u_percent, 0);
    assert.equal(m.now.figure, '123.48');
    assert.match(m.note, /never contained it/);
  });

  test('the engine now prices it, at the net rate plus five per cent', () => {
    const b = calculateBill({ ...T(), component_states: undefined });
    assert.equal(b.water_supply.monthly, 123.48);
    assert.equal(Number((123.48 / 15).toFixed(3)), 8.232);
  });

  test('VAT is a component of the tariff, not a reading of a footnote', () => {
    const vat = T().components.find(c => c.id === 'vat');
    assert.equal(vat.kind, 'tax_percent');
    assert.equal(vat.rate, 0.05);
    assert.deepEqual(vat.base, ['water_usage']);
  });

  test('the water rate carries no assumption flag any more', () => {
    const w = T().components.find(c => c.id === 'water_usage');
    assert.equal(w.assumed, undefined, 'the rate is observed, not assumed');
    assert.equal(w.alternative_if_vat_added, undefined, 'there is no alternative left to record');
  });
});

describe('ACCEPTANCE — Abu Dhabi, the daily allowance', () => {
  test('180 m³ a year is 0.492823 m³ a day, inside the 0.7 Green band', () => {
    assert.equal(Number((METHODOLOGY.annual_m3 / METHODOLOGY.days_in_year).toFixed(6)), 0.492823);
    assert.equal(T().components[0].blocks[0].to, 0.7);
  });

  test('applying the daily threshold to a monthly volume misprices it badly', () => {
    const wrong = calculateBill({
      ...T(), component_states: undefined, shape: 'monthly_blocks' });
    assert.ok(wrong.water_supply.monthly / 123.48 > 1.2);
  });
});

/**
 * What closed the recurring charge, and the seam left in the argument.
 *
 * This suite used to protect an absence that could not be claimed. Two tariff
 * schedules priced no fixed charge for a metered residential account and priced
 * AED 150 a month for an unmetered one, which shows the format carries a fixed
 * charge where one exists — and a schedule lists tariffs, while a bill can carry
 * items that are not tariffs. Rule 7.6 wanted an enumeration of a bill.
 *
 * On 18 August 2026 the enumeration arrived. The tests now protect the closure
 * and, as importantly, the one place it is thinner than it looks: the specimen
 * bill is a UAE National account, and §5.3 excludes that class.
 */
describe('ACCEPTANCE — Abu Dhabi, the absence closed by an enumeration', () => {
  test('the recurring charge is absent, and booked to the bill guide', () => {
    const s = T().component_states.find(c => c.component === 'recurring_meter_or_service_charge');
    assert.equal(s.status, 'confirmed_absent');
    assert.equal(s.source_id, 'taqa-understand-your-bill');
    assert.equal(isArchived(SOURCES['taqa-understand-your-bill']), true);
    /* Not the booklet. Booking absence there was the error this component was
       opened to avoid, and the corroboration is named as corroboration. */
    assert.deepEqual(s.corroborated_by, ['taqa-utility-tariff-2025', 'addc-tariff-booklet-2017']);
  });

  test('the argument is arithmetic, not silence', () => {
    /* The water service line equals the consumption section total including
       VAT. A residual would be a recurring charge; there is no residual. */
    const cases = T().public_reconciliation.cases;
    const before = cases.find(k => /total before VAT/.test(k.label));
    const line = cases.find(k => /water service line/.test(k.label));
    assert.equal(Number((21 * 2.090).toFixed(2)), 43.89);
    assert.equal(Number((79 * 2.600).toFixed(2)), 205.40);
    assert.equal(before.published, 249.29);
    assert.equal(Math.floor(249.29 * 1.05 * 100) / 100, 261.75);
    assert.equal(line.published, 261.75);
  });

  test('the specimen confirms the band rule this record applies', () => {
    /* 0.7 m³/day × 30 days = 21.00 m³ green, the rest red. The band_basis_note
       recorded this as the regulator's stated construction; the publisher's own
       bill now prints it. */
    const s = T().component_states.find(c => c.component === 'band_application');
    assert.equal(s.status, 'observed');
    assert.equal(0.7 * 30, 21);
    assert.equal(100 - 21, 79);
  });

  test('the seam is declared: the specimen is a concessionary account', () => {
    const s = T().component_states.find(c => c.component === 'recurring_meter_or_service_charge');
    assert.match(s.residual_caveat, /UAE National account/);
    assert.match(T().public_reconciliation.limits, /does not reconcile the benchmark figure/);
  });

  test('one question remains, and it holds one metric', () => {
    const open = T().component_states.filter(c => c.status === 'unresolved').map(c => c.component);
    assert.deepEqual(open, ['wastewater']);
    const s = T().component_states.find(c => c.component === 'wastewater');
    assert.equal(s.affects_metric, 'total_water_services');
    assert.equal(T().metric_eligibility.total_water_services.publishable, false);
    assert.equal(T().metric_eligibility.water_supply.publishable, true);
  });

  test('nothing closed by silence', () => {
    const closed = T().component_states.filter(c => c.status === 'observed');
    assert.ok(closed.every(c => c.source_id));
    const absent = T().component_states.filter(c => /^confirmed_absent/.test(c.status));
    assert.ok(absent.every(c => c.source_id && c.basis));
  });

  test('the tariff year is closed on the publisher\'s own current schedule', () => {
    const s = T().component_states.find(c => c.component === 'tariff_year');
    assert.equal(s.status, 'observed');
    assert.equal(s.source_id, 'taqa-utility-tariff-2025');
    assert.equal(T().continuity.in_force_source_id, 'taqa-utility-tariff-2025');
    assert.equal(SOURCES['taqa-utility-tariff-2025'].accessed_at, '2026-08-18');
  });

  test('the city publishes, at Grade A', () => {
    const c = read('data/cities/abudhabi.json');
    assert.equal(c.publication_status, 'published');
    assert.equal(T().grade, 'A');
    /* The country cap is a decision for the freeze, not a property here. */
    assert.match(c.uwti_note, /one territory per country/);
  });
});

describe('ACCEPTANCE — Abu Dhabi, the residency split', () => {
  test('the UAE National tariff is excluded, never averaged (§5.3)', () => {
    const e = T().excluded.find(x => /UAE National/.test(x.item));
    assert.match(e.reason, /never averaged/);
  });

  test('the villa is a different reference customer, not a different rate', () => {
    const e = T().excluded.find(x => /Villa/.test(x.item));
    assert.match(e.reason, /same rates apply but the Green allowance/);
  });

  test('every source behind the figure is archived under a real hash', () => {
    for (const id of T().sources) assert.equal(isArchived(SOURCES[id]), true, id);
  });
});
