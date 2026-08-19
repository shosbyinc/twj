/**
 * Comparability grading.
 *
 * The methodology conflated two different things under one letter, and the
 * conflation is what makes a grade A basket look unreachable.
 *
 *   UNCERTAINTY  — the bill could be more than one number, and we do not know
 *                  which. Singapore's rounding stage: 35.07 or 35.15. Dubai's
 *                  meter type: 143.83 or 145.93. This is an error bar and it
 *                  is measured, not judged.
 *
 *   SCOPE        — the bill is exactly one number, but it describes a defined
 *                  subset of households. London's reference account is metered
 *                  in a region where metering is not universal. Nothing about
 *                  the figure is uncertain; what it represents is narrower
 *                  than "a London household".
 *
 * A scope disclosure is not an error. Grading it as though it were means a
 * city with a perfectly determined tariff is barred from the base basket for
 * being honest about who it describes.
 *
 * The grade therefore follows uncertainty alone. Scope travels with the
 * figure as a disclosure and is printed beside it.
 */

import { materiality } from './decimal.js';
import { EngineError } from './engine.js';

export function gradeMetric({ bill_low, bill_high, scope = [], blocking = [] }) {
  if (blocking.length) {
    return { grade: 'C', u: null, reason: 'unresolved component', blocking, scope };
  }
  const m = materiality(bill_low, bill_high);
  return {
    grade: m.grade_ceiling,
    u: m.u,
    range: m.range,
    scope,
    basket_eligible: m.grade_ceiling === 'A',
    /* Rule: a scope disclosure never lowers the grade. It must be published
       beside the figure, and a basket constituent must carry at most the
       scope disclosures the methodology allows for a reference account. */
    scope_note: scope.length
      ? `Grade unaffected. Disclosed scope: ${scope.join('; ')}.`
      : null
  };
}

/** How far the current dataset is from a freezable base. */
export function basketReadiness(observations, required = 20) {
  const eligible = observations.filter(o => o.grade === 'A');
  const byCountry = {};
  for (const o of eligible) byCountry[o.country] = (byCountry[o.country] ?? 0) + 1;
  const admissible = eligible.filter(o => byCountry[o.country] === 1
    || eligible.findIndex(x => x.country === o.country) === eligible.indexOf(o));

  const rate = observations.length ? eligible.length / observations.length : 0;
  return {
    audited: observations.length,
    grade_a: eligible.length,
    admissible: admissible.length,
    required,
    still_needed: Math.max(0, required - admissible.length),
    observed_yield: Number((rate * 100).toFixed(1)),
    projected_audits_required: rate > 0
      ? Math.ceil(required / rate)
      : null,
    projection_note: rate > 0
      ? `At the observed yield, reaching ${required} grade A observations implies auditing about ${Math.ceil(required / rate)} cities.`
      : 'No grade A observations yet; the yield cannot be projected.',
    can_freeze: admissible.length >= required
  };
}
