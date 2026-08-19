/**
 * Exact decimal arithmetic for money and rates.
 *
 * Binary floating point cannot represent 0.715 or 1.43 exactly, and a tariff
 * engine that multiplies, sums and then applies a percentage accumulates that
 * error across every component. At S$0.001 the error is invisible; across a
 * 49-point back-series it is not, and a figure that cannot be reproduced
 * digit-for-digit by a reader is not provenance.
 *
 * Values are held as BigInt scaled by 10^12. Nothing rounds until display,
 * unless the utility's own billing rule requires an intermediate rounding —
 * in which case that rounding is declared on the component.
 */

export const SCALE = 12n;
const F = 10n ** SCALE;

export function dec(v) {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`cannot represent ${v}`);
    return dec(v.toString());
  }
  if (typeof v !== 'string') throw new Error(`cannot convert ${typeof v} to decimal`);
  const s = v.trim();
  const m = /^(-?)(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m) throw new Error(`not a decimal literal: "${v}"`);
  const [, sign, int = '', frac = ''] = m;
  if (frac.length > Number(SCALE)) throw new Error(`"${v}" exceeds ${SCALE} decimal places`);
  const padded = (frac + '0'.repeat(Number(SCALE))).slice(0, Number(SCALE));
  const n = BigInt((int || '0') + padded);
  return sign === '-' ? -n : n;
}

export const add = (a, b) => a + b;
export const sub = (a, b) => a - b;
export const mul = (a, b) => (a * b) / F;
export const div = (a, b) => {
  if (b === 0n) throw new Error('division by zero');
  return (a * F) / b;
};
export const neg = a => -a;
export const max = (a, b) => (a > b ? a : b);
export const min = (a, b) => (a < b ? a : b);
export const sum = xs => xs.reduce((t, x) => t + x, 0n);
export const isZero = a => a === 0n;
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Half-up rounding to `places`, used only where a billing rule requires it. */
export function round(a, places) {
  const p = 10n ** (SCALE - BigInt(places));
  const half = p / 2n;
  const r = a % p;
  const base = a - r;
  if (a >= 0n) return r >= half ? base + p : base;
  return -r >= half ? base - p : base;
}

/** Display string at the currency's minor unit. Rounds once, at the edge. */
export function toFixed(a, places = 2) {
  const r = round(a, places);
  const neg = r < 0n;
  const abs = neg ? -r : r;
  const whole = abs / F;
  const frac = (abs % F).toString().padStart(Number(SCALE), '0').slice(0, places);
  return `${neg ? '-' : ''}${whole}${places ? '.' + frac : ''}`;
}

/** Number, for display and JSON only. Never feed this back into arithmetic. */
export const toNumber = (a, places = 2) => Number(toFixed(a, places));

/** Exact, unrounded string — what the calculation trace stores. */
export function toExact(a) {
  const neg = a < 0n;
  const abs = neg ? -a : a;
  const frac = (abs % F).toString().padStart(Number(SCALE), '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${abs / F}${frac ? '.' + frac : ''}`;
}

/* ── materiality, per the methodology ────────────────────
   U = (Bmax − Bmin) / ((Bmax + Bmin) / 2)
   U ≤ 1%  → an assumption may be disclosed and the metric graded B
   U > 1%  → the metric is not publishable as a headline value        */
export function materiality(bmin, bmax) {
  const lo = dec(bmin), hi = dec(bmax);
  if (hi < lo) throw new Error('materiality: max below min');
  const mid = div(add(lo, hi), dec(2));
  if (mid === 0n) return { u: 0, grade_ceiling: 'A' };
  const u = Number(toFixed(mul(div(sub(hi, lo), mid), dec(100)), 6));
  /* No uncertainty is not the same as tolerable uncertainty:
     an exactly determined bill leaves grade A available. */
  const grade_ceiling = u === 0 ? 'A' : u <= 1 ? 'B' : 'C';
  return { u, grade_ceiling, range: [toExact(lo), toExact(hi)] };
}
