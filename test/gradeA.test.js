import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gradeAGate, tag, transparency, POINTS } from '../src/gradeA.js';

const full = {
  primary_source: true, current_tariff: true, customer_class: true, residency_class: true,
  volumetric_known: true, fixed_known: true, levies_known: true, reproducible: true
};

describe('the eight-point gate', () => {
  test('all eight satisfied allows grade A', () => {
    const g = gradeAGate(full);
    assert.equal(g.passes, true);
    assert.equal(g.ceiling, 'A');
  });

  test('one missing point names itself and caps at B', () => {
    const g = gradeAGate({ ...full, fixed_known: false });
    assert.equal(g.ceiling, 'B');
    assert.deepEqual(g.missing, ['all recurring fixed fees known']);
  });

  test('residency class is a required point, not an optional note', () => {
    assert.ok(POINTS.some(([k]) => k === 'residency_class'));
    const g = gradeAGate({ ...full, residency_class: false });
    assert.equal(g.passes, false);
  });

  test('reconciliation is recorded whether or not it happened', () => {
    assert.match(gradeAGate(full).reconciliation_note, /Not reconciled/);
    assert.match(gradeAGate({ ...full, reconciled_against: 'DEWA invoice, Jan 2025' })
      .reconciliation_note, /Reconciled against/);
  });

  test('an unreconciled record can still reach A — absence is noted, not punished', () => {
    assert.equal(gradeAGate(full).ceiling, 'A');
  });
});

describe('epistemic categories', () => {
  test('an observed rate and a derived bill are not the same kind of number', () => {
    const rate = tag('observed', '1.43');
    const bill = tag('derived', '35.07');
    assert.notEqual(rate.epistemic, bill.epistemic);
    assert.match(rate.epistemic_note, /read directly/);
    assert.match(bill.epistemic_note, /computed by TWJ/);
  });

  test('a stated formula is its own category', () => {
    assert.equal(tag('rule', '50% of tariff').epistemic, 'rule');
  });

  test('water stress is third-party modelled, not observed', () => {
    assert.equal(tag('third_party', 'Extremely high').epistemic, 'third_party');
  });

  test('an unknown category throws rather than passing through', () => {
    assert.throws(() => tag('vibes', 1), /unknown epistemic category/);
  });
});

describe('tariff transparency', () => {
  test('a subsidised tariff carries a caution about what the figure means', () => {
    const t = transparency({ subsidised_tariff: 'yes', nationality_dependent: 'yes' });
    assert.match(t.caution, /not what the water costs to produce/);
  });

  test('unstated fields are unknown, never assumed no', () => {
    const t = transparency({});
    assert.equal(t.fixed_charge, 'unknown');
    assert.equal(t.caution, null);
  });
});
