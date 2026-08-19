import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tariffCurve } from '../src/curve.js';

const ROOT = new URL('..', import.meta.url).pathname;
const curve = id => tariffCurve({
  ...JSON.parse(readFileSync(join(ROOT, `data/tariffs/${id}.json`), 'utf8')),
  component_states: undefined });
const at = (id, m3) => curve(id).points.find(p => p.m3 === m3).supply_per_m3;

/**
 * Why the curve is a product and not a footnote.
 *
 * A single consumption point cannot rank cities, and this is demonstrable on the
 * cities already collected rather than argued from principle. 15 m³ stays the
 * canonical comparison point; it stops being the only thing published about a
 * city.
 */
describe('cities change places along the curve', () => {
  test('Hong Kong is the cheapest at 5 m³ and among the dearest at 25', () => {
    /* Twelve free cubic metres per statutory period, then rates that climb.
       A single-volume ranking says almost nothing about this tariff. */
    assert.ok(at('hongkong-wsd-1995-02-16', 5) < 2);
    assert.ok(at('hongkong-wsd-1995-02-16', 25) > 5);
    assert.ok(at('hongkong-wsd-1995-02-16', 25) / at('hongkong-wsd-1995-02-16', 5) > 3);
  });

  test('Perth and Sydney swap, in one currency and one country', () => {
    /* The cleanest demonstration available: no exchange rate is involved, so the
       crossing cannot be a currency artefact. Perth's A$305 annual service
       charge is punishing at low volumes and dilutes at high ones. */
    const p5 = at('perth-watercorp-2026-07-01', 5), s5 = at('sydney-water-2026-07-01', 5);
    const p25 = at('perth-watercorp-2026-07-01', 25), s25 = at('sydney-water-2026-07-01', 25);
    assert.ok(p5 > s5, `Perth ${p5} should be dearer than Sydney ${s5} at 5 m³`);
    assert.ok(p25 < s25, `Perth ${p25} should be cheaper than Sydney ${s25} at 25 m³`);
  });

  test('the shape label distinguishes the two mechanisms', () => {
    /* Hong Kong rises because its blocks rise. Perth declines because a fixed
       charge spreads. Both are called "3.9 per m³" at 15 m³. */
    assert.equal(curve('hongkong-wsd-1995-02-16').shape.label, 'rising');
    assert.equal(curve('perth-watercorp-2026-07-01').shape.label, 'declining');
    assert.ok(Math.abs(at('hongkong-wsd-1995-02-16', 15) - at('perth-watercorp-2026-07-01', 15)) < 0.1,
      'and they very nearly meet at the canonical point');
  });

  test('Singapore is flat, which is also information', () => {
    assert.equal(at('singapore-pub-2025-04-01', 5), at('singapore-pub-2025-04-01', 25));
  });

  test('New York looked flat and is not, because of a minimum charge', () => {
    /* This test asserted a flat New York and was wrong within the hour. The
       Water Board sets a minimum of USD 0.49 a day, which does not bind at 15 m³
       and does bind at 5. The rate never changes and the price does — the whole
       argument for publishing a curve rather than a point, found by accident
       while closing a different question. */
    assert.ok(at('newyork-waterboard-2026-07-01', 5) > 2.9);
    assert.equal(at('newyork-waterboard-2026-07-01', 15), 1.889);
    assert.equal(at('newyork-waterboard-2026-07-01', 25), 1.889);
  });
});
