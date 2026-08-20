import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { uwti } from '../src/uwti.js';

/**
 * UWTI Index Methodology Beta v0.1 — the properties that make it an index.
 *
 * The previous implementation took a median of bills converted to USD. Every
 * test below would have failed against it, and the first one is the reason the
 * formula was replaced: a water tariff index that moves when a currency moves
 * is reporting something other than the price of water.
 */
const basket = (prices, weights) => ({
  basket_version: 'test-01', period: 'TWJ-2026', weighting_method: 'equal_city',
  constituents: Object.entries(prices).map(([id, p]) => ({ id, structural_price_base: p })),
  weights
});

describe('the index measures tariffs, not currencies', () => {
  test('FX movement alone does not move UWTI', () => {
    /* Each relative is a ratio of one city's own currency to itself, so no
       exchange rate can enter. There is nowhere to put one. */
    const b = basket({ dubai: 9.59, london: 3.106, perth: 3.919 });
    const now = { dubai: 9.59, london: 3.106, perth: 3.919 };
    assert.equal(uwti(b, now).value, 100);
    assert.equal(uwti(b, now).fx_used, false);
  });

  test('no local tariff change leaves the index at exactly 100', () => {
    const b = basket({ a: 1, b: 2, c: 3 });
    assert.equal(uwti(b, { a: 1, b: 2, c: 3 }).value, 100);
  });

  test('one constituent moving affects the index only through its own weight', () => {
    const b = basket({ a: 1, b: 1, c: 1 });
    const up = uwti(b, { a: 2, b: 1, c: 1 });
    /* 100 * exp(ln2 / 3) = 100 * 2^(1/3) */
    assert.equal(up.value, Number((100 * Math.cbrt(2)).toFixed(4)));
    assert.equal(up.relatives.b, 1);
  });
});

describe('geometric, because these are ratios', () => {
  test('a doubling and a halving cancel', () => {
    /* The arithmetic mean of 2 and 0.5 is 1.25 — a 25% rise reported where
       nothing happened on average. The geometric mean is 1. */
    const b = basket({ a: 1, b: 1 });
    assert.equal(uwti(b, { a: 2, b: 0.5 }).value, 100);
  });

  test('the result is invariant to the units each city is priced in', () => {
    /* Multiply one city's base and current price by a thousand — fils instead of
       dirhams — and the index is unchanged, because only the ratio enters. */
    const a = uwti(basket({ x: 9.59, y: 3.1 }), { x: 10, y: 3.1 });
    const b = uwti(basket({ x: 9590, y: 3.1 }), { x: 10000, y: 3.1 });
    assert.equal(a.value, b.value);
  });
});

describe('a frozen basket stays frozen', () => {
  test('a constituent missing a price is refused, not dropped', () => {
    const b = basket({ a: 1, b: 1 });
    assert.throws(() => uwti(b, { a: 1 }), /may not be silently dropped/);
  });

  test('adding a city to the database does not touch the basket', () => {
    const b = basket({ a: 1, b: 1 });
    const before = uwti(b, { a: 1.1, b: 1 }).value;
    const after = uwti(b, { a: 1.1, b: 1, newcity: 5 }).value;
    assert.equal(before, after);
  });

  test('weights must sum to one', () => {
    const b = basket({ a: 1, b: 1 }, { a: 0.6, b: 0.6 });
    assert.throws(() => uwti(b, { a: 1, b: 1 }), /weights sum to/);
  });

  test('equal-city weighting is declared, not assumed', () => {
    assert.equal(uwti(basket({ a: 1 }), { a: 1 }).weighting_method, 'equal_city');
    assert.equal(uwti(basket({ a: 1 }), { a: 1 }).index_method,
      'geometric_local_price_relatives');
  });
});

describe('structural, never payable (§5.4)', () => {
  test('a temporary waiver does not move the index', () => {
    /* Tokyo: payable 55, structural 140.80. The basket takes the structural
       price, so a four-month waiver is invisible here — which is the intent. */
    const b = basket({ tokyo: 140.80, london: 3.106 });
    assert.equal(uwti(b, { tokyo: 140.80, london: 3.106 }).value, 100);
  });

  test('a structural drought rate does move it', () => {
    /* Sydney: 3.998 normal, 4.407 under the drought state. That is part of the
       tariff architecture, so it belongs in the index. */
    const b = basket({ sydney: 3.998 });
    assert.ok(uwti(b, { sydney: 4.407 }).value > 110);
  });
});
