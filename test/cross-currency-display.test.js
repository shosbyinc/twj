import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { payload } from '../scripts/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');
/* The payload as this repository produces it now, not as it was last built.
   dist/ is not checked in and `npm run build` runs the tests first. */
const PAYLOAD = payload;

/**
 * Rule 4 forbids reading the prices against one another. The page has to make
 * that hard, not merely say it.
 *
 * The warning existed and sat below the table, and the publisher of this Index
 * compared USD 1.889 against AED 9.59 anyway and asked whether New York could
 * really be five times cheaper than Dubai. A note a reader reaches after doing
 * the comparison has not prevented anything.
 *
 * The same reading treated the map as a price chart, because a map of dots with
 * no caption invites it: New York sits above Dubai for the sole reason that it
 * is further north.
 */
describe('the price column cannot be read as a ranking', () => {
  test('the warning is rendered before the rows, not after them', () => {
    const warn = TPL.indexOf('class="warn"');
    const thead = TPL.indexOf('class="thead"><span>City');
    assert.ok(warn > 0 && thead > 0);
    assert.ok(warn < thead, 'the warning must precede the table in the markup');
  });

  test('the warning counts the currencies from the data', () => {
    /* The home strip said "the four figures" for as long as there were six. A
       hardcoded count becomes a lie the moment a city is added. */
    assert.ok(TPL.includes('map(c=>c.currency)).size'));
    assert.ok(!TPL.includes('The four figures'));
    const currencies = new Set(PAYLOAD.cities.filter(c => !c.not_priced).map(c => c.currency));
    assert.ok(currencies.size >= 5, 'and there really are several');
  });

  test('the column header names the unit', () => {
    assert.match(TPL, /1,000 litres &middot; local currency/);
  });

  test('the currency code travels with each figure, without duplicating the symbol', () => {
    /* AED 9.59 AED reads as a mistake. The code appears only where it differs
       from the symbol shown. */
    assert.ok(TPL.includes("c.symbol.trim()===c.currency?''"));
  });

  test('no converted figure is published anywhere', () => {
    /* §4: no converted value until a period-average rate is loaded and stored. */
    assert.equal(PAYLOAD.fx.status, 'not_fixed');
    for (const c of PAYLOAD.cities) {
      assert.equal(c.price_usd, undefined);
      assert.equal(c.price_converted, undefined);
    }
  });
});

describe('the map says what it is', () => {
  test('it carries a caption naming geography, not price', () => {
    assert.match(TPL, /class="mapcap"/);
    assert.match(TPL, /Geography, not price/);
  });

  test('and names the case that caused the misreading', () => {
    /* New York above Dubai is latitude, and the caption says so, because the
       inference drawn from it was that New York must be cheaper. */
    assert.match(TPL, /New York is above Dubai because it is further north/);
  });

  test('the accessible label says it too, for a reader who never sees the dots', () => {
    /* The wording moved when the land outline was added — the map became a
       schematic world map rather than a bare plot of coordinates. What the
       label must still do is deny the reading it invites: that height on the
       page means price. */
    assert.match(TPL, /aria-label="[^"]*map[^"]*not price"/);
    assert.match(TPL, /aria-label="[^"]*latitude and longitude[^"]*"/);
  });
});
