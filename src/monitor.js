/**
 * Source monitor.
 *
 * A reference layer is only as good as the moment it notices it is wrong.
 * Every source record carries a content hash from the moment it was captured.
 * The monitor re-hashes, compares, and produces a change record — it never
 * updates a published figure on its own.
 *
 * Rule 9.2 applies here too: detection is automatic, publication is not.
 * A changed source moves the affected observations to `stale` and opens a
 * review. Nothing on the site silently becomes a new number.
 */

import { createHash } from 'node:crypto';

export const STATES = ['current', 'verification_due', 'stale'];

/** Cadence windows in days, by source class. */
export const CADENCE = {
  tariff_schedule: 30,
  monthly_surcharge: 25,   // DEWA resets monthly; check before the month turns
  tax_rate: 90,
  rate_history: 180,
  context_dataset: 365
};

/* Raw bytes, matching scripts/archive.js exactly. A monitor that hashes
   differently from the archiver reports every source as changed, which is
   worse than no monitor: it trains the reader to ignore the warning. */
export const hashContent = data =>
  'sha256:' + createHash('sha256').update(data).digest('hex');

/* Whitespace-insensitive variant, for live HTML where markup churns. */
export const hashText = text =>
  'sha256:' + createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex');

const days = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

/**
 * Classify one source against its cadence and its last observed hash.
 * `fetched` may be null when the check could not be performed — that is
 * itself a state, not a pass.
 */
export function checkSource(source, fetched, today) {
  const window = CADENCE[source.class] ?? CADENCE.tariff_schedule;
  const age = days(source.last_checked_at, today);

  if (fetched === null || fetched === undefined) {
    return { id: source.id, state: 'stale', age, window,
      reason: 'source could not be reached', changed: null };
  }

  const hash = hashContent(fetched);
  if (source.content_hash && hash !== source.content_hash) {
    return { id: source.id, state: 'stale', age, window, changed: true,
      reason: 'source content changed since capture',
      old_hash: source.content_hash, new_hash: hash,
      affects: source.affects ?? [] };
  }
  if (age > window) {
    return { id: source.id, state: 'verification_due', age, window, changed: false,
      reason: `last checked ${age} days ago; window is ${window}` };
  }
  return { id: source.id, state: 'current', age, window, changed: false, reason: null };
}

/**
 * A month of checks, reduced to what an editor and a reader need to see.
 * Change records are append-only: a superseding figure never overwrites the
 * one it replaces.
 */
export function changeLog(checks, sources) {
  const byId = Object.fromEntries(sources.map(s => [s.id, s]));
  const changed = checks.filter(c => c.changed === true);
  const unreachable = checks.filter(c => c.changed === null);
  const due = checks.filter(c => c.state === 'verification_due');

  const affected = new Set();
  for (const c of [...changed, ...unreachable]) {
    for (const cityId of byId[c.id]?.affects ?? []) affected.add(cityId);
  }

  return {
    checked: checks.length,
    current: checks.filter(c => c.state === 'current').length,
    verification_due: due.length,
    stale: changed.length + unreachable.length,
    changed: changed.map(c => ({
      source: c.id,
      publisher: byId[c.id]?.publisher ?? null,
      what: byId[c.id]?.title ?? null,
      affects: byId[c.id]?.affects ?? [],
      old_hash: c.old_hash, new_hash: c.new_hash,
      action: 'observations moved to stale; review opened; no figure republished automatically'
    })),
    unreachable: unreachable.map(c => ({ source: c.id, publisher: byId[c.id]?.publisher ?? null })),
    cities_affected: [...affected],
    /* The reader-facing sentence. If nothing changed, say so — an empty
       change log with a date is a stronger claim than a full one. */
    headline: changed.length === 0 && unreachable.length === 0
      ? `No published tariff changed this period. ${checks.length} sources re-checked.`
      : `${changed.length} source${changed.length === 1 ? '' : 's'} changed, affecting ${affected.size} cit${affected.size === 1 ? 'y' : 'ies'}.`
  };
}

/** A published figure whose source has moved is not wrong yet — it is unproven. */
export function observationState(sourceStates) {
  if (sourceStates.some(s => s === 'stale')) return 'stale';
  if (sourceStates.some(s => s === 'verification_due')) return 'verification_due';
  return 'current';
}
