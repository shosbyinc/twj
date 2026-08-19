/**
 * The eight-point Grade A gate.
 *
 * A grade is not awarded by judgement. Every point must be satisfied by a
 * stored field, and the gate names the ones that are not.
 *
 * Point 8 is conditional: reconciliation is required where a calculator or an
 * invoice exists, and its absence does not by itself bar grade A — but the
 * absence is recorded, because a figure never checked against a real bill is
 * a different kind of figure from one that has been.
 */

export const POINTS = [
  ['primary_source',      'primary official source'],
  ['current_tariff',      'current effective tariff with a date'],
  ['customer_class',      'customer class known'],
  ['residency_class',     'residency or eligibility class known'],
  ['volumetric_known',    'volumetric tariff known'],
  ['fixed_known',         'all recurring fixed fees known'],
  ['levies_known',        'all mandatory levies and taxes known'],
  ['reproducible',        'bill calculation reproducible']
];

export function gradeAGate(record) {
  const missing = POINTS.filter(([k]) => record[k] !== true).map(([, label]) => label);
  const reconciled = record.reconciled_against ?? null;

  return {
    passes: missing.length === 0,
    missing,
    reconciled,
    reconciliation_note: reconciled
      ? `Reconciled against ${reconciled}.`
      : 'Not reconciled against an invoice or official calculator. Permitted, and recorded.',
    ceiling: missing.length === 0 ? 'A' : 'B'
  };
}

/* ── epistemic category ──────────────────────────────────
   Mixing these is how a modelled figure comes to look like a measured one. */
export const EPISTEMIC = {
  observed:   'read directly from a primary document',
  rule:       'a formula stated by the authority, applied by us',
  derived:    'computed by TWJ from observed values under the scenario',
  third_party:'a modelled indicator published by someone else'
};

export function tag(category, value, note) {
  if (!EPISTEMIC[category]) throw new Error(`unknown epistemic category "${category}"`);
  return { value, epistemic: category, epistemic_note: EPISTEMIC[category], note: note ?? null };
}

/* ── tariff transparency ─────────────────────────────────
   Six declarations that explain a figure without scoring it. A subsidised
   tariff is not a cheap water system: it is a household liability that
   somebody else is paying part of. */
export const TRANSPARENCY_FIELDS = [
  'subsidised_tariff',        // yes | no | unknown
  'nationality_dependent',    // yes | no
  'wastewater_included',      // yes | no
  'fixed_charge',             // yes | no
  'consumption_blocks',       // yes | no
  'variable_surcharge'        // yes | no
];

export function transparency(record) {
  const out = {};
  for (const f of TRANSPARENCY_FIELDS) out[f] = record[f] ?? 'unknown';
  out.caution = out.subsidised_tariff === 'yes'
    ? 'This tariff is subsidised. A low bill here measures what the household pays, not what the water costs to produce.'
    : null;
  return out;
}
