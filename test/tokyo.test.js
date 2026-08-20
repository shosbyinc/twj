import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill, calculateBothPrices, withRelief } from '../src/engine.js';
import { payload } from '../scripts/site.js';
import { isArchived } from '../src/publication.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/tokyo-waterworks-2026.json');
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Tokyo, the city with two prices.
 *
 * Tokyo was drafted, computed and reconciled long before it could be published,
 * and what held it was not a rate. It was the instrument behind a waiver. Under
 * §5.4 the payable price is the headline and the structural price is the
 * comparable one, and the entire split turns on documents that say who waived
 * what, for how long, and out of whose money. A guidance page held as a
 * search-engine extract of a search-engine extract could not carry that.
 *
 * The documents arrived on 18 August 2026. These tests protect three things:
 * that the split rests on the instrument rather than on inference, that both
 * prices are computed and neither is quietly dropped, and that the arithmetic
 * still reproduces every figure the Bureau prints — including, now, two bills
 * it prints under the relief itself.
 */

/* The Bureau bills bi-monthly and truncates the two-month total to the yen. The
   engine reports an untruncated monthly figure, so a printed bill is met by
   doubling and then truncating — in that order, which is the whole point of the
   32 m³ case below. */
const bimonthly = monthly => Math.floor(monthly * 2);
const at = (tariff, v) => calculateBill({ ...tariff, measure_at_monthly_m3: v });
const water = (tariff, v) => at(tariff, v).water_supply.monthly;
const sewer = (tariff, v) => {
  const b = at(tariff, v);
  return b.total_services.monthly - b.water_supply.monthly;
};

describe('ACCEPTANCE — Tokyo, the waiver instrument', () => {
  test('the component is closed, and closed on the announcement itself', () => {
    const s = T().component_states.find(c => c.component === 'waiver_instrument');
    assert.equal(s.status, 'observed');
    assert.equal(s.source_id, 'tokyo-mushou-press');
    assert.equal(s.corroborated_by, 'tokyo-mushou-guidance');
    assert.equal(isArchived(SOURCES['tokyo-mushou-press']), true);
    assert.equal(isArchived(SOURCES['tokyo-mushou-guidance']), true);
  });

  test('nothing was amended, which is why the structural price is the tariff', () => {
    /* This is the load-bearing fact of §5.4 here. The waiver is funded from the
       metropolitan general account and touches no charging article, so the
       standing tariff is not a suspended instrument being reconstructed — it is
       in force, and the household is simply not being billed part of it. */
    const w = T().temporary_policy_adjustments[0];
    assert.equal(w.amends_charging_articles, false);
    assert.equal(w.application_required, false);
    assert.equal(w.source_id, 'tokyo-mushou-press');
    assert.match(w.funded_by, /general account/);
  });

  test('the issuer\'s own characterisation is kept, and so is the repetition', () => {
    const w = T().temporary_policy_adjustments[0];
    assert.match(w.issuer_characterisation, /limited to this summer/);
    assert.match(w.repetition_note, /two years running/);
  });

  test('the value at each bore is the standing basic charge, unchanged', () => {
    const v = T().temporary_policy_adjustments[0].value_by_bore;
    assert.equal(v['20mm'].monthly * 4, v['20mm'].excl_tax);
    assert.equal(Math.floor(v['20mm'].excl_tax * 1.10), v['20mm'].incl_tax);
    assert.equal(v['13mm'].incl_tax, 3784);
    assert.equal(v['25mm'].incl_tax, 6424);
    /* And the waived rate is the rate the tariff still carries. */
    assert.equal(T().components.find(c => c.id === 'basic_charge').amount, v['20mm'].monthly);
  });

  test('what the waiver does not touch is settled by a bill, not by a FAQ', () => {
    const scope = T().waiver_scope;
    assert.ok(scope.not_waived.includes('the sewerage basic charge'));
    assert.match(scope.evidence, /collapsed/);
    assert.match(scope.evidence, /printed bill is the better one/);
  });
});

describe('ACCEPTANCE — Tokyo, both prices', () => {
  const both = calculateBothPrices(T());

  test('relief is live and the engine returns two bills', () => {
    assert.equal(both.relief, true);
    assert.equal(both.structural.water_supply.monthly, 2112);
    assert.equal(both.payable.water_supply.monthly, 825);
  });

  test('¥140.80 and ¥55, a factor of 2.56', () => {
    assert.equal(Number((2112 / 15).toFixed(2)), 140.80);
    assert.equal(825 / 15, 55);
    assert.equal(Number((2112 / 825).toFixed(2)), 2.56);
  });

  test('live relief bars the base basket whatever the grade', () => {
    assert.equal(both.basket_eligible, false);
    assert.equal(T().metric_eligibility.water_supply.basket_eligible, false);
    assert.equal(T().metric_eligibility.water_supply.publishable, true);
  });

  test('the waiver reaches the basic charge and stops there', () => {
    const waived = withRelief(T(), { apply: true });
    assert.equal(waived.components.find(c => c.id === 'basic_charge').amount, 0);
    assert.equal(waived.components.find(c => c.id === 'sewerage_basic').amount, 560);
    /* The 5 m³ basic volume belongs to the basic charge and survives it. */
    assert.equal(waived.components.find(c => c.id === 'water_usage').blocks[0].rate, 0);
    assert.equal(sewer(waived, 15), sewer(T(), 15));
  });
});

describe('ACCEPTANCE — Tokyo, seven volumes against the publisher\'s own figures', () => {
  const t = T();
  const waived = withRelief(t, { apply: true });
  const published = label => t.public_reconciliation.cases.find(k => k.label.includes(label)).published;

  test('ready-reckoner, water, 20 mm at 30 m³ over two months', () => {
    assert.equal(bimonthly(water(t, 15)), 4224);
    assert.equal(published('30 m3 over two months'), 4224);
  });

  test('the Bureau\'s worked example, water, 30 + 29 m³', () => {
    /* Not a doubling: the two months differ, which is what makes this example
       worth having. 4,609 + 4,429.7 = 9,038.7, and the yen is truncated once. */
    assert.equal(Math.floor(water(t, 30) + water(t, 29)), 9038);
    assert.equal(published('worked example, water'), 9038);
  });

  test('the same example, sewerage', () => {
    assert.equal(Math.floor(sewer(t, 30) + sewer(t, 29)), 7062);
    assert.equal(published('worked example, sewerage'), 7062);
  });

  test('ready-reckoner, sewerage, 41 m³ — it fixes the 20 m³ boundary', () => {
    assert.equal(Math.floor(sewer(t, 21) + sewer(t, 20)), 4290);
    assert.equal(published('41 m3 over two months'), 4290);
  });

  test('specimen meter slip under the waiver, water, 40 m³', () => {
    /* The payable price reconciled against a bill. No other city in the Index
       can offer this for a relief measure, because relief is announced far more
       often than it is illustrated. */
    assert.equal(bimonthly(water(waived, 20)), 3058);
    assert.equal(published('Specimen meter slip'), 3058);
  });

  test('the same slip, sewerage — alive while the water basic charge is zero', () => {
    assert.equal(bimonthly(sewer(waived, 20)), 4136);
    assert.equal(published('The same slip, sewerage'), 4136);
    assert.equal(bimonthly(water(waived, 20)) + bimonthly(sewer(waived, 20)), 7194);
  });

  test('specimen app screen, 32 m³ — and the truncation is bi-monthly', () => {
    assert.equal(bimonthly(water(waived, 16)), 1931);
    assert.equal(published('Specimen app screen'), 1931);
    /* Truncating each month first would give 1,930. The bill says 1,931, so the
       yen is dropped once from the two-month total. Every other case in this
       suite is indifferent to the order; this one is not, which is why it is
       the case worth having. */
    assert.equal(Math.floor(water(waived, 16)) * 2, 1930);
  });

  test('every case in the record is stored as reconciling, and does', () => {
    for (const k of t.public_reconciliation.cases) assert.equal(k.engine, k.published, k.label);
    assert.equal(t.public_reconciliation.cases.length, 7);
  });
});

describe('ACCEPTANCE — Tokyo, what the rate tables added', () => {
  test('the sewerage rate is read from the Bureau\'s table, not from a ready-reckoner', () => {
    const s = T().component_states.find(c => c.component === 'volumetric_sewerage');
    assert.equal(s.source_id, 'tokyo-keisan-23ku');
    assert.equal(T().components.find(c => c.id === 'sewerage').source_id, 'tokyo-keisan-23ku');
  });

  test('the bands above 50 m³ exist now, on both streams', () => {
    const w = T().components.find(c => c.id === 'water_usage').blocks;
    const s = T().components.find(c => c.id === 'sewerage').blocks;
    assert.equal(w.length, 9);
    assert.equal(s.length, 9);
    assert.equal(w.at(-1).rate, 404);
    assert.equal(s.at(-1).rate, 345);
    assert.equal(w.at(-1).to, null, 'the top band is open');
  });

  test('one metered volume drives both streams, because the Bureau says so', () => {
    assert.match(T().sewage_volume_note, /deemed equal to the volume of water used/);
  });

  test('the tariff is older than its effective_from, and the record says which part', () => {
    assert.match(T().effective_from_note, /2005/);
    assert.match(T().effective_from_note, /1998/);
    assert.match(T().effective_from_note, /tax multiplier/);
  });
});

/**
 * The payload and the pages, because the split is only worth having if it
 * reaches a reader.
 *
 * calculateBothPrices() existed in the engine from the day Tokyo was drafted
 * and was never called: scripts/site.js imported calculateBill and nothing
 * else. Nothing failed, because no city under relief had cleared the gate, and
 * the first build after one did would have printed the standing tariff and
 * called it the price — §5.4 implemented in the engine, absent from the site,
 * and invisible until the exact moment it mattered.
 *
 * These tests are that hole. They check the payload carries both figures and
 * that every place a price is written knows about the second one.
 */
describe('ACCEPTANCE — Tokyo, the split reaches the page', () => {
  const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');
  const RENDER = readFileSync(join(ROOT, 'scripts/render.js'), 'utf8');

  test('the payload carries both prices and names which is which', () => {
    const c = payload.cities.find(x => x.id === 'tokyo');
    assert.ok(c.relief, 'the relief block is missing and the page has one price');
    assert.equal(c.relief.headline, 'payable');
    assert.equal(c.relief.comparable, 'structural');
    assert.equal(c.relief.payable_m3, 55);
    assert.equal(c.relief.structural_m3, 140.8);
    assert.equal(c.price_m3, c.relief.structural_m3, 'the map compares standing tariffs');
    assert.equal(c.relief.basket_eligible, false);
    assert.equal(c.uwti_eligible, false);
  });

  test('the waiver reaches the payload with its terms, not just its number', () => {
    const p = payload.cities.find(x => x.id === 'tokyo').relief.policies[0];
    assert.equal(p.from, '2026-05-01');
    assert.equal(p.to, '2026-09-30');
    assert.equal(p.application_required, false);
    assert.equal(p.source_id, 'tokyo-mushou-press');
    assert.match(p.funded_by, /general account/);
  });

  test('no city carries relief without the payload saying so', () => {
    for (const c of payload.cities) {
      if (c.not_priced) continue;
      const t = read(`data/tariffs/${read(`data/cities/${c.id === 'hong-kong' ? 'hongkong'
        : c.id === 'abu-dhabi' ? 'abudhabi' : c.id}.json`).tariff_id}.json`);
      const live = (t.temporary_policy_adjustments ?? [])
        .some(p => p.affects_payable_price === true);
      assert.equal(Boolean(c.relief), live, `${c.id}: relief in the record and not in the payload`);
    }
  });

  test('every surface that prints a price knows about the second one', () => {
    /* Narrow on purpose. It names the four places a figure is written and
       asserts each consults c.relief — the city headline, the index row, the
       comparison table and the description a search result shows. A fifth
       surface would slip past this, and a regression in these four will not. */
    /* Every surface lives in the template now: prerendering runs the template's
       own renderers, so a price written server-side is the same code that writes
       it client-side and cannot disagree with it. That is the point of the
       change — but it also means this check belongs on the template alone. */
    const refs = (TPL.match(/c\.relief/g) ?? []).length;
    assert.ok(refs >= 4, `the template writes a price in more places than it checks for relief`);
    assert.match(TPL, /Two prices, and both are the tariff/);
    assert.match(TPL, /Paid today, under relief/);
    void RENDER;
  });
});
