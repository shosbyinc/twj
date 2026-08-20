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
const T = () => read('data/tariffs/seoul-arisu-2026.json');
const open_ = () => ({ ...T(), component_states: undefined });
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

/**
 * ACCEPTANCE — Seoul.
 *
 * Source capture sprint 01, city 5. The cleanest tariff structure captured so
 * far — three flat volumetric rates and one fixed charge, every one under a
 * named ordinance — and still Grade B, on the two questions a rate table
 * cannot answer.
 */
describe('ACCEPTANCE — Seoul, the standardized bill', () => {
  const b = calculateBill(open_());

  test('₩8,700 usage + ₩1,080 basic + ₩2,550 levy = ₩12,330', () => {
    assert.equal(b.components.find(c => c.id === 'water_usage').monthly, 8700);
    assert.equal(b.components.find(c => c.id === 'meter_basic').monthly, 1080);
    assert.equal(b.components.find(c => c.id === 'water_use_levy').monthly, 2550);
    assert.equal(b.water_supply.monthly, 12330);
  });

  test('Total Water Services = ₩19,530, standardized price ₩822/m³', () => {
    assert.equal(b.total_services.monthly, 19530);
    assert.equal(tariffCurve(open_()).points.find(p => p.m3 === 15).supply_per_m3, 822);
  });

  test('the levy is a water-specific charge, mandatory and volumetric', () => {
    /* §3.2 admits it under S. It is universal across categories, which is what
       distinguishes a levy from a discretionary charge. */
    const c = T().components.find(x => x.id === 'water_use_levy');
    assert.equal(c.kind, 'surcharge_volumetric');
    assert.match(c.rate_display, /universal across categories/);
  });
});

describe('ACCEPTANCE — Seoul, the trap that a rate table sets', () => {
  test('the water-supply tax was closed by statute, not by a silent table', () => {
    /* The enumeration argument that closed Hong Kong's fixed charge never
       transferred here: a rate table states rates, and Tokyo's shows no tax line
       while its formula multiplies by 1.10. The answer came from tax law, which
       is where it was always going to be. */
    const s = T().component_states.find(c => c.component === 'vat_water_supply');
    assert.equal(s.status, 'confirmed_absent');
    assert.equal(s.source_id, 'kr-vat-act-26-water');
    assert.match(s.basis, /art\. 26\(1\)2/);
    assert.match(s.basis, /Tokyo is why/);
  });

  test('and the sewerage side is a different question, still open', () => {
    /* Art. 26(1)2 names tap water. A sewerage use charge is levied by a local
       authority under a different act, which is not the same question. */
    const s = T().component_states.find(c => c.component === 'vat_sewerage');
    assert.equal(s.status, 'unresolved');
    assert.equal(s.affects_metric, 'total_water_services');
  });

  test('a blocker on one metric does not withhold the other', () => {
    /* §5 grades per metric, §7.2a asks provenance per metric; a component state
       is the third thing that has to follow. */
    const supply = T().metric_eligibility.water_supply;
    assert.equal(supply.publishable, true);
    assert.equal(T().metric_eligibility.total_water_services.publishable, false);
  });

  test('the reference connection is scope, resolved in v1.5', () => {
    /* §5.1 separates uncertainty from scope. For a given bore the bill is one
       number and U = 0; which bore the reference household has is a disclosure
       like London's metered account. Blocking on it conflated the two. */
    const rc = T().reference_connection;
    assert.equal(rc.basis, 'smallest_documented');
    assert.equal(rc.source_id, 'seoul-arisu-tariff-table');
    assert.match(rc.designation, /printed as scope rather than claimed as a designation/);
  });

  test('Grade A is refused on the reference connection, not on the sewerage', () => {
    /* The sewerage question withholds the metric it names and no longer bars
       the record. What keeps Seoul at Grade B is §2.5: the smallest priced bore
       rather than a designated one. */
    assert.equal(T().grade, 'B');
    assert.equal(T().reference_connection.basis, 'smallest_documented');
  });
});

describe('ACCEPTANCE — Seoul, what the capture found beyond the rates', () => {
  test('a published five-year sewerage schedule, recorded and not used', () => {
    const f = T().forward_schedule;
    assert.deepEqual(Object.keys(f.years), ['2026', '2027', '2028', '2029', '2030']);
    assert.equal(f.years['2030'], 770);
    assert.match(f.note, /a future rate is not an observation/);
  });

  test('the page contradicts itself and the table governs', () => {
    /* The prose says all four categories are three-band progressive; the table
       shows domestic as a single rate and dates itself to July 2021. */
    assert.match(T().page_inconsistency_note, /table governs/);
    assert.equal(T().components.find(c => c.id === 'water_usage').blocks.length, 1);
  });

  test('the statutory basis is named, because the page names it', () => {
    assert.match(T().statutory_basis, /Seoul Water Supply Ordinance/);
    assert.match(T().statutory_basis, /Seoul Sewerage Use Ordinance/);
  });

  test('the reduction scheme is excluded under Rule 3.1', () => {
    assert.ok(T().excluded.some(e => /Rule 3\.1/.test(e.reason)));
  });
});

describe('ACCEPTANCE — Seoul, provenance and the gate', () => {
  test('the source is archived under a real hash', () => {
    assert.equal(isArchived(SOURCES['seoul-arisu-tariff-table']), true);
    assert.equal(SOURCES['seoul-arisu-tariff-table'].tier, 1);
  });

  test('the gate holds the city, and names all three reasons', () => {
    const g = acceptCity(read('data/cities/seoul.json'), SOURCES, T());
    /* Nothing holds the supply figure now. The sewerage tax question is
       recorded against the metric it affects. */
    assert.deepEqual(g.problems, []);
    assert.ok(g.metric_problems.total_water_services.some(p => /vat_sewerage/.test(p)));
  });
});
