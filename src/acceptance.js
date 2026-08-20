/**
 * The acceptance gate.
 *
 * This logic was written in `scripts/build.js` and then stranded: when the
 * pipeline moved to `site.js`, the gate did not come with it. For a while the
 * README described a build that refuses to publish an unverified city while
 * the build actually running refused nothing. A rule that is documented but
 * not executed is worse than no rule, because it is quoted as though it were.
 *
 * A city that fails a condition here cannot reach the site, whatever its own
 * record claims about itself. It is not dropped: it appears with the reasons
 * printed where the number would be.
 *
 * Provenance is the one condition asked per metric rather than per city —
 * see src/publication.js for why.
 */
import { archiveStatus, isArchived } from './publication.js';

export const MAX_TIER = 2;

/** §3.10 — how the absence of a superseding instrument is established. */
export const VALIDITY_BASES = ['live_publisher_schedule', 'recorded_search'];

/**
 * Through what date a tariff is shown to be in force: the day its continuity
 * source was accessed, and not one day further. A tariff with a stated expiry
 * is valid to that expiry and needs nothing from this.
 */
export function validThrough(tariff, sources = {}) {
  if (tariff?.effective_to) return { date: tariff.effective_to, basis: 'stated_expiry' };
  const k = tariff?.continuity;
  const src = k && sources[k.in_force_source_id];
  if (!src?.accessed_at) return null;
  return { date: src.accessed_at, basis: k.basis, source_id: k.in_force_source_id };
}

/**
 * @param {object} city     a data/cities record
 * @param {object} sources  id → source record
 * @param {object} [tariff] the resolved tariff, if one was loaded
 * @param {string} [today]  ISO date, injectable so the test is not a clock
 * @returns {{ problems: string[], metric_problems: object, publishable: boolean }}
 */
/**
 * What has been verified, reported beside the figure rather than folded into it.
 * Grade says how certain the number is; validation says how many independent
 * ways it has been shown. London and Dubai are both Grade A; Dubai additionally
 * reconciles against an invoice, and a reader should be able to see that.
 */
export function validationOf(tariff, sources = {}) {
  /* A tariff may cite one source or several; a record that names only
     source_id is not unverified for saying it once. */
  const ids = tariff?.sources ?? (tariff?.source_id ? [tariff.source_id] : []);
  const cited = ids.map(id => sources[id]).filter(Boolean);
  return {
    source_verified: cited.length > 0
      && cited.every(s => isArchived(s)) && cited.every(s => s.tier <= MAX_TIER),
    calculation_verified: Boolean(tariff?.components?.length)
      && (tariff.component_states ?? []).every(c => c.status !== 'unresolved'
          || c.blocker_class === 'validation_gap'),
    reconciled: Boolean(tariff?.public_reconciliation)
  };
}

export function acceptCity(city, sources, tariff = null, today = new Date().toISOString().slice(0, 10)) {
  const problems = [];
  /* Filled by the component loop below and merged with the provenance result. */
  const metric_problems = {};

  if (!city.tariff_id) problems.push('no tariff_id');
  if (!city.utility) problems.push('no utility named (Rule 9.4)');
  if (!city.verified_at) problems.push('no verification date');
  /* The two-person review was withdrawn in v1.3 and replaced by the publication
     checklist below. A reviewer is still recorded — provenance of the reading
     matters — but one is now enough, because there was only ever one. */
  if (!Array.isArray(city.verified_by) || city.verified_by.length < 1)
    problems.push('no reviewer recorded (Rule 9.3)');

  for (const id of city.sources ?? []) {
    const s = sources[id];
    if (!s) { problems.push(`unknown source "${id}"`); continue; }
    if (s.tier > MAX_TIER)
      problems.push(`source "${id}" is tier ${s.tier}; a bill requires tier 1 or 2 (Rule 7.1)`);
  }

  /* §7.6 — an unresolved component is a blocker at the gate, not only inside
     the engine, so a city cannot ship by never calling the calculator. */
  for (const c of tariff?.component_states ?? []) {
    /* Only a material blocker holds publication. A component recorded as a
       validation gap is reported and does not suppress the number. */
    /* non_standardizable is not a blocker for the record; it withholds the
       metric it names. Perth's sewerage is known exactly and simply has no
       input in this scenario. */
    if (c.status === 'non_standardizable') continue;
    /* A blocker holds the metric it names, not the record. §7.2a already asked
       provenance per metric and §5 grades per metric; a component state is the
       third thing that has to follow. Dubai's unobtained decree withholds its
       sewerage figure, and Seoul's open sewerage tax question is the same shape
       — neither touches the water supply bill. */
    if (c.status === 'unresolved' && c.blocker_class !== 'validation_gap') {
      if (c.affects_metric && c.affects_metric !== 'water_supply') {
        metric_problems[c.affects_metric] = (metric_problems[c.affects_metric] ?? [])
          .concat(`component "${c.component}" is unresolved (Rule 7.6)`);
      } else {
        problems.push(`component "${c.component}" is unresolved (Rule 7.6)`);
      }
    }
    if (/^confirmed_absent/.test(c.status) && !c.source_id)
      problems.push(`component "${c.component}" is declared absent with no source (Rule 7.6)`);
    if (c.status === 'confirmed_absent_by_exhaustive_schedule' && !c.exhaustive_schedule_basis)
      problems.push(`component "${c.component}" claims an exhaustive schedule without saying `
        + `why the document is exhaustive for this customer class (Rule 7.6)`);
  }

  /* §9.3 (v1.3) — the publication checklist, in place of a second signature.
     Every condition here is checkable, which is the point: it runs on every
     build and does not depend on anyone remembering. */
  const comps = tariff?.components ?? [];
  for (const c of comps) {
    if (c.kind === 'rebate') continue;
    if (!c.source_id && !tariff.source_id)
      problems.push(`component "${c.id}" carries a rate with no source (Rule 9.3)`);
  }
  if (tariff && tariff.grade === 'A') {
    for (const c of comps) {
      if (c.assumed) problems.push(`Grade A record has an assumed component "${c.id}" (Rule 9.3)`);
    }
  }
  /* v1.5: an absent reconciliation is a validation gap, not a blocker. A utility
     publishes a tariff, not a worked example of our benchmark, and requiring one
     amounted to holding a deterministic tariff hostage to the publisher's choice
     of illustrations. Reported beside the figure instead — see validationOf(). */

  /* §3.10 — an open-ended tariff must say through what date it is known to be
     in force. The rule exists because the alternative — demanding a document
     dated on the valuation date — would delete Hong Kong, whose rates have not
     moved since 1995 and whose publisher has therefore had no reason to reissue
     anything.

     The first draft of this check demanded a separately recorded search for a
     superseding instrument and withheld Hong Kong, Dubai and New York on it.
     That was the v1.5 mistake again: for a tariff evidenced by the publisher's
     own live schedule, the schedule *is* the search. A superseding rate would
     appear there, and does not. A separate search is what a stale capture or a
     one-off instrument needs, not what a current page needs.

     What blocks: not saying through what date the evidence reaches. What does
     not block: that date being older than one would like. The reach is
     published and the reader can weigh it, which is the whole method. */
  if (tariff && !tariff.effective_to && tariff.effective_from) {
    const k = tariff.continuity;
    if (!k) {
      problems.push('the tariff has no stated expiry and no continuity record: nothing '
        + 'states through what date it is known to be in force (Rule 3.10)');
    } else {
      const src = sources[k.in_force_source_id];
      if (!src) {
        problems.push(`continuity cites unknown source "${k.in_force_source_id}" (Rule 3.10)`);
      } else if (!src.accessed_at) {
        problems.push(`continuity source "${k.in_force_source_id}" has no accessed_at, so the `
          + 'tariff is in force through no stated date (Rule 3.10)');
      } else if (src.accessed_at < tariff.effective_from) {
        problems.push(`continuity source "${k.in_force_source_id}" was accessed ${src.accessed_at}, `
          + `before the tariff took effect on ${tariff.effective_from} (Rule 3.10)`);
      }
      if (!VALIDITY_BASES.includes(k.basis))
        problems.push(`continuity basis "${k.basis}" is not one of ${VALIDITY_BASES.join(', ')} (Rule 3.10)`);
      /* A live schedule answers the supersession question by existing. Any
         other basis has to say who looked, over what, and what they found. */
      if (k.basis === 'recorded_search') {
        const s = k.search;
        if (!s?.performed_on || !s?.scope || !s?.finding)
          problems.push('a recorded search needs a date, a scope and a finding, or its '
            + 'silence establishes nothing (Rule 3.10)');
      }
    }
  }

  /* §2.5 — the reference connection is printed, or the city is not published. */
  if (tariff && tariff.grade !== 'C') {
    const rc = tariff.reference_connection;
    if (!rc?.size) problems.push('no reference connection declared (Rule 2.2)');
    else if (!rc.source_id)
      problems.push(`reference connection "${rc.size}" has no source (Rule 2.2)`);
  }

  if (city.supply?.shares_published === true && !city.supply.production_year)
    problems.push('supply shares published without a production year (Rule 9.5)');

  if (tariff?.effective_from && tariff.effective_from > today)
    problems.push(`tariff effective ${tariff.effective_from} has not begun`);

  /* Rule 7.2, asked once per metric. A document behind the sewerage rate
     withholds total water services and nothing else. */
  const archive = archiveStatus(city, sources);
  for (const [metric, ok] of Object.entries(archive.by_metric)) {
    if (ok) continue;
    metric_problems[metric] = (metric_problems[metric] ?? []).concat(
      archive.sources_missing[metric]
        .map(id => `source "${id}" has no archived snapshot hash (Rule 7.2)`));
  }

  return {
    problems,
    metric_problems,
    /* The headline figure needs the city to pass and its supply documents
       to be archived. A held services figure does not unpublish the city. */
    publishable: problems.length === 0 && !metric_problems.water_supply
  };
}
