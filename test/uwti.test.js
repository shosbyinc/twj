import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { freezeBase, uwti, median, BASE } from '../src/uwti.js';

const grade = 'A';
const basket = n => Array.from({ length: n }, (_, i) => ({
  territory: `t${i}`, country: `C${i}`, grade,
  bill_usd_supply: 10 + i, bill_usd_services: 20 + i
}));

describe('median', () => {
  test('odd count', () => assert.equal(median([3, 1, 2]), 2));
  test('even count averages the middle pair', () => assert.equal(median([1, 2, 3, 4]), 2.5));
  test('empty basket throws', () => assert.throws(() => median([])));
});

describe('base construction', () => {
  test('refuses a basket below the minimum', () => {
    assert.throws(() => freezeBase(basket(10)), /minimum 20/);
  });

  test('refuses more than one territory per country', () => {
    const b = basket(20); b[1].country = b[0].country;
    assert.throws(() => freezeBase(b), /limit is 1/);
  });

  test('refuses a grade B constituent', () => {
    const b = basket(20); b[5].grade = 'B';
    assert.throws(() => freezeBase(b), /grade A only/);
  });

  test('freezes and hashes a valid basket', () => {
    const base = freezeBase(basket(20));
    assert.equal(base.n, 20);
    assert.equal(base.m0_supply_usd, 19.5);
    assert.match(base.base_hash, /^sha256:[0-9a-f]{32}$/);
    assert.equal(Object.isFrozen(base), true);
  });

  test('withholds the services base when too few constituents separate the streams', () => {
    const b = basket(20); b.forEach((x, i) => { if (i > 3) delete x.bill_usd_services; });
    const base = freezeBase(b);
    assert.equal(base.m0_services_usd, null);
    assert.match(base.services_note, /withheld/);
  });
});

/* The "index values" suite that stood here asserted the withdrawn formula: a
   median of bills converted to USD. It was removed rather than adapted, because
   every property it checked was a property of a construction the index no longer
   uses, and rewriting it in place would have left tests that pass while
   describing nothing. The replacement is test/uwti-formula.test.js, which checks
   the geometric local-relative form — starting with the property that made the
   old one wrong: FX movement alone must not move the index. See
   docs/uwti-index-beta-v0.1.md §3. */


describe('the base cannot be frozen today', () => {
  test('four cities is not a basket', () => {
    const real = [
      { territory: 'singapore', country: 'SG', grade: 'A', bill_usd_supply: 27.0 },
      { territory: 'london',    country: 'GB', grade: 'B', bill_usd_supply: 59.0 },
      { territory: 'newyork',   country: 'US', grade: 'A', bill_usd_supply: 28.34 },
      { territory: 'dubai',     country: 'AE', grade: 'B', bill_usd_supply: 37.7 }
    ];
    let e;
    try { freezeBase(real); } catch (err) { e = err; }
    assert.ok(e, 'freezing four cities must throw');
    assert.ok(e.problems.some(p => /minimum 20/.test(p)), 'below minimum');
    assert.ok(e.problems.some(p => /grade B/.test(p)), 'grade B constituents rejected');
    assert.equal(e.problems.filter(p => /grade B/.test(p)).length, 2, 'London and Dubai both rejected');
  });
});
