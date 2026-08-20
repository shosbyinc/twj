import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill } from '../src/engine.js';

const ROOT = new URL('..', import.meta.url).pathname;
const load = () => JSON.parse(readFileSync(
  join(ROOT, 'data/tariffs/singapore-pub-2025-04-01.json'), 'utf8'));

/**
 * Reconciliation against a published document, not a private one.
 *
 * SP Services is PUB's billing agent, and SP publishes a sample redesigned
 * bill inside "Understanding Your Utilities Bill". Two of its water lines are
 * legible: rate 1.4300 against 33.89, and rate 1.0900 against 25.83. Both
 * resolve to a single consumption of 23.7 m³.
 *
 * That is the same independent check Dubai has through its verified invoice —
 * obtained here without any private document. It is what demoted the private
 * Singapore invoice from a blocker to a second opinion.
 */
describe('SINGAPORE — public reconciliation against SP\'s sample bill, 23.7 m³', () => {
  const bill = calculateBill({ ...load(), reconciliation_volume_m3: 23.7 });
  const line = id => bill.components.find(c => c.id === id);
  const amount = id => line(id).monthly ?? line(id).annual;

  test('water tariff: rate 1.4300 × 23.7 → S$ 33.89, as printed', () => {
    assert.equal(amount('water_tariff'), 33.89);
  });

  test('waterborne tax: rate 1.0900 × 23.7 → S$ 25.83, as printed', () => {
    assert.equal(amount('waterborne_tax'), 25.83);
  });

  test('a reconciliation run is marked unpublishable', () => {
    assert.match(bill.scenario, /reconciliation run, not publishable/);
  });

  test('the two printed lines imply one consumption, which is why this is a check', () => {
    /* If the two lines implied different volumes, the rates or the amounts
       would be wrong and the reconciliation would prove nothing. */
    assert.equal((33.89 / 1.43).toFixed(2), '23.70');
    assert.equal((25.83 / 1.09).toFixed(2), '23.70');
  });

  test('the Conservation Tax line is the one the capture does not settle', () => {
    const t = load();
    const wct = t.components.find(c => c.id === 'water_conservation_tax');
    assert.equal(wct.assumed, true);
    /* Both candidates are recorded, and they disagree at this volume. */
    assert.equal(amount('water_conservation_tax'), 16.95, 'formula rate 0.715');
    const alt = calculateBill({
      ...t, reconciliation_volume_m3: 23.7,
      components: t.components.map(c => c.id !== 'water_conservation_tax' ? c
        : { ...c, blocks: [{ ...c.blocks[0], rate: c.alternative_if_utility_rounds_first }, c.blocks[1]] })
    });
    const altWct = alt.components.find(c => c.id === 'water_conservation_tax');
    assert.equal(altWct.monthly ?? altWct.annual, 17.06, 'printed rate 0.72');
  });
});

describe('every rate in the Singapore tariff now cites a document', () => {
  test('no component carries a rate on trust', () => {
    const t = load();
    const unsourced = t.components
      .filter(c => c.kind !== 'rebate')
      .filter(c => !c.source_id && !t.source_id);
    assert.deepEqual(unsourced.map(c => c.id), [],
      'a rate with no source behind it is a rate taken on trust');
  });

  test('the GST rate is sourced to the authority that sets it', () => {
    const t = load();
    for (const c of t.components.filter(x => x.kind === 'tax_percent')) {
      assert.equal(c.source_id, 'iras-gst-rate');
      assert.equal(c.rate, 0.09);
    }
  });

  test('the billing formula is recorded, and where it came from', () => {
    const t = load();
    assert.equal(t.billing_formula.source_id, 'sp-utilities-bill-guide');
    assert.match(t.billing_formula.tax_order, /per individual item/);
  });
});
