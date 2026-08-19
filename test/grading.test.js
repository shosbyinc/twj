import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gradeMetric, basketReadiness } from '../src/grading.js';

describe('uncertainty and scope are different defects', () => {
  test('a scope disclosure does not lower the grade', () => {
    const g = gradeMetric({ bill_low: '46.59', bill_high: '46.59',
      scope: ['reference account defined as metered; metering is not universal in the region'] });
    assert.equal(g.grade, 'A');
    assert.equal(g.u, 0);
    assert.match(g.scope_note, /Grade unaffected/);
    assert.equal(g.basket_eligible, true);
  });

  test('real uncertainty does lower it — Singapore rounding', () => {
    const g = gradeMetric({ bill_low: '35.07075', bill_high: '35.1525' });
    assert.equal(g.grade, 'B');
    assert.ok(g.u > 0.2 && g.u < 0.25);
    assert.equal(g.basket_eligible, false);
  });

  test('uncertainty above 1% is C — Dubai meter type at 1.45%', () => {
    const g = gradeMetric({ bill_low: '143.83', bill_high: '145.93' });
    assert.equal(g.grade, 'C');
    assert.ok(g.u > 1, `u = ${g.u}`);
  });

  test('an unresolved component is C regardless of range', () => {
    const g = gradeMetric({ bill_low: '100', bill_high: '100', blocking: ['meter profile'] });
    assert.equal(g.grade, 'C');
    assert.deepEqual(g.blocking, ['meter profile']);
  });
});

describe('basket readiness is projected, not hoped for', () => {
  const obs = [
    { city: 'newyork',   country: 'US', grade: 'A' },
    { city: 'london',    country: 'GB', grade: 'A' },
    { city: 'singapore', country: 'SG', grade: 'B' },
    { city: 'dubai',     country: 'AE', grade: 'B' }
  ];

  test('four cities cannot freeze a base', () => {
    const r = basketReadiness(obs);
    assert.equal(r.can_freeze, false);
    assert.equal(r.admissible, 2);
    assert.equal(r.still_needed, 18);
  });

  test('the yield is measured and the workload projected from it', () => {
    const r = basketReadiness(obs);
    assert.equal(r.observed_yield, 50);
    assert.equal(r.projected_audits_required, 40);
  });

  test('a yield of zero refuses to project rather than guessing', () => {
    const r = basketReadiness(obs.map(o => ({ ...o, grade: 'B' })));
    assert.equal(r.projected_audits_required, null);
    assert.match(r.projection_note, /cannot be projected/);
  });
});
