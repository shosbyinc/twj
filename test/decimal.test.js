import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dec, mul, add, div, sum, toFixed, toExact, toNumber, materiality, round } from '../src/decimal.js';

describe('exact decimal arithmetic', () => {
  test('the classic float failure does not occur', () => {
    assert.notEqual(0.1 + 0.2, 0.3);                       // binary float
    assert.equal(toExact(add(dec('0.1'), dec('0.2'))), '0.3');
  });

  test('Singapore WCT at the statutory 50% is exactly 0.715', () => {
    const wct = mul(dec('1.43'), dec('0.5'));
    assert.equal(toExact(wct), '0.715');
  });

  test('supply before GST at 15 m³ is exactly 32.175', () => {
    const supply = mul(add(dec('1.43'), dec('0.715')), dec('15'));
    assert.equal(toExact(supply), '32.175');
  });

  test('GST at 9% gives 35.07075, not a float approximation', () => {
    const supply = mul(add(dec('1.43'), dec('0.715')), dec('15'));
    const withGst = mul(supply, dec('1.09'));
    assert.equal(toExact(withGst), '35.07075');
    assert.equal(toFixed(withGst, 2), '35.07');
  });

  test('the rounded-table alternative gives 35.1525', () => {
    const alt = mul(mul(add(dec('1.43'), dec('0.72')), dec('15')), dec('1.09'));
    assert.equal(toExact(alt), '35.1525');
    assert.equal(toFixed(alt, 2), '35.15');
  });

  test('imperial gallons convert without drift', () => {
    const m3 = div(dec('15'), dec('0.00454609'));
    assert.equal(toFixed(m3, 2), '3299.54');
  });

  test('half-up rounding is symmetric about zero', () => {
    assert.equal(toFixed(dec('2.005'), 2), '2.01');
    assert.equal(toFixed(dec('-2.005'), 2), '-2.01');
  });

  test('sum of many components does not accumulate error', () => {
    const parts = Array.from({ length: 1000 }, () => dec('0.01'));
    assert.equal(toExact(sum(parts)), '10');
  });

  test('toNumber is display only and rounds once', () => {
    assert.equal(toNumber(dec('35.07075')), 35.07);
  });

  test('rejects precision beyond the scale rather than truncating silently', () => {
    assert.throws(() => dec('0.1234567890123'), /decimal places/);
  });
});

describe('materiality', () => {
  test('Singapore rounding ambiguity is 0.23% — inside the 1% ceiling', () => {
    const m = materiality('35.07075', '35.1525');
    assert.ok(m.u > 0.2 && m.u < 0.25, `u = ${m.u}`);
    assert.equal(m.grade_ceiling, 'B');
  });

  test('Dubai meter ambiguity exceeds 1% and caps the grade at C', () => {
    // 138.60 with no meter charge, 145.95 with a Type 2 meter
    const m = materiality('138.60', '145.95');
    assert.ok(m.u > 1, `u = ${m.u}`);
    assert.equal(m.grade_ceiling, 'C');
  });

  test('no uncertainty leaves grade A available', () => {
    assert.equal(materiality('50', '50').grade_ceiling, 'A');
  });
});
