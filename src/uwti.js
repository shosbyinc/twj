/**
 * TWJ Urban Water Tariff Index — UWTI
 * Methodology v1.0 · base TWJ-2026
 *
 * Two series on one base construction:
 *   UWTI-W   standardized residential water supply
 *   UWTI-S   total water services, water + wastewater + mandatory drainage
 *
 * Both are published together wherever the second exists. A supply-only
 * index measures a shrinking share of the bill: in New York the water
 * component was 80% of a household's bill in 1979 and is 39% today, and
 * an index built on supply alone would have shown a false trend across
 * that period without publishing a single wrong number.
 *
 * The denominator is frozen at base construction and never recomputed
 * when cities are added. Adding Santiago in 2028 must not move
 * Singapore's 2026 value.
 */

import { createHash } from 'node:crypto';
import { EngineError } from './engine.js';

/* Renamed from the Water Cost Index on 17 August 2026, with Methodology v1.2.
   It measured no cost of production, and using the structural tariff made that
   worse rather than better. The short form Water Tariff Index was rejected:
   WTI is West Texas Intermediate, and a water index that collides with an oil
   benchmark gets misread by the press we want citing it.

   The basket takes the STRUCTURAL price, never the payable one — see §5.4. */
export const BASE = {
  id: 'TWJ-2026',
  base_month: '2026-07',
  minimum_constituents: 20,
  max_per_country: 1,
  required_grade: 'A',
  fx_source: 'IMF period-average, monthly',
  /* July 2026 rather than August: the base must sit in a completed calendar
     month, and DEWA's fuel surcharge is set per month, so an unfinished month
     would freeze the denominator against a rate still in force. */
  base_period_note: 'Last completed calendar month at freeze time'
};

/* ── median, defined so an even count is unambiguous ────── */
export function median(values) {
  if (!values.length) throw new EngineError('wci', 'median of an empty basket');
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ── basket construction ────────────────────────────────── */
/**
 * constituents: [{ territory, country, grade, bill_usd_supply, bill_usd_services }]
 * Refuses to freeze a basket that would not survive scrutiny.
 */
export function freezeBase(constituents, opts = {}) {
  const min = opts.minimum ?? BASE.minimum_constituents;
  const problems = [];

  if (constituents.length < min)
    problems.push(`${constituents.length} constituents, minimum ${min}`);

  const byCountry = {};
  for (const c of constituents) {
    byCountry[c.country] = (byCountry[c.country] ?? 0) + 1;
    if (c.grade !== BASE.required_grade)
      problems.push(`${c.territory} is grade ${c.grade}; the base admits grade A only`);
    if (typeof c.bill_usd_supply !== 'number')
      problems.push(`${c.territory} has no USD supply bill`);
  }
  for (const [country, n] of Object.entries(byCountry))
    if (n > BASE.max_per_country)
      problems.push(`${country} contributes ${n} territories; the limit is ${BASE.max_per_country}`);

  if (problems.length) {
    const e = new EngineError('wci', `base cannot be frozen:\n  − ${problems.join('\n  − ')}`);
    e.problems = problems;
    throw e;
  }

  const supply = median(constituents.map(c => c.bill_usd_supply));
  const services = constituents
    .filter(c => typeof c.bill_usd_services === 'number')
    .map(c => c.bill_usd_services);

  const base = {
    base_id: BASE.id,
    base_month: opts.base_month ?? BASE.base_month,
    frozen_at: opts.frozen_at ?? new Date().toISOString().slice(0, 10),
    constituents: constituents.map(c => c.territory).sort(),
    n: constituents.length,
    m0_supply_usd: Math.round(supply * 1e4) / 1e4,
    m0_services_usd: services.length >= min ? Math.round(median(services) * 1e4) / 1e4 : null,
    services_note: services.length >= min ? null
      : `only ${services.length} constituents publish a separable services bill; UWTI-S base withheld`,
    fx_source: BASE.fx_source,
    methodology_version: 'v1.0'
  };
  base.base_hash = 'sha256:' + createHash('sha256')
    .update(JSON.stringify(base)).digest('hex').slice(0, 32);
  return Object.freeze(base);
}

/* ── index values ───────────────────────────────────────── */
/**
 * The index value — UWTI Index Methodology Beta v0.1.
 *
 * A geometric mean of local-currency structural price relatives. Each city
 * contributes the movement of its own tariff against its own base, in its own
 * currency, and nothing else:
 *
 *     r_i,t  = P_structural_i,t / P_structural_i,base
 *     UWTI_t = 100 * exp( SUM_i w_i * ln r_i,t )
 *
 * What the previous implementation did instead was take a median of bills
 * converted to USD, and that was wrong in a way no amount of care in collection
 * could fix. A water tariff index must not move because a currency moved. If
 * nothing changed in any city's tariff and the dollar fell ten per cent, a
 * USD-based index reports a ten per cent change in the price of water, which is
 * false. FX belongs in a comparison view, never in the time series.
 *
 * Geometric rather than arithmetic because the quantities are ratios: the mean
 * of a doubling and a halving should be no change, and only the geometric mean
 * gives that.
 *
 * Structural, never payable — §5.4. Tokyo under a four-month waiver pays a
 * quarter of its tariff; the index tracks the tariff, because the waiver expires
 * and the base does not.
 *
 * @param base   a frozen basket from freezeBase()
 * @param prices id -> structural price per m3 in the city's own currency, now
 */
export function uwti(base, prices) {
  if (!base?.constituents?.length) throw new EngineError('uwti', 'no basket');

  const weights = base.weights ?? Object.fromEntries(
    base.constituents.map(c => [c.id ?? c, 1 / base.constituents.length]));
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1) > 1e-9)
    throw new EngineError('uwti', `weights sum to ${total}, not 1`);

  let sum = 0;
  const relatives = {};
  for (const c of base.constituents) {
    const id = c.id ?? c;
    const p0 = c.structural_price_base ?? c.price_m3;
    const pt = prices[id];
    if (p0 == null || pt == null)
      throw new EngineError('uwti',
        `${id} has no structural price for one of the two periods; a missing `
        + 'constituent may not be silently dropped from a frozen basket');
    if (p0 <= 0 || pt <= 0) throw new EngineError('uwti', `${id} has a non-positive price`);
    const r = pt / p0;
    relatives[id] = r;
    sum += weights[id] * Math.log(r);
  }

  return {
    index_method: 'geometric_local_price_relatives',
    weighting_method: base.weighting_method ?? 'equal_city',
    basket_version: base.basket_version ?? null,
    base_period: base.period ?? null,
    base_value: 100,
    value: Number((100 * Math.exp(sum)).toFixed(4)),
    relatives,
    /* No currency appears anywhere above. That is the point. */
    fx_used: false
  };
}

const round1 = n => Math.round(n * 10) / 10;

/* ── rebasing keeps both series alive ───────────────────── */
export function chainLink(oldBase, newBase, overlapBillsUsd) {
  if (!overlapBillsUsd.length) throw new EngineError('wci', 'chain-link requires an overlap period');
  const factor = median(overlapBillsUsd.map(b => (100 * b / newBase.m0_supply_usd) /
                                                  (100 * b / oldBase.m0_supply_usd)));
  return { from: oldBase.base_id, to: newBase.base_id, factor: Math.round(factor * 1e6) / 1e6,
           note: 'Both series remain published. The old base is never deleted.' };
}
