/**
 * Tariff curve.
 *
 * A single volume measures a tariff at one point. It does not describe it.
 * A fixed charge of AED 5 is AED 1.00/m³ at 5 m³ and AED 0.20/m³ at 25 m³;
 * a rising block schedule does the opposite. Two cities can meet at 15 m³ and
 * be completely different instruments either side of it.
 *
 *   P(V) = B(V) / V
 *
 * 15 m³ stays the headline because a reader needs one number. It is not the
 * data — it is the point at which we measure a published function.
 */

import { calculateBill, SCENARIO } from './engine.js';

export const CURVE_POINTS = [5, 10, 15, 20, 25];

export function tariffCurve(tariff, points = CURVE_POINTS) {
  const out = points.map(v => {
    /* Measure the tariff at v m³ a month through its own shape, so a statutory
       period, an annual accumulating block and a daily allowance each keep the
       geometry that makes them what they are. */
    const t = { ...tariff, measure_at_monthly_m3: v };
    const bill = calculateBill(t);
    const supply = bill.water_supply.monthly;
    const services = bill.total_services.monthly;
    return {
      m3: v,
      supply_bill: supply,
      supply_per_m3: supply === null ? null : round3(supply / v),
      services_bill: services,
      services_per_m3: services === null ? null : round3(services / v)
    };
  });

  const at = v => out.find(p => p.m3 === v);
  const lo = at(points[0]), hi = at(points[points.length - 1]);

  return {
    currency: tariff.currency,
    headline_m3: SCENARIO.monthly_m3,
    points: out,
    shape: shapeOf(lo, hi, out)
  };
}

/**
 * The curve's shape is dimensionless, so unlike the bill itself it compares
 * directly across currencies.
 *
 *   ratio = P(low) / P(high)
 *     > 1  declining — fixed charges dominate; small households pay more per m³
 *     ≈ 1  flat — a pure volumetric tariff
 *     < 1  rising — block structure penalises volume
 */
function shapeOf(lo, hi, points) {
  if (!lo?.supply_per_m3 || !hi?.supply_per_m3) return null;
  const ratio = lo.supply_per_m3 / hi.supply_per_m3;
  const label = ratio > 1.05 ? 'declining' : ratio < 0.95 ? 'rising' : 'flat';
  return {
    ratio: round3(ratio),
    label,
    reading: {
      declining: 'Fixed charges dominate. A small household pays more per cubic metre than a large one.',
      flat: 'A purely volumetric tariff. The price per cubic metre does not depend on how much is used.',
      rising: 'A rising block schedule. The price per cubic metre increases with consumption.'
    }[label],
    /* Where the curve is flat but the headline sits above the published rate,
       the gap is entirely taxes and surcharges rather than fixed charges. */
    span: [lo.supply_per_m3, hi.supply_per_m3],
    monotonic: isMonotonic(points.map(p => p.supply_per_m3))
  };
}

function isMonotonic(xs) {
  const clean = xs.filter(x => x !== null);
  const up = clean.every((x, i) => i === 0 || x >= clean[i - 1]);
  const down = clean.every((x, i) => i === 0 || x <= clean[i - 1]);
  return up || down;
}

/** The gap between what the utility prints and what the scenario actually costs. */
export function publishedVsEffective(publishedRate, effective) {
  const diff = effective - publishedRate;
  /* A city whose first block is free has no headline volumetric rate to sit
     outside of, and the comparison is not merely large — it is undefined. Hong
     Kong gives 12 m³ a quarter free and Tokyo puts the first 5 m³ a month
     inside the basic charge, so the divisor is zero and the ratio is Infinity.
     JSON has no Infinity: it serialises as null, and a renderer that rounds
     for display turns that null into 0%. Three quiet steps from "we cannot say"
     to "nothing beyond the rate", which is the opposite claim and the one
     failure this measure must never make.
     Null here, and null is not a number a reader ever sees as zero. */
  const defined = Number.isFinite(publishedRate) && publishedRate > 0;
  return {
    published: publishedRate,
    effective: round3(effective),
    difference: round3(diff),
    percent: defined ? round3((diff / publishedRate) * 100) : null,
    undefined_because: defined ? null
      : 'the published volumetric rate is zero, so there is no rate for the rest of the bill to sit outside of',
    note: !defined
      ? 'The first block is free or included, so no share of the bill can be expressed against the volumetric rate.'
      : diff > 0
      ? 'The effective price exceeds the published volumetric rate. The difference is mandatory charges the rate does not include.'
      : 'The effective price does not exceed the published rate.'
  };
}

/* Rounding is for display and must not invent a number. Math.round(null) is 0
   and Math.round(Infinity) is Infinity; both are values a reader would read as
   a measurement. A rounder that is handed a non-number hands back nothing. */
const round3 = n => Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
