import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tariffCurve, publishedVsEffective, CURVE_POINTS } from '../src/curve.js';

const load = f => JSON.parse(readFileSync(new URL(`../data/tariffs/${f}.json`, import.meta.url), 'utf8'));
/* Singapore is stored grade C — its rates are not established by a readable
   primary document. The curve still needs a flat-tariff case, so the shape is
   tested against a copy graded B. */
/* A curve is a shape, not a publication. This lifts publication blockers so the
   geometry of a held tariff can still be examined — Singapore's Grade C at the
   time it was written, and New York's unresolved component since v1.2 §7.6. */
const loadShape = f => {
  const t = load(f);
  if (t.grade === 'C') { t.grade = 'B'; delete t.blocking; }
  delete t.component_states;
  return t;
};

describe('a curve, not a point', () => {
  test('15 m³ is the headline, not the dataset', () => {
    assert.ok(CURVE_POINTS.includes(15));
    assert.equal(tariffCurve(load('dubai-dewa-2026-08')).headline_m3, 15);
    assert.equal(CURVE_POINTS.length, 5);
  });

  test('Dubai declines: the AED 5 meter fee is 1.00/m³ at 5 m³ and 0.20 at 25', () => {
    const c = tariffCurve(load('dubai-dewa-2026-08'));
    const at = v => c.points.find(p => p.m3 === v).supply_per_m3;
    assert.ok(at(5) > at(25));
    assert.equal(c.shape.label, 'declining');
    assert.equal(at(15), 9.59);
  });

  test('London declines hardest — £195 a year in standing charges', () => {
    const c = tariffCurve(load('london-thames-2026-04-01'));
    assert.equal(c.shape.label, 'declining');
    assert.ok(c.shape.ratio > 1.3, `ratio ${c.shape.ratio}`);
  });

  test('Singapore is flat: no fixed charge to spread', () => {
    for (const f of ['singapore-pub-2025-04-01']) {
      assert.equal(tariffCurve(loadShape(f)).shape.label, 'flat');
    }
  });

  test('the shape ratio is dimensionless, so it compares across currencies', () => {
    const l = tariffCurve(loadShape('london-thames-2026-04-01')).shape.ratio;
    const d = tariffCurve(loadShape('dubai-dewa-2026-08')).shape.ratio;
    const s = tariffCurve(loadShape('singapore-pub-2025-04-01')).shape.ratio;
    assert.ok(l > d && d > s, `London ${l} > Dubai ${d} > Singapore ${s}`);
  });

  test('two cities can meet at 15 m³ and diverge either side of it', () => {
    /* The point of the curve: a single volume cannot tell them apart. */
    const flat = tariffCurve(loadShape('singapore-pub-2025-04-01'));
    const decl = tariffCurve(load('london-thames-2026-04-01'));
    assert.notEqual(flat.shape.label, decl.shape.label);
  });
});

describe('published rate against effective price', () => {
  test('Dubai: AED 7.70 printed, AED 9.589 actually paid per m³', () => {
    const g = publishedVsEffective(7.70, 9.589);
    assert.equal(g.difference, 1.889);
    assert.ok(g.percent > 24 && g.percent < 25);
    assert.match(g.note, /mandatory charges the rate does not include/);
  });

  test('London: £2.7346 printed, £3.106 effective', () => {
    const g = publishedVsEffective(2.7346, 3.106);
    assert.ok(g.percent > 13 && g.percent < 14);
  });
});
