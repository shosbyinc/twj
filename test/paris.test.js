import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculateBill } from '../src/engine.js';
import { acceptCity } from '../src/acceptance.js';
import { isArchived } from '../src/publication.js';
import { payload } from '../scripts/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const T = () => read('data/tariffs/paris-eaudeparis-2026-01-01.json');
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

const r4 = n => Number(n.toFixed(4));
const side = stream => T().components
  .filter(c => c.stream === stream && c.kind === 'volumetric')
  .reduce((a, c) => a + c.blocks[0].rate, 0);

/**
 * ACCEPTANCE — Paris, the city whose price was public and misread.
 *
 * Paris publishes 4,23 EUR per cubic metre and says so on its own front page.
 * The figure is correct, widely quoted, and not a water supply price: it is the
 * water, the sewer, six levies and two rates of VAT, and it excludes the
 * subscription. Fifteen times it is a Total Water Services figure. Publishing it
 * as a supply price would have been the Toronto error with extra steps — except
 * that Toronto's instrument genuinely cannot be divided and this one can.
 *
 * What closed it was one document. The Catalogue des tarifs 2026 prices every
 * line separately, HT and TTC, with the VAT rate against each, and the ten
 * volumetric lines sum to 4,2300 exactly. The split is not ours: French law
 * charges drinking water at 5.5% and collective sanitation at 10%, so each line
 * declares which side it belongs to before anyone reads its name.
 */

describe('ACCEPTANCE — Paris, the decomposition', () => {
  test('the ten volumetric lines sum to the published headline', () => {
    const all = T().components.filter(c => c.kind === 'volumetric');
    assert.equal(all.length, 10);
    assert.equal(r4(all.reduce((a, c) => a + c.blocks[0].rate, 0)), 4.2300);
  });

  test('the tax rate does the sorting, not a judgement', () => {
    /* Every water-side line is at 5.5% and every wastewater line at 10%. If a
       line had to be assigned by reading its name, this would be an allocation
       and the record would not be publishable. */
    for (const c of T().components.filter(c => c.kind === 'volumetric')) {
      assert.equal(c.vat_rate_percent, c.stream === 'water' ? 5.5 : 10.0, c.id);
    }
    assert.equal(r4(side('water')), 1.7264);
    assert.equal(r4(side('wastewater')), 2.5036);
  });

  test('each side closes against its own VAT rate', () => {
    assert.equal(r4(1.6364 * 1.055), 1.7264);
    assert.equal(r4(2.2760 * 1.10), 2.5036);
    assert.equal(r4(1.6364 + 2.2760), 3.9124);
  });

  test('the subscription is the component the headline excludes', () => {
    const a = T().components.find(c => c.id === 'abonnement');
    assert.equal(a.kind, 'fixed');
    assert.equal(a.period, 'quarterly');
    assert.equal(a.amount, 6.55);
    assert.equal(Number((6.21 * 1.055).toFixed(2)), 6.55);
  });

  test('every rate is booked to the catalogue, which is archived', () => {
    for (const c of T().components) assert.equal(c.source_id, 'eaudeparis-catalogue-2026');
    assert.equal(isArchived(SOURCES['eaudeparis-catalogue-2026']), true);
    assert.equal(SOURCES['eaudeparis-catalogue-2026'].tier, 1);
  });
});

describe('ACCEPTANCE — Paris, what the numbers say', () => {
  const b = calculateBill(T());

  test('the supply bill, and the levies inside it', () => {
    /* 15 x 1,7264 = 25,896 of volumetric, plus 6,55/3 of subscription. */
    assert.equal(b.water_supply.monthly, 28.08);
    assert.equal(Number((28.08 / 15).toFixed(3)), 1.872);
  });

  test('six of the seven water lines are levies, and they are a third of it', () => {
    const supplyRate = T().components.find(c => c.id === 'water_supply').blocks[0].rate;
    const levies = r4(side('water') - supplyRate);
    assert.equal(levies, 0.5322);
    /* 30.8% of the drinking-water price is not the supply rate. A city quoting
       Fourniture d'eau potable alone would look a third cheaper than it is. */
    assert.ok(levies / side('water') > 0.30);
  });

  test('total water services, and wastewater as most of it', () => {
    assert.equal(b.total_services.monthly, 65.63);
    /* The published 4,23 x 15 = 63,45, plus the subscription it excludes. */
    assert.equal(Number((4.23 * 15 + 6.55 / 3).toFixed(2)), 65.63);
    assert.ok(side('wastewater') > side('water'));
  });

  test('both metrics publish, at Grade B, and neither enters the basket', () => {
    assert.equal(T().grade, 'B');
    for (const m of ['water_supply', 'total_water_services']) {
      assert.equal(T().metric_eligibility[m].publishable, true);
      assert.equal(T().metric_eligibility[m].basket_eligible, false);
    }
    assert.deepEqual(acceptCity(read('data/cities/paris.json'), SOURCES, T()).problems, []);
  });
});

describe('ACCEPTANCE — Paris, what is not claimed', () => {
  test('the reference connection is the smallest priced, and says so', () => {
    const rc = T().reference_connection;
    assert.equal(rc.basis, 'smallest_priced');
    assert.match(rc.designation, /names none/);
    /* Fourteen diameters priced, none designated — the §2.5 ceiling, and it
       holds the grade rather than a figure. */
    const s = T().component_states.find(c => c.component === 'reference_connection_designation');
    assert.equal(s.status, 'not_applicable');
    assert.equal(s.blocker_class, 'validation_gap');
  });

  test('collective metering is disclosed, not modelled', () => {
    /* The catalogue prices individualisation of a collective meter as a
       service, which implies the shared meter is the common Parisian case. The
       record models the arrangement the catalogue prices directly and says
       plainly that it is not the common one. */
    assert.ok(T().scope_disclosures.some(d => /Collective metering/.test(d)));
    const s = T().component_states.find(c => c.component === 'collective_metering');
    assert.equal(s.status, 'not_applicable');
  });

  test('the non-potable network is excluded, and named', () => {
    assert.ok(T().excluded.some(e => /non-potable/.test(e.item)));
  });

  test('three lines are collected for others, and counted anyway', () => {
    /* SAP, SIAAP and the Agence de l'eau set their own rates; Eau de Paris only
       collects them. They are on the household's bill, so they are in the
       figure — and the record says whose they are. */
    assert.match(T().jurisdiction.note, /not the one that sets every rate/);
    assert.ok(T().notes.some(n => /on behalf of third parties/.test(n)));
  });

  test('the page carries the figure', () => {
    const c = payload.cities.find(x => x.id === 'paris');
    assert.equal(c.price_m3, 1.872);
    /* The payload rounds the headline rate for display; the record keeps 1,1942. */
    assert.equal(c.published_m3, 1.19);
    assert.equal(T().components.find(x => x.id === 'water_supply').blocks[0].rate, 1.1942);
    /* The gap is the story: the supply price is 56.8% above the supply rate,
       because six levies sit between them. */
    assert.ok(c.gap_percent > 55 && c.gap_percent < 58);
  });
});
