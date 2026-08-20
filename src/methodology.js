/**
 * The methodology, as constants.
 *
 * The frozen document and the running engine each used to hold their own copy
 * of the same numbers, and they drifted: the document graded London B while
 * the engine graded it A, and nothing in the repository noticed for weeks.
 * A frozen rule that only exists as prose is not frozen. It is unread.
 *
 * Every declared value below appears once here, is quoted by the document in
 * its `declared` block, and is asserted against both by
 * test/methodology-sync.test.js. Changing one without the others fails the
 * build. That is the whole point: the document cannot silently stop being
 * true, because the test reads it.
 */

export const METHODOLOGY = {
  version: 'v1.9',
  supersedes: 'v1.8',
  frozen_on: '2026-08-18',
  document: 'docs/methodology-v1.9.md',

  /* §13.1 — the register rule, extended from prices to evidence.
     Rule 13 forbade calling a city cheap, efficient or best on the strength of
     a small bill, and covered half the exposure. This version of the document
     shipped a section headed "The weakest instance is named" about Abu Dhabi
     and a correction entry calling Hong Kong the best-evidenced record while
     the least stable cities stayed in place. All of it was true, all of it was
     about our own capture rather than about anybody's water, and all of it was
     wrong to publish: the subject of the sentence was a city name, and that is
     the part that gets quoted. */
  register: {
    comparative_predicates_forbidden: true,
    /* v1.9 narrowed the scope from "anything TWJ publishes" to the Index. The
       wider version was written and never enforced: the check reads the Index
       records and the corrections log and has never read an article, so the
       rule claimed a reach its own guard did not have. Rather than widen the
       guard, the rule is narrowed to what it is actually for — see scope. */
    applies_to: 'the Index: city records, grades, withholding and continuity reasons, the '
      + 'corrections log and the methodology document',
    rule_13_1: 'In the Index, a comparative or superlative predicate may not take a city, a '
      + 'utility or a country as its subject. Not cheapest, and equally not weakest, thinnest, '
      + 'best-evidenced, least stable or most opaque. The evidence is published in its place: a '
      + 'date is shorter, is checkable, cannot age into a falsehood, and leaves the judgement to '
      + 'the reader.',
    why_not_the_journal: 'The Index is an instrument and the journal is journalism, and they '
      + 'are not held to one standard because they do not make one kind of claim. An Index record '
      + 'says what a household pays and how far the evidence reaches; a comparative adjective '
      + 'there is the instrument editorialising about its own subject. An article is an argument, '
      + 'attributed and sourced, and an argument that may not characterise anything is not an '
      + 'argument. Articles are governed by Rule 13 and by the evidence standard, which forbid '
      + 'calling water cheap or a utility deceptive and require a source for a comparison — not '
      + 'by 13.1.',
    not_a_verdict: 'A grade is a rule applied to a record, computed identically everywhere, and '
      + 'publishing it is the function of the Index. The line is between a rule applied to a '
      + 'record and an adjective applied to a place.'
  },

  /* §3.10 — a tariff is in force until it is superseded, and established as in
     force only to the day somebody looked.
     This was already the practice and had never been written down, which meant
     it could not be checked and could not be argued with. Hong Kong is Grade A
     on an instrument effective 16 February 1995 with no expiry; a rule
     requiring a document dated on the valuation date would have removed the
     best-evidenced record in the Index. Writing it makes the practice
     falsifiable and puts a date on the claim instead of leaving it implied. */
  tariff_validity: {
    rule: 'A tariff stated by an authoritative instrument with an effective_from '
      + 'and no stated expiry remains applicable until superseded by another '
      + 'authoritative instrument. A document dated on the valuation date is not required.',
    conditions: [
      'an authoritative instrument states the rate and the date it took effect',
      'that instrument states no expiry, or an expiry after the valuation date',
      'a recorded search for a superseding instrument, covering the period from '
        + 'effective_from to the valuation date, found none',
      'an archived source accessed on or after the valuation date shows the rate still in force'
    ],
    supersession_is_a_search: 'Condition 3 is a claim about a search and not about silence. '
      + 'Not having found a superseding instrument is not the same as having looked, so the '
      + 'search is recorded with its date, its scope and its finding, or the condition fails.',
    valid_through_rule: 'A tariff is established as in force through the accessed_at date of '
      + 'the source that shows it in force, and no further. The date is published.',
    applies_to: 'any tariff with no effective_to whose effective_from precedes the valuation date'
  },

  /* §2.7 — the observation unit is not a city.
     A tariff is set by a jurisdiction, a utility, a service area and a customer
     class. A city is a display label and a public URL, and the two coincide
     often enough to be mistaken for the same thing until they do not: Riyadh and
     Jeddah share one national schedule, and a metropolitan area with several
     providers is the inverse. Migrated at six published observations rather than
     at thirty, because the cost of the change is in the number of records. */
  observation_unit: [
    'tariff_jurisdiction', 'utility', 'service_area',
    'customer_class', 'tariff_schedule', 'effective_period', 'metric'
  ],
  city_is: 'a display layer, and the public identifier. Never the economic entity.',

  /* §3.9 — the curve is the primary data object.
     Empirically, not by preference: Hong Kong is the cheapest city in the set at
     5 m³ and among the dearest at 25; Perth and Sydney change places between the
     two, in one currency and one country. New York looked flat and is not, once
     a minimum bill is modelled.

     15 m³ is not wrong at 15 m³ — it ranks the cities correctly there. What a
     single point cannot do is show whether that ranking is a stable relation
     between tariff systems or an artefact of where it was measured. So the
     canonical figure stays canonical and stops being the only thing published. */
  data_object_hierarchy: [
    'residential water price curve — the primary object',
    'standardized effective water price at 15 m³ — the canonical comparable observation',
    'standardized monthly bill at 15 m³'
  ],
  curve_points_published: [5, 10, 15, 20, 25, 30, 40],
  canonical_point_m3: 15,
  canonical_point_claim: 'TWJ compares tariff systems as curves. 15 m³ is the '
    + 'standardized reference point on that curve, not a claim about universal '
    + 'household consumption and not a claim that one point describes a system.',

  /* §7.7 — the component ontology, because these act differently on the curve.
     A minimum bill is not a fixed charge: a fixed charge is added to every bill,
     a minimum replaces small ones. Modelled wrongly either way, New York's curve
     is wrong at 5 m³ and right at 15, which is the hardest kind of error to see. */
  component_ontology: [
    'volumetric_charge', 'block_charge', 'fixed_recurring_charge',
    'minimum_bill', 'minimum_consumption_charge', 'meter_service',
    'resource_or_conservation_levy', 'surcharge', 'tax', 'rebate', 'waiver',
    'wastewater_collection_treatment', 'stormwater', 'property_based_water_service'
  ],
  minimum_bill_rule: 'payable = max(calculated bill, minimum bill). A minimum is a '
    + 'floor on the bill, never an item in it.',

  /* §3.8 — a tariff whose applicable rate depends on the physical state of the
     system. Sydney publishes two usage rates and a 60/70 storage trigger, and
     which one applies is not a fact about the tariff document at all.

     This is NOT a temporary policy adjustment and the two must not share a
     field. Tokyo's basic-charge waiver is a discretionary act with an end date:
     it moves the payable price and leaves the structural tariff untouched. A
     drought rate is part of the tariff architecture — an existing regulatory
     rule firing on a measured condition — so it moves both. Modelling the
     drought as a waiver would keep it out of the structural price and out of
     the index, which is exactly backwards. */
  tariff_state: {
    is_structural: true,
    distinct_from: 'temporary_policy_adjustment, which affects payable only',
    applicable_rate_rule: 'tariff rule + authoritative dated state observation = applicable rate',
    missing_state: 'the applicable rate is unresolved; grade at most B; not basket eligible',
    trigger_provenance: 'a tariff-state trigger must come from the instrument governing '
      + 'the retail tariff, or from another instrument that one explicitly incorporates. '
      + 'WaterNSW\'s wholesale 31-day lag may not be carried into Sydney Water retail '
      + 'logic however alike the thresholds look.'
  },

  /* §5.5 — publication and index eligibility are separate questions.
     Publication asks whether a metric is provable. Index eligibility asks
     whether it is compatible with the basket. Perth's supply figure is both;
     its services figure is neither, and for a reason that is not a research
     gap. Toronto's services figure is publishable and never index-eligible. */
  eligibility: {
    publishable: 'is this metric provable from archived primary sources',
    basket_eligible: 'is this metric compatible with the index basket',
    independent: true
  },

  /* Three levels of proof were being treated as one, and only two of them are
     ours to require.

       source validity          is there an authoritative primary source
       calculation reproducibility  does the source determine our result
       external reconciliation  does the publisher independently confirm it

     The first two are mandatory. The third is not always possible: a utility
     publishes a tariff, not a worked example of somebody else's benchmark
     scenario. Making it a gate condition withheld London — a tariff with a
     stated rate, a stated fixed charge, a stated customer class and a stated
     period, from which 15 x 2.7346 + 66.87/12 follows and nothing else does.
     The rule amounted to: an official tariff is insufficient until the utility
     computes our scenario for us.

     So a blocker now has to be material: the number could actually differ. An
     absent reconciliation is a validation gap, and validation is reported
     beside the figure rather than used to suppress it. */
  blocker_classes: {
    material: 'the published number could differ depending on the answer — it holds publication',
    validation_gap: 'the number is determined; an additional independent check is '
      + 'absent. Reported, never suppressive.'
  },
  validation_levels: ['source_verified', 'calculation_verified', 'reconciled'],
  grade_a_required: [
    'primary authoritative tariff source, archived and hashed',
    'applicable customer scope established',
    'all material tariff components resolved',
    'effective date established',
    'calculation deterministic and reproducible',
    'each stored rate verifiable against its capture where the capture is machine-readable',
    'no material source conflict'
  ],
  grade_a_preferred_not_required: [
    'public calculator reconciliation',
    'publisher worked example',
    'invoice reconciliation',
    'independent second-reader review'
  ],

  /* An exhaustive schedule proves an absence. A summary page does not.
     Hong Kong's WSD page enumerates the whole of what a domestic bill can carry,
     so the missing standing charge is established. Seoul's rate table lists
     rates only, so its silence about tax proves nothing — and Tokyo is the
     demonstration: no tax line in the table, and a formula that multiplies by
     1.10. The distinction is whether the document is normatively exhaustive for
     that customer class, not whether a sentence happens to deny the charge. */
  component_absence_bases: ['explicit_statement', 'exhaustive_schedule'],

  /* §5.3 rewritten. The old rule said every refusal is shown with its reason.
     Applied to ten cities it produced a public catalogue that was mostly the
     word "withheld", which reads as a broken site rather than a careful one —
     and worse, it presented our own unfinished research as though it were a
     property of the city's water system.

     The distinction that matters is not how a refusal looks but where it comes
     from. A tariff that combines water and wastewater is a fact about Toronto.
     Two official readings of one VAT sentence is a fact about Abu Dhabi's
     source record. Neither is a fact about us. Whereas "we have not captured
     the storage figure yet" is only a fact about us, and belongs in a research
     register rather than on a city page. */
  publication_statuses: {
    published: 'a publishable metric exists and passes the publication gate',
    exception_record: 'no comparable number is published, and the reason for '
      + 'withholding is itself established by sufficient authoritative evidence '
      + 'and is methodologically informative. Public.',
    research_pending: 'withheld because TWJ\'s own evidence package is '
      + 'incomplete. Internal, and must not appear in the public city catalogue.'
  },
  withholding_origins: {
    system_structural: { public: true,
      meaning: 'the tariff system or regulatory framework itself prevents the comparison' },
    source_conflict: { public: true,
      meaning: 'authoritative sources support incompatible readings, and the conflict '
        + 'is itself established evidence' },
    twj_research_incomplete: { public: false,
      meaning: 'source capture, reconciliation, state verification or component '
        + 'verification is unfinished. Ours, not the city\'s.' }
  },
  public_withholding_rule: 'A withheld numerical result is shown publicly only where '
    + 'the reason for withholding is itself a verified characteristic of the tariff '
    + 'system, regulatory framework or authoritative source record. TWJ never presents '
    + 'incomplete internal research as an apparent property of a city\'s water system.',

  /* §9.3 — the two-person review is withdrawn, and replaced rather than deleted.
     It was a real safeguard and it had one reviewer in the whole system, so in
     practice it held three fully evidenced cities indefinitely while catching
     nothing. A rule that stalls everything is not a safeguard.
     What replaces it is weaker in one respect and stronger in another. Weaker:
     no automated check can notice that a document was misread — that is what a
     second human is for, and the loss is real and recorded here. Stronger: the
     checklist runs on every build and never forgets, and one of its conditions
     is a second independent pass that a single reviewer could not perform by
     reading more carefully — the stored rate must appear verbatim in the
     archived capture, which catches transcription between document and record. */
  publication_checklist: [
    'every rate-bearing component carries a source_id',
    'every cited source is archived under a real hash',
    'no component state is unresolved',
    'no component on a Grade A record is marked assumed',
    'each stored rate appears verbatim in its own archived capture',
    'either a reconciliation against a publisher figure passes, or the record '
      + 'states in writing that the publisher offers none',
    'the reference connection is declared with a source, or declared '
      + 'size-independent with a source'
  ],
  review_note: 'A single reader checking twice is not two readers. The checklist '
    + 'exists because that is true, not to pretend otherwise.',

  /* The index measures the structural level of residential tariff liability
     for a standard service bundle. It does not measure what water costs to
     produce, and "Water Cost Index" said that it did.

     The obvious short form, Water Tariff Index, is unusable: WTI is West Texas
     Intermediate, one of the most quoted tickers in the world, and a water
     index abbreviated into an oil benchmark would be misread by exactly the
     financial press we want citing us. Hence the U. */
  index_name: 'TWJ Urban Water Tariff Index',
  index_abbreviation: 'UWTI',
  index_renamed_from: 'TWJ Water Cost Index (WCI)',
  headline_metric_name: 'TWJ Standardized Water Price',

  /* §2 did not change, so the scenario keeps its identifier. A tariff record
     declaring TWJ-R180-v1.0 is still calculating the same household. */
  scenario_id: 'TWJ-R180-v1.0',
  annual_m3: 180,
  monthly_m3: 15,

  /* §2.5 — the reference connection.
     Tokyo at 20 mm and Seoul at 15 mm were being carried as assumptions, which
     under §5.2 forbids Grade A. They are not assumptions: the bill is exactly
     one number for a named connection size. What was missing was a rule saying
     which size, and the rule has to be tight enough that it cannot be gamed by
     picking the cheapest meter to produce a flattering price. */
  reference_connection: {
    rule: 'the standard individual residential meter or service size explicitly '
        + 'designated by the utility for an ordinary single dwelling',
    tie_break: 'where a utility identifies several ordinary residential sizes but no '
        + 'default, the smallest size explicitly documented as suitable for an '
        + 'individual dwelling is used, and printed on the city record as scope',
    no_primary_source: 'where it cannot be established from a primary source, the '
        + 'observation cannot receive Grade A',
    /* Added while implementing the rule, and a change to the wording as
       approved. Two of the five modelled cities — New York and Singapore —
       have no size parameter anywhere in the residential tariff: no standing
       charge, one volumetric rate. Requiring them to designate a size would
       withhold a fully evidenced figure over a parameter the tariff does not
       have, which is the same mistake v1.1 Rule 3.2 made and v1.1 fixed.

       It is not a loophole: size_independent is a claim about the tariff and
       needs a source establishing that residential service is billed without
       reference to connection size. An absent source is `unresolved`, not
       `size_independent`. */
    bases: ['utility_designated', 'smallest_documented', 'size_independent'],
    size_independent: 'permitted only with a source establishing that residential '
        + 'service is billed without reference to connection size',
    always_printed: true
  },

  /* §5.4 — two prices, and which one the index uses. */
  price_readings: {
    payable: 'what the standardized household is billed today, including any temporary relief',
    structural: 'the standing tariff, with explicitly temporary and time-limited relief removed',
    city_page_shows: 'payable, with the structural figure beside it and the policy named',
    basket_uses: 'structural',
    reason: 'a base period that captured a four-month waiver would embed a temporary '
          + 'budget decision in the permanent geometry of the index'
  },

  /* §7.6 — a component is never silently zero. */
  component_states: ['observed', 'confirmed_absent', 'confirmed_absent_by_exhaustive_schedule',
                     'not_applicable', 'non_standardizable', 'unresolved'],
  component_state_rule: 'observed and confirmed_absent each require a source_id; '
      + 'unresolved is a blocker and bars Grade A. Nothing defaults to zero.',

  /* One year length, declared once.
     The city expansion draft used 365 to annualise Sydney's 92-day service
     charge and 365.2425 to derive Abu Dhabi's daily volume and Hong Kong's
     121.64-day period. Two constants in one calculation standard is one too
     many: it moves Sydney in the fourth significant figure and, worse, makes
     the standard unreproducible by anyone who picks the other one.
     365.2425 is the Gregorian mean year and the figure Hong Kong's own
     four-month period of 121.64 days is derived from — 365.2425 ÷ 3. */
  days_in_year: 365.2425,
  days_in_month: 365.2425 / 12,

  /* Two exceptions, both narrower than the rule.
     Where a regulation defines the billing period itself, that duration governs
     — Hong Kong's statutory 121.64 days is not replaced by a third of our mean
     year. And a reconciliation against a real invoice uses the invoice's own
     dates, because it is checking a bill that was actually issued, not
     computing a benchmark. */
  time_convention_exceptions: [
    'a regulator-defined billing-period duration governs over days_in_year',
    'an invoice reconciliation uses the actual invoice period dates'
  ],

  /* §5 — the grade follows uncertainty alone. */
  u_grade_a: 0,
  u_grade_b_ceiling: 1,

  /* §7.1 — a published bill may rest on tier 1 or 2 and nothing lower. */
  max_source_tier: 2,

  /* §7.5 — when two official expressions of one rate disagree. */
  source_precedence: [
    'statutory formula',
    'official billing formula',
    'invoice rate',
    'rounded presentation table',
    'derived secondary rate'
  ],

  /* §2.4 — the denominator is not frozen, and the reason is operational. */
  base_period: 'TWJ-2026',
  base_month: null,
  /* Naming Dubai without saying why reads as though one city were special. It
     is not special; it is the binding constraint, and saying so turns a fact
     about DEWA into a fact about the basket. */
  base_month_blocker:
    'The basket month can be fixed only when every constituent is evidenced for '
    + 'the same month. In the current basket, Dubai is the binding constraint: '
    + 'DEWA sets its fuel surcharge monthly and publishes only the month in force, '
    + 'so the Dubai record is evidenced for August 2026 and nothing held here '
    + 'evidences July. The base month is set when the basket is real, not before.'
};

/* §10 — the acceptance targets, in one place rather than three.
   A figure here is what a reader is entitled to reproduce. */
export const FIXTURES = {
  dubai: { tariff: 'dubai-dewa-2026-08', grade: 'A', supply: 143.85, services: 209.85, per_m3: 9.59 },
  london: { tariff: 'london-thames-2026-04-01', grade: 'A', supply: 46.59, services: 79.35, per_m3: 3.106 },
  newyork: { tariff: 'newyork-waterboard-2026-07-01', grade: 'A', supply: 28.34, services: 73.40, per_m3: 1.889 },
  /* Grade B since 17 August 2026, when PUB's Annex A was obtained. The bill is
     computed and its fixture passes; publication additionally waits on a
     second reader under Rule 9.3, which is a gate condition rather than an
     arithmetic one. */
  singapore: { tariff: 'singapore-pub-2025-04-01', grade: 'B', supply: 35.07, services: 52.89, per_m3: 2.338 }
};
