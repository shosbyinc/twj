/**
 * TWJ Water Index — deterministic tariff engine
 * Methodology version and scenario: see src/methodology.js
 *
 * Zero dependencies. Node >= 18.
 *
 * Hard guarantees enforced here, not by convention:
 *   Rule 3.1 — a rebate is subtracted only if it is universal and automatic
 *   Rule 3.2 — both headline figures are always returned together, and the
 *              site decides per metric which of them it may publish (v1.1)
 *   Rule 3.3 — Water Supply is null, never estimated, when streams are inseparable
 *   Rule 3.4 — components keep their statutory names
 *   Rule 9.1 — no unknown component may be silently assumed to be zero
 *   Rule 9.2 — the result carries a hash of its own inputs
 */

import { createHash } from 'node:crypto';
import { METHODOLOGY } from './methodology.js';

export const SCENARIO = {
  id: METHODOLOGY.scenario_id,
  annual_m3: METHODOLOGY.annual_m3,
  monthly_m3: METHODOLOGY.monthly_m3,
  customer_class: 'ordinary metered residential',
  methodology_version: METHODOLOGY.version
};

const STREAMS = ['water', 'wastewater'];
const KINDS = ['volumetric', 'fixed', 'surcharge_volumetric', 'tax_percent', 'rebate'];

/* Rule 3.4 — a rate is stored in the unit the utility publishes it in.
   The conversion to m³ is explicit, declared, and done by the engine. */
export const VOLUME_UNITS = {
  m3:   { m3_per_unit: 1,             label: 'cubic metre' },
  ccf:  { m3_per_unit: 2.8316846592,  label: 'hundred cubic feet' },
  kgal: { m3_per_unit: 3.785411784,   label: 'thousand US gallons' },
  imperial_gallon: { m3_per_unit: 0.00454609, label: 'imperial gallon' }
};

/* ── errors ─────────────────────────────────────────────── */
export class EngineError extends Error {
  constructor(rule, message) {
    super(`[${rule}] ${message}`);
    this.rule = rule;
  }
}

/* ── money: integer minor units, no float drift ─────────── */
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

/* ── block resolution ───────────────────────────────────── */
/**
 * Qi(V) = max(0, min(V, Ui) − Li)   ·  Cv(V) = Σ Qi(V)·ri
 * Bounds are expressed on the same basis as the volume passed in.
 */
/** Truncate to cents, as distinct from rounding to them. */
const trunc2 = n => Math.floor(n * 100 + 1e-9) / 100;

export function resolveBlocks(volume, blocks, lineRounding = 'round', volumeDp = null) {
  let charge = 0, consumed = 0;
  const detail = [];

  for (const b of blocks) {
    const upper = b.to === null || b.to === undefined ? Infinity : b.to;
    const lower = b.from ?? 0;
    if (b.rate === null || b.rate === undefined) {
      throw new EngineError('9.1', `block ${lower}–${upper} has no rate; a missing rate is not zero`);
    }

    /* A bounded tier takes its own width. The open tier takes whatever the
       bounded ones left, which matters once the bounded widths have been
       rounded: measuring the remainder against the raw bound instead would
       discard the rounding and charge the top tier for volume already billed
       below it. */
    let q = upper === Infinity
      ? Math.max(0, volume - consumed)
      : Math.max(0, Math.min(volume, upper) - lower);

    /* Two rounding stages, both taken from the publisher.
       Hong Kong prorates each tier to the actual days between meter readings
       and rounds that volume to three decimals before multiplying — WSD's own
       example 1 shows a third tier of 19.837 m³, not 19.83722 — and then
       truncates the line to cents rather than rounding it: HK$127.94885 is
       billed as 127.94. Assume either convention wrongly and the engine cannot
       reproduce the publisher's own worked example. */
    if (volumeDp != null && upper !== Infinity) {
      const f = 10 ** volumeDp;
      q = Math.round(q * f) / f;
    }
    if (q <= 0) continue;

    const line = lineRounding === 'truncate' ? trunc2(q * b.rate) : q * b.rate;
    charge += line;
    consumed += q;
    detail.push({ from: lower, to: upper === Infinity ? null : upper, m3: q, rate: b.rate,
                  amount: round2(line) });
  }
  return { charge, detail };
}

/* ── volume basis per tariff shape ──────────────────────── */
function volumeSchedule(shape, overrideM3, tariff, monthlyOverride) {
  /* Reconciliation runs the engine at an invoice's own volume instead of the
     scenario volume. Such a run is never publishable — it exists to prove the
     engine reproduces a real bill. */
  if (overrideM3 != null)
    return [{ label: 'invoice', volume: overrideM3, months: 1, reconciliation: true,
              days: tariff?.reconciliation_period_days ?? null }];
  return volumeScheduleForShape(shape, tariff, monthlyOverride);
}

/**
 * @param monthlyOverride  a monthly volume to measure the tariff at instead of
 *   the scenario's 15 m³. The curve needs this: it asks what the same tariff
 *   costs at 5, 10, 20 and 25 m³. It cannot reuse the reconciliation path,
 *   which means "a real invoice for one month" and quietly discards the
 *   statutory period a Hong Kong tier resets over.
 */
function volumeScheduleForShape(shape, tariff, monthlyOverride) {
  const Y = METHODOLOGY.days_in_year;
  const MONTHLY = monthlyOverride ?? SCENARIO.monthly_m3;
  const ANNUAL = monthlyOverride != null ? monthlyOverride * 12 : SCENARIO.annual_m3;
  switch (shape) {
    case 'flat':
    case 'annual_bands':
      return [{ label: 'year', volume: ANNUAL, months: 12 }];

    /* Perth. Blocks are annual and accumulate across the utility's own bill
       year of six two-monthly periods. The scenario resolves the whole year in
       one pass, which is what accumulation means: the same 180 m³ crosses the
       150 kL threshold once, not six times. */
    case 'annual_accumulating_blocks':
      return [{ label: 'bill_year', volume: ANNUAL, months: 12, accumulating: true }];

    case 'monthly_blocks':
      return Array.from({ length: 12 }, (_, i) => ({ label: `m${i + 1}`, volume: MONTHLY, months: 1 }));
    case 'seasonal':
      return Array.from({ length: 12 }, (_, i) => ({ label: `m${i + 1}`, volume: MONTHLY, months: 1, month: i + 1 }));

    /* Abu Dhabi. Bands are a daily allowance, so the scenario has to be
       expressed as a daily rate before it can be compared with one:
       180 ÷ 365.2425 = 0.492823 m³/day. Applying a daily threshold to a
       monthly volume would put every household in the top band. */
    case 'daily_allowance_blocks': {
      const perDay = ANNUAL / Y;
      return [{ label: 'day', volume: perDay, repeat: Y, months: 12, days: 1, daily: true }];
    }

    /* Hong Kong. Billed roughly four-monthly, and the period is defined in law
       as 121.64 days with the tier allowances prorating to it. The scenario
       volume for one period is 180 × 121.64 ÷ 365.2425 = 59.947021 m³. */
    case 'billing_period_blocks': {
      const d = tariff?.billing_period_days;
      if (!d) throw new EngineError('spec',
        'shape billing_period_blocks requires billing_period_days');
      const volume = ANNUAL * d / Y;
      return [{ label: 'period', volume, repeat: Y / d, months: 12, days: d, period_days: d }];
    }
    default:
      throw new EngineError('2.3', `unknown tariff shape "${shape}"`);
  }
}

/** Total metered volume the schedule represents in a year. */
function scheduleAnnualVolume(schedule) {
  return schedule.reduce((t, p) => t + p.volume * (p.repeat ?? 1), 0);
}

/* ── component evaluation ───────────────────────────────── */
function evaluateComponent(c, schedule, conversion) {
  if (!KINDS.includes(c.kind)) throw new EngineError('spec', `unknown component kind "${c.kind}"`);
  if (!STREAMS.includes(c.stream)) throw new EngineError('spec', `component "${c.id}" has no valid stream`);

  switch (c.kind) {
    case 'volumetric': {
      let total = 0;
      const parts = [];
      /* A tariff may declare the utility's own conversion factor, which is not
         always the physical one. DEWA's meter multiplication factor is 220 IG
         per m³, and every rate on its published per-m³ table is the statutory
         per-gallon rate multiplied by exactly 220. The physical figure —
         219.9692, printed on the same invoice — is used only to display an m³
         equivalent. Billing follows the utility's factor; source precedence
         puts the billing formula above a physical constant we prefer. */
      const declared = c.volume_unit ?? 'm3';
      const unit = (conversion && conversion.unit === declared)
        ? { m3_per_unit: conversion.m3_per_unit, label: conversion.note ?? declared }
        : VOLUME_UNITS[declared];
      if (!unit) throw new EngineError('spec', `component "${c.id}" declares unknown volume unit "${c.volume_unit}"`);
      for (const period of schedule) {
        let blocks = c.seasonal ? c.seasonal[String(period.month)] : c.blocks;
        if (!blocks) throw new EngineError('9.1', `component "${c.id}" has no blocks for ${period.label}`);
        /* Hong Kong's tiers are defined per 121.64 days and prorate to the
           actual days between two meter readings, so a consumer using the same
           water over a longer period pays less. Where a tariff declares the
           period its blocks are defined over, and the schedule is running some
           other number of days, the bounds scale. The standard benchmark runs
           at exactly 121.64 days and the factor is 1; a reconciliation against
           a real reading period is where this earns its keep. */
        if (c.block_period_days && period.days && period.days !== c.block_period_days) {
          const f = period.days / c.block_period_days;
          blocks = blocks.map(b => ({ ...b,
            from: b.from == null ? b.from : b.from * f,
            to: b.to == null ? b.to : b.to * f }));
        }
        const { charge, detail } = resolveBlocks(period.volume / unit.m3_per_unit, blocks,
          c.line_rounding ?? 'round', c.block_volume_dp ?? null);
        /* One entry may stand for many identical periods. A daily allowance is
           resolved once and charged 365.2425 times; a 121.64-day billing period
           is resolved once and charged 365.2425/121.64 times. Resolving the
           blocks once per period is the whole point — thresholds that reset
           each period must not be crossed once a year. */
        total += charge * (period.repeat ?? 1);
        parts.push({ period: period.label, detail, repeat: period.repeat ?? 1 });
      }
      return { annual: total, parts };
    }
    case 'surcharge_volumetric': {
      if (c.rate === null || c.rate === undefined) throw new EngineError('9.1', `surcharge "${c.id}" has no rate`);
      return { annual: c.rate * scheduleAnnualVolume(schedule), parts: [] };
    }
    case 'fixed': {
      /* An unresolved component is a distinct state from a missing one.
         It is declared, it blocks publication, and it names what is unknown. */
      if (c.unresolved === true) {
        const e = new EngineError('9.1',
          `component "${c.id}" is unresolved: ${c.unresolved_note ?? 'no official mapping'}. ` +
          `An unfound component is not a zero component.`);
        e.unresolved = c.id;
        throw e;
      }
      if (c.amount === null || c.amount === undefined) throw new EngineError('9.1', `fixed charge "${c.id}" has no amount`);
      /* Sydney bills its metered water service charge per 92-day quarter and
         accrues it daily, so the number of such charges in a year is not 4.
         A charge declared in days is annualised by days, from the one declared
         year length — never by assuming four quarters make a year. */
      const perYear = c.period === 'days'
        ? (c.period_days
            ? METHODOLOGY.days_in_year / c.period_days
            : (() => { throw new EngineError('spec',
                `fixed charge "${c.id}" is billed in days but declares no period_days`); })())
        : { annual: 1, quarterly: 4, monthly: 12 }[c.period];
      if (!perYear) throw new EngineError('spec', `fixed charge "${c.id}" has unknown period "${c.period}"`);
      /* A reconciliation run covers one billing period, not a year — and not
         necessarily a month either. Sydney's typical bill is a 92-day quarter,
         and dividing the quarterly service charge into a monthly slice put the
         check A$145 below the publisher's own figure. Where the run declares
         its own length, the charge is prorated to it. */
      if (schedule[0]?.reconciliation) {
        const days = schedule[0].days;
        if (days) {
          const chargePeriodDays = c.period === 'days' && c.period_days
            ? c.period_days
            : METHODOLOGY.days_in_year / perYear;
          return { annual: c.amount * (days / chargePeriodDays), parts: [] };
        }
        return { annual: c.amount * (perYear / 12), parts: [] };
      }
      return { annual: c.amount * perYear, parts: [] };
    }
    case 'rebate': {
      // Rule 3.1 — three conditions, all required.
      const t = c.universality ?? {};
      const universal = t.automatic === true && t.all_accounts_of_class === true && t.standing_feature === true;
      if (!universal) {
        return { annual: 0, excluded: true, reason: 'fails the universality test in Rule 3.1; shown as an affordability note' };
      }
      return { annual: -Math.abs(c.amount * ({ annual: 1, quarterly: 4, monthly: 12 }[c.period] ?? 12)) , parts: [] };
    }
    case 'tax_percent':
      return null; // resolved after its base is known
  }
}

/* ── temporary policy relief ─────────────────────────────
   Tokyo waived the basic water charge outright for four months of 2026. Both
   figures are real and they differ by a factor of two and a half, so the record
   has to carry both:

     payable      what the household is billed while the relief runs
     structural   what the standing tariff charges

   The headline is the payable figure — the Index reports what a household pays.
   The comparable figure is the structural one, because a four-month waiver
   compared against a city with no waiver measures policy, not water. So a city
   under live relief is barred from the UWTI base basket: a frozen denominator
   must not embed somebody's temporary budget decision, which will expire while
   the base does not. */
export function withRelief(tariff, { apply }) {
  const rel = tariff.temporary_policy_adjustments ?? [];
  if (!rel.length) return tariff;
  let out = { ...tariff, components: tariff.components.map(c => ({ ...c })) };
  for (const p of rel) {
    if (p.affects_payable_price !== true) continue;
    if (!apply) continue;
    if (p.type !== 'basic_charge_waiver')
      throw new EngineError('spec', `unsupported temporary policy type "${p.type}"`);
    const target = out.components.find(c => c.id === p.component_id);
    if (!target) throw new EngineError('spec',
      `temporary policy targets unknown component "${p.component_id}"`);
    target.amount = 0;
    target.rate_display = `${target.rate_display ?? ''} — waived ${p.effective_from} to ${p.effective_to}`.trim();
    target.waived = true;
  }
  return out;
}

/** Both readings of a tariff under temporary relief, in one call. */
export function calculateBothPrices(tariff) {
  const rel = (tariff.temporary_policy_adjustments ?? [])
    .filter(p => p.affects_payable_price === true);
  const structural = calculateBill(withRelief(tariff, { apply: false }));
  if (!rel.length) return { payable: structural, structural, relief: false };
  return {
    payable: calculateBill(withRelief(tariff, { apply: true })),
    structural,
    relief: true,
    policies: rel,
    /* Not a suggestion. §5 admits Grade A only where the figure is comparable,
       and a waived charge is not. */
    basket_eligible: false,
    basket_reason: 'temporary policy relief is live; the comparable figure is the structural one'
  };
}

/* ── main calculation ───────────────────────────────────── */
export function calculateBill(tariff) {
  if (tariff.scenario !== SCENARIO.id) {
    throw new EngineError('spec', `tariff targets scenario "${tariff.scenario}", engine implements ${SCENARIO.id}`);
  }
  /* §5 assigns a grade per metric, and the refusal has to follow. Perth is
     Grade A on supply and C on services because sewerage rests on a property
     valuation; Toronto is the exact inverse — C on supply because no supply-only
     rate exists, A on services because the combined rate is a clean function of
     volume. Refusing the whole city when one metric is Grade C would throw away
     a figure the methodology says is publishable, and the city-level `grade`
     field alone cannot express that. */
  const metricGrade = m => tariff.metric_grades?.[m]?.grade
    ?? (m === 'total_water_services' ? (tariff.services_grade ?? tariff.grade) : tariff.grade);
  const anyPublishable = ['water_supply', 'total_water_services']
    .some(m => metricGrade(m) !== 'C');
  if (!anyPublishable) {
    throw new EngineError('5.1',
      'Grade C on every metric: a standardised comparative bill may not be published' +
      (tariff.grade_reason ? ` — ${tariff.grade_reason}` : ''));
  }
  if (tariff.grade === 'C' && metricGrade('water_supply') === 'C'
      && tariff.streams_separable !== false) {
    /* A Grade C supply metric with separable streams is the old case: nothing
       standardisable, and the record should not be quietly billed. */
    throw new EngineError('5.1',
      'Grade C: a standardised comparative bill may not be published' +
      (tariff.grade_reason ? ` — ${tariff.grade_reason}` : ''));
  }
  /* A tariff whose published rate does not separate supply from wastewater
     cannot yield a supply figure, and the engine will not invent one by
     apportionment. Toronto publishes a single combined consumption rate; that
     is a Total Water Services number and nothing else. */
  if (tariff.combined_supply_and_wastewater === true && tariff.allow_combined !== true) {
    throw new EngineError('3.3',
      'the published rate combines supply and wastewater; a supply-only bill may not be '
      + 'derived from it. Call with allow_combined to compute total water services only.');
  }
  /* §2.5 — a Grade A observation names the connection the utility designated,
     and cites where that designation is published. Tokyo's 20 mm and Seoul's
     15 mm are scope, not assumption, only because this rule exists. */
  if (tariff.grade === 'A') {
    const rc = tariff.reference_connection;
    if (!rc || !rc.size)
      throw new EngineError('2.2', 'Grade A requires a declared reference_connection');
    if (!rc.source_id)
      throw new EngineError('2.2',
        `reference connection "${rc.size}" has no source; §2.5 bars Grade A without one`);
  }

  /* §7.6 — every declared potential component is observed, confirmed absent
     with a source, or unresolved. Unresolved bars Grade A; nothing is zero by
     omission. */
  for (const c of tariff.component_states ?? []) {
    if (!METHODOLOGY.component_states.includes(c.status))
      throw new EngineError('7.6', `component "${c.component}" has unknown status "${c.status}"`);
    /* v1.5 split blockers into material and validation gap, and only the gate
       was taught the difference. The engine barred Grade A on any open
       question at all, including one that cannot change the number — Sydney's
       trigger mechanics at 92% storage, thirty-two points from the threshold.
       Two rules for one distinction is how a methodology drifts from its own
       code, which is the failure this project keeps correcting. */
    if (c.status === 'unresolved' && tariff.grade === 'A'
        && c.blocker_class !== 'validation_gap'
        && !(c.affects_metric && c.affects_metric !== 'water_supply'))
      throw new EngineError('7.6',
        `component "${c.component}" is unresolved; §7.6 bars Grade A`);
    if (c.status === 'confirmed_absent' && !c.source_id)
      throw new EngineError('7.6',
        `component "${c.component}" is declared absent with no source. `
        + 'A confirmed absence is a claim and needs one; otherwise it is a silent zero.');
  }

  const recon = tariff.reconciliation_volume_m3 ?? null;
  const months = recon != null ? 1 : 12;
  const schedule = volumeSchedule(tariff.shape, recon, tariff, tariff.measure_at_monthly_m3 ?? null);
  const evaluated = new Map();
  const lines = [];

  // pass 1 — everything except taxes
  for (const c of tariff.components) {
    if (c.kind === 'tax_percent') continue;
    const r = evaluateComponent(c, schedule, tariff.volume_conversion);
    evaluated.set(c.id, r.annual);
    lines.push({
      id: c.id, name: c.name, stream: c.stream, kind: c.kind,
      rate_display: c.rate_display ?? null,
      annual: round2(r.annual), monthly: round2(r.annual / months),
      excluded: r.excluded ?? false, reason: r.reason ?? null,
      assumed: c.assumed === true
    });
  }

  // pass 2 — taxes, applied over a declared base, in declared order
  for (const c of tariff.components) {
    if (c.kind !== 'tax_percent') continue;
    if (c.rate === null || c.rate === undefined) throw new EngineError('9.1', `tax "${c.id}" has no rate`);
    if (!Array.isArray(c.base) || c.base.length === 0) {
      throw new EngineError('spec', `tax "${c.id}" must declare its base explicitly`);
    }
    let base = 0;
    for (const ref of c.base) {
      if (!evaluated.has(ref)) throw new EngineError('spec', `tax "${c.id}" references unknown component "${ref}"`);
      base += evaluated.get(ref);
    }
    const annual = base * c.rate;
    evaluated.set(c.id, annual);
    lines.push({
      id: c.id, name: c.name, stream: c.stream, kind: c.kind,
      rate_display: c.rate_display ?? `${(c.rate * 100).toFixed(0)}%`,
      annual: round2(annual), monthly: round2(annual / months),
      base: c.base, excluded: false, reason: null, assumed: c.assumed === true
    });
  }

  // headline figures
  const sum = stream => tariff.components
    .filter(c => c.stream === stream)
    .reduce((t, c) => t + (evaluated.get(c.id) ?? 0), 0);

  const inseparable = tariff.streams_separable === false;
  /* Rule 3.3 has two distinct cases and they must not be conflated:
       inseparable        — the utility does not split the streams; Water Supply is null
       not_established    — wastewater exists but has not been sourced; Total Services is null
     An unfound component is never a zero component. */
  /* Two different reasons a services figure may be absent, and they are not
     the same claim. Either the wastewater component has not been found, or it
     has been found and cannot be standardised — Perth assesses sewerage on the
     property's Gross Rental Value, by law, and a property valuation is not a
     function of water. Without this, a city with no modelled wastewater
     component silently reports Total Water Services equal to Water Supply,
     which is the most misleading number the engine could produce. */
  const wwMissing = tariff.wastewater_status === 'not_established'
    || tariff.wastewater_grade === 'C';
  /* A minimum charge is a floor on the bill, not a component of it. New York
     sets one at USD 0.49 a day for water service — frozen since FY2017 — and it
     does not bind at the reference volume, where usage of USD 340.08 a year
     exceeds the floor of USD 178.97. It binds below about 7.9 m³ a month, which
     is why the curve is not flat at 5 m³ even though the rate never changes.
     Modelling it as a fixed charge would have added it to every bill; modelling
     it as absent would have understated every small one. */
  let floorTopUp = 0, floorApplied = false;
  const mc = tariff.minimum_charge;
  if (mc) {
    if (!mc.source_id) throw new EngineError('9.3', 'a minimum charge needs a source');
    const perYear = mc.period === 'days' ? METHODOLOGY.days_in_year
      : { annual: 1, monthly: 12, quarterly: 4 }[mc.period];
    if (!perYear) throw new EngineError('spec', `minimum charge has unknown period "${mc.period}"`);
    const months = schedule[0]?.reconciliation ? 1 : 12;
    const scale = schedule[0]?.reconciliation
      ? (schedule[0].days ? schedule[0].days / METHODOLOGY.days_in_year : 1 / 12) : 1;
    const floor = round2(mc.amount * perYear * scale);
    const base = sum(mc.stream ?? 'water');
    if (base < floor) { floorTopUp = round2(floor - base); floorApplied = true; }
  }
  const sumFloored = stream =>
    stream === (mc?.stream ?? 'water') ? sum(stream) + floorTopUp : sum(stream);
  const waterAnnual = inseparable ? null : sumFloored('water');
  /* Where wastewater is a percentage of the water charge, the floor lifts it
     too — the percentage applies to what is billed, not to what usage alone
     would have been. */
  const wwFactor = tariff.components.find(c => c.kind === 'tax_percent'
    && c.stream === 'wastewater' && (c.base ?? []).some(b => b !== 'wastewater'));
  const servicesAnnual = wwMissing ? null
    : sumFloored('water') + sum('wastewater')
      + (floorApplied && wwFactor ? round2(floorTopUp * wwFactor.rate) : 0);

  /* Rule 9.1 — an *assumed* component forbids grade A, because the bill could
     be another number. A *scope* component does not: the bill is exactly this
     number, for a reference customer defined narrowly and disclosed. */
  const assumedIds = tariff.components
    .filter(c => c.assumed === true && c.scope !== true).map(c => c.id);
  if (tariff.grade === 'A' && assumedIds.length > 0) {
    throw new EngineError('9.1', `grade A declared but components are assumed: ${assumedIds.join(', ')}`);
  }

  const result = {
    scenario: recon != null ? `${SCENARIO.id} · reconciliation run, not publishable` : SCENARIO.id,
    methodology_version: SCENARIO.methodology_version,
    city: tariff.city,
    utility: tariff.utility,
    currency: tariff.currency,
    grade: tariff.grade,
    effective_from: tariff.effective_from,
    effective_to: tariff.effective_to ?? null,
    streams_separable: !inseparable,
    minimum_charge: mc ? { applied: floorApplied, top_up: floorTopUp,
      note: floorApplied ? 'usage fell below the floor; the bill is the minimum'
        : 'the floor does not bind at this volume' } : null,
    water_supply: {
      annual: waterAnnual === null ? null : round2(waterAnnual),
      monthly: waterAnnual === null ? null : round2(waterAnnual / months)
    },
    total_services: {
      annual: servicesAnnual === null ? null : round2(servicesAnnual),
      monthly: servicesAnnual === null ? null : round2(servicesAnnual / months),
      withheld_because: !wwMissing ? null
        : tariff.wastewater_grade === 'C'
          ? (tariff.wastewater_grade_reason
             ?? 'the wastewater charge cannot be standardised under the current methodology')
          : 'wastewater component not established from a primary source'
    },
    /* Over the volume actually measured, not over the scenario's 180 m³ — the
       two differ whenever the curve is asking about another point. */
    measured_annual_m3: scheduleAnnualVolume(schedule),
    effective_per_m3: servicesAnnual === null ? null
      : round2(servicesAnnual / scheduleAnnualVolume(schedule)),
    components: lines,
    assumptions: tariff.components.filter(c => c.assumed && c.scope !== true)
      .map(c => ({ id: c.id, note: c.assumption_note ?? null })),
    scope_disclosures: [
      ...(tariff.scope_disclosures ?? []),
      ...tariff.components.filter(c => c.scope === true).map(c => c.scope_note).filter(Boolean)
    ],
    excluded: lines.filter(l => l.excluded).map(l => ({ id: l.id, name: l.name, reason: l.reason }))
  };

  result.calculation_hash = hashCalculation(tariff, result);
  return result;
}

/* ── Rule 9.2 — reproducible hash of inputs + outputs ───── */
/* Rule 7.3 — the back-series is computed, never estimated between points.
   A gap in the published schedules stays a gap. */
export function computeSeries(tariffs, calc) {
  return tariffs
    .map(t => ({ effective_from: t.effective_from, bill: calc(t) }))
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from));
}

export function hashCalculation(tariff, result) {
  const payload = JSON.stringify({
    scenario: SCENARIO.id,
    methodology: SCENARIO.methodology_version,
    tariff: canonical(tariff),
    water_supply: result.water_supply,
    total_services: result.total_services
  });
  return 'sha256:' + createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((o, k) => { o[k] = canonical(v[k]); return o; }, {});
  }
  return v;
}
