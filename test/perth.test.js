import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill } from '../src/engine.js';
import { tariffCurve } from '../src/curve.js';
import { acceptCity } from '../src/acceptance.js';
import { isArchived } from '../src/publication.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/perth-watercorp-2026-07-01.json');
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Perth.
 *
 * Source capture sprint 01, city 2. The first city whose grade differs between
 * its two metrics for a structural reason: the water charge is a function of
 * volume and the sewerage charge is a function of what the property would rent
 * for. Grading per metric was built for exactly this and had not yet met it.
 */
describe('ACCEPTANCE — Perth, the standardized bill', () => {
  const b = calculateBill(T());

  test('150 kL at 2.108 + 30 kL at 2.809 = A$400.47 of use', () => {
    assert.equal(b.components.find(c => c.id === 'water_usage').annual, 400.47);
  });

  test('plus the A$305.05 service charge = A$705.52 a year', () => {
    assert.equal(b.water_supply.annual, 705.52);
    assert.equal(b.water_supply.monthly, 58.79);
  });

  test('the standardized price is A$3.919/m³', () => {
    assert.equal(tariffCurve(T()).points.find(p => p.m3 === 15).supply_per_m3, 3.919);
  });

  test('the bill-year threshold is crossed once a year, not once per bill', () => {
    /* Six two-monthly periods accumulating is one annual resolution. Resolving
       monthly keeps every month inside Tier 1 and loses A$84.27. */
    const monthly = calculateBill({ ...T(), shape: 'monthly_blocks' });
    assert.equal(monthly.components.find(c => c.id === 'water_usage').annual, 379.44);
    assert.equal(Number((400.47 - 379.44).toFixed(2)), 21.03);
    assert.equal(30 * 2.809 - 30 * 2.108 > 0, true);
  });

  test('the curve declines: a fixed charge spread over more water', () => {
    const c = tariffCurve(T());
    assert.equal(c.shape.label, 'declining');
    assert.ok(c.points[0].supply_per_m3 > c.points[4].supply_per_m3);
  });
});

describe('ACCEPTANCE — Perth, one grade per metric', () => {
  const b = calculateBill(T());

  test('Total Water Services is withheld, not equal to Water Supply', () => {
    /* Before this city, a tariff with no wastewater component reported services
       equal to supply — the most misleading figure the engine could produce. */
    assert.equal(b.total_services.monthly, null);
    assert.match(b.total_services.withheld_because, /Gross Rental Value/);
  });

  test('the reason is structural, not a missing document', () => {
    assert.equal(T().wastewater_grade, 'C');
    assert.match(T().wastewater_grade_reason, /set by law/);
    /* Distinct from wastewater_status: 'not_established', which means nobody
       has found the charge yet. Perth's charge is published and unusable. */
    assert.equal(T().wastewater_status, undefined);
  });

  test('the sewerage and drainage charges are named where they are excluded', () => {
    const items = T().excluded.map(e => e.item);
    assert.ok(items.some(i => /Sewerage/.test(i)));
    assert.ok(items.some(i => /Drainage/.test(i)));
    for (const e of T().excluded) assert.ok(e.source_id, `${e.item} has no source`);
  });
});

describe('ACCEPTANCE — Perth, nothing assumed to be zero', () => {
  test('GST-free rests on statute, not on a rule about Australian water', () => {
    const s = T().component_states.find(c => c.component === 'gst');
    assert.equal(s.status, 'confirmed_absent');
    assert.equal(s.source_id, 'antsa-gst-act-38-285');
    assert.match(s.basis, /38-285/);
    /* The handoff asserted the GST-free status as a general rule. A rule is not
       a source, and §7.6 does not accept one. */
    assert.match(s.basis, /rule of thumb/);
  });

  test('the statute outranks the ruling and the utility page', () => {
    assert.equal(SOURCES['antsa-gst-act-38-285'].class, 'statute');
    assert.equal(SOURCES['antsa-gst-act-38-285'].tier, 1);
  });

  test('every component state is resolved and sourced (Rule 7.6)', () => {
    for (const c of T().component_states) {
      assert.notEqual(c.status, 'unresolved', `${c.component} is still open`);
      assert.ok(c.source_id, `${c.component} has no source`);
    }
  });

  test('the residential service charge is size-independent, and the business one is not', () => {
    const rc = T().reference_connection;
    assert.equal(rc.basis, 'size_independent');
    assert.match(rc.designation, /business equivalent by meter size/);
  });
});

describe('ACCEPTANCE — Perth, provenance and the gate', () => {
  test('both sources are archived under real hashes (Rule 7.2)', () => {
    for (const id of ['watercorp-charges-2026-27', 'antsa-gst-act-38-285']) {
      assert.equal(isArchived(SOURCES[id]), true, `${id} is not archived`);
      assert.ok(SOURCES[id].tier <= 2);
    }
  });

  test('the publisher\'s own service-charge arithmetic checks out', () => {
    /* A$917.70 sewerage + A$142.86 drainage + A$305.05 water = A$1,365.61.
       Only the water component enters the TWJ figure; the sum is checked
       because it is Water Corporation's own and it confirms the 305.05. */
    assert.equal(Number((917.70 + 142.86 + 305.05).toFixed(2)), 1365.61);
    assert.equal(T().public_reconciliation.cases[0].published, 1365.61);
  });

  test('the volumetric side is honest about having no worked example', () => {
    assert.match(T().public_reconciliation.limits, /no worked example/);
  });

  test('the gate holds the city on the second reader alone', () => {
    const g = acceptCity(read('data/cities/perth.json'), SOURCES, T());
    assert.deepEqual(g.problems, [], 'the checklist is satisfied since v1.3');
  });

  test('the bill year straddling a price change is disclosed, not hidden', () => {
    assert.ok(T().scope_disclosures.some(s => /straddles the 1 July price change/.test(s)));
  });
});
