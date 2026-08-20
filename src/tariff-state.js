/**
 * Tariff state — §3.8.
 *
 * Some tariffs publish more than one rate and select between them on the
 * measured state of the system. Sydney has a normal rate and a drought rate,
 * and a 60/70 storage trigger decides which is in force.
 *
 * Two things follow, and they are the whole of this module.
 *
 * First, a state-conditioned rate needs two pieces of evidence, not one. The
 * tariff document gives the rule; it cannot give the state. Without a dated,
 * authoritative observation of the state, the applicable rate is not
 * established — the engine has both numbers and no basis for choosing.
 *
 * Second, the trigger must come from the instrument governing this tariff.
 * WaterNSW's wholesale determination defines a 31-day lag at Part 7 Clause 25;
 * Sydney Water's retail page states the trigger without one. The thresholds look
 * identical, which is exactly why borrowing one for the other would be invisible
 * in the output and wrong.
 */
import { METHODOLOGY } from './methodology.js';

export class StateError extends Error {
  constructor(rule, message) { super(`[${rule}] ${message}`); this.rule = rule; }
}

/** A state observation is evidence, with its own dates and hash. */
export function validateStateObservation(o) {
  for (const k of ['state_type', 'authority', 'value', 'unit',
                   'observed_at', 'source_id', 'snapshot_sha256']) {
    if (o?.[k] === undefined || o[k] === null || o[k] === '')
      throw new StateError('3.8', `state observation is missing ${k}`);
  }
  /* Observed and retrieved are different facts: a document archived today can
     prove the state of the system on a date in the past. */
  if (o.retrieved_at && o.retrieved_at < o.observed_at)
    throw new StateError('3.8', 'retrieved_at precedes observed_at');
  if (String(o.snapshot_sha256).startsWith('PENDING'))
    throw new StateError('7.2', 'a state observation needs a real hash, not a placeholder');
  return true;
}

/**
 * Resolve which published rate applies.
 * @returns {{ state: string|null, applicable: object|null, unresolved: string|null }}
 */
export function resolveTariffState(tariff, observations = {}) {
  const ts = tariff?.tariff_state;
  if (!ts) return { state: null, applicable: null, unresolved: null };

  if (!ts.rule_source_id)
    throw new StateError('3.8', 'a tariff state declares no rule source');

  /* The trigger must be governed by this tariff's own instrument. */
  const cited = tariff.sources ?? (tariff.source_id ? [tariff.source_id] : []);
  const incorporated = ts.incorporated_by_rule_source === true;
  if (!cited.includes(ts.rule_source_id) && !incorporated) {
    throw new StateError('3.8',
      `the tariff-state trigger cites "${ts.rule_source_id}", which this tariff does not `
      + 'cite and does not declare as incorporated. ' + METHODOLOGY.tariff_state.trigger_provenance);
  }

  if (!ts.state_source_id) {
    return { state: null, applicable: null,
      unresolved: `the ${ts.type} state is not established: the tariff gives the rule and no `
        + 'dated authoritative observation of the state has been captured. Rule and state '
        + 'together make an applicable rate; the rule alone does not.' };
  }
  const obs = observations[ts.state_source_id];
  if (!obs) {
    return { state: null, applicable: null,
      unresolved: `state observation "${ts.state_source_id}" is cited and not held` };
  }
  validateStateObservation(obs);
  return { state: obs.tariff_state_result ?? ts.state, applicable: obs, unresolved: null };
}
