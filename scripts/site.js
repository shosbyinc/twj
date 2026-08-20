#!/usr/bin/env node
/**
 * Emits the public payload the site renders from.
 * Nothing on the site is typed by hand: every figure here is produced by the
 * engine from a stored tariff, so the page and the repository cannot drift.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateBill, calculateBothPrices } from '../src/engine.js';
import { tariffCurve, publishedVsEffective } from '../src/curve.js';
import { frontmatter, render, readingMinutes, READING_WPM } from '../src/markdown.js';
import { archiveStatus, isArchived } from '../src/publication.js';
import { acceptCity, validationOf, validThrough } from '../src/acceptance.js';
import { METHODOLOGY } from '../src/methodology.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
/* Display rounding, and it must not manufacture a value. Math.round(null) is 0,
   which is how "we cannot say" became "nothing beyond the rate" for Hong Kong
   and Tokyo. Non-numbers pass through as null and the renderer shows them as
   withheld. */
const r2 = n => Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
const r3 = n => Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;

const sources = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json')).map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));

const cities = readdirSync(join(ROOT, 'data/cities')).filter(f => f.endsWith('.json'))
  .map(f => read(`data/cities/${f}`))
  .filter(c => c.tariff_id)
  .map(c => {
    const t = read(`data/tariffs/${c.tariff_id}.json`);
    /* The acceptance gate runs before the arithmetic. A city that fails it is
       not dropped and not quietly shipped: it appears with its reasons where
       the number would be. */
    const gate = acceptCity(c, sources, t);
    const gateReasons = [...gate.problems, ...(gate.metric_problems.water_supply ?? [])];
    /* A grade C tariff produces no comparative bill. The city still appears —
       with what is known, and with the reason it cannot be priced. */
    if (t.grade === 'C' || !gate.publishable) {
      /* A city can be unpriceable on one metric and Grade A on the other, and
         until now the payload treated "no supply price" as "no figures". That
         is Toronto exactly: its instrument prices water and wastewater in one
         rate, so the supply figure cannot exist — while the combined figure is
         a clean function of volume, established from a by-law, with no fixed
         charge and no tax. Withholding it because the other metric is empty
         would be the Index refusing to publish what it has proved. */
      const exceptionBill = gate.publishable ? calculateBill(t) : null;
      const servicesOk = exceptionBill
        && exceptionBill.total_services.monthly != null
        && ![t.metric_eligibility, t.metric_grades]
             .some(d => d?.total_water_services?.publishable === false);
      return { id: c.id, name: c.name, country: c.country, utility: c.utility,
        /* Present only where one metric survives the other's absence. */
        services_month: servicesOk ? exceptionBill.total_services.monthly : null,
        services_year: servicesOk ? exceptionBill.total_services.annual : null,
        services_publishable: Boolean(servicesOk),
        services_grade: t.metric_grades?.total_water_services?.grade ?? null,
        services_note: c.services_note ?? null,
        lat: c.coordinates?.[0], lon: c.coordinates?.[1], currency: t.currency,
        symbol: { SGD: 'S$', GBP: '£', USD: '$', AED: 'AED' }[t.currency] ?? t.currency,
        grade: t.grade === 'C' ? 'C' : t.grade, not_priced: true,
        /* Two different states were sharing one label. A grade C city cannot
           be priced at all; a city withheld by the gate has a computed figure
           that is not yet allowed out. Saying "not yet priced" of the second
           is untrue, and the reader can tell. */
        withheld_by_gate: gateReasons.length > 0,
        /* §5.3 (v1.4). Where the refusal comes from decides whether a reader
           sees it. A structural fact about the tariff is publishable; our own
           unfinished capture is not. */
        publication_status: c.publication_status ?? 'research_pending',
        validation: validationOf(t, sources),
        withholding_origin: c.withholding_origin ?? 'twj_research_incomplete',
        public_headline: c.public_headline ?? null,
        public_statement: c.public_statement ?? null,
        withholding_reason_public: c.withholding_reason_public ?? null,
        evidence_status: c.evidence_status ?? null,
        uwti_eligible: c.uwti_eligible ?? false,
        /* A reader of an exception record gets the publisher-facing statement.
           The gate's own wording is internal and stays in gate_problems. */
        blocked_by: c.public_statement
          ?? (gateReasons.length
              ? `Withheld by the acceptance gate — ${gateReasons.join('; ')}`
              : (c.blocked_by ?? t.grade_reason)),
        gate_problems: gateReasons,
        grade_reason: t.grade_reason ?? null,
        mix: c.supply?.categories ?? [], mix_note: c.supply?.note ?? null,
        sources: (c.sources ?? []).map(id => ({ id, publisher: sources[id]?.publisher,
          title: sources[id]?.title, kind: sources[id]?.archive_kind ?? 'none',
          archived: isArchived(sources[id]) })),
        /* A withheld city still declares its reference connection. The
           disclosure explains what was measured; being unable to publish the
           figure is not a reason to stop saying what the figure describes. */
        reference_connection: t.reference_connection ?? null,
        archive_status: archiveStatus(c, sources),
        archived: archiveStatus(c, sources).archived,
        archive_kinds: [...new Set((c.sources ?? []).map(id => sources[id]?.archive_kind ?? 'none'))],
        tariff_effective: t.effective_from,
      valid_through: validThrough(t, sources),
        /* §3.10 — how far the evidence reaches, published rather than implied. */
        valid_through: validThrough(t, sources) };
    }
    /* §5.4 — a city under live relief has two real prices and the record has
       carried both since Tokyo was drafted. Until Tokyo cleared the gate this
       branch had never run, so the site published the standing tariff and
       called it the price. The headline is what the household is billed; the
       comparable figure is the standing tariff, and it is the comparable one
       that goes on the map, because a waiver compared against a city with no
       waiver measures a budget decision rather than water. */
    const both = calculateBothPrices(t);
    const bill = both.structural;
    const curve = tariffCurve(t);
    const at15 = curve.points.find(p => p.m3 === 15);
    const published = t.components.find(x => x.kind === 'volumetric' && x.stream === 'water');
    const pubRate = published?.volume_unit === 'imperial_gallon'
      ? published.blocks[0].rate * 219.9692
      : published?.volume_unit === 'ccf'
        ? published.blocks[0].rate / 2.8316846592
        : published?.blocks[0].rate;
    const gap = publishedVsEffective(pubRate, at15.supply_per_m3);
    /* A gap within a rounding step is not a gap — but an undefined gap is not a
       small one. Math.abs(null) is 0, so this line was the last of the three
       places that turned "we cannot say" into "nothing beyond the rate". */
    if (gap.percent != null && Math.abs(gap.percent) < 0.1) gap.percent = 0;
    const services = bill.total_services.monthly;
    const SERVICES_WITHHELD = [t.metric_eligibility, t.metric_grades]
      .some(d => d?.total_water_services?.publishable === false);
    const wwShare = services ? r2(((services - bill.water_supply.monthly) / services) * 100) : null;

    return {
      id: c.id, name: c.name, country: c.country, utility: c.utility,
      lat: c.coordinates?.[0], lon: c.coordinates?.[1],
      currency: t.currency, symbol: { SGD: 'S$', GBP: '£', USD: '$', AED: 'AED' }[t.currency] ?? t.currency,
      grade: bill.grade,
      price_m3: at15.supply_per_m3,
      /* Null everywhere except under live relief, so a reader who sees it knows
         the city has two prices and which one they are looking at. */
      relief: both.relief ? {
        live: true,
        headline: 'payable',
        comparable: 'structural',
        payable_month: both.payable.water_supply.monthly,
        payable_m3: r3(both.payable.water_supply.monthly / (METHODOLOGY.annual_m3 / 12)),
        structural_month: both.structural.water_supply.monthly,
        structural_m3: at15.supply_per_m3,
        factor: r2(both.structural.water_supply.monthly / both.payable.water_supply.monthly),
        basket_eligible: false,
        basket_reason: both.basket_reason,
        policies: both.policies.map(p => ({
          type: p.type, from: p.effective_from, to: p.effective_to,
          rule: p.amount_or_rule, application_required: p.application_required ?? null,
          funded_by: p.funded_by ?? null, period_note: p.period_note ?? null,
          issuer_characterisation: p.issuer_characterisation ?? null,
          repetition_note: p.repetition_note ?? null, source_id: p.source_id ?? null
        }))
      } : null,
      published_m3: r2(pubRate),
      gap_percent: gap.percent,
      bill_month: bill.water_supply.monthly,
      bill_year: r2(bill.water_supply.annual),
      bill_day: r2(bill.water_supply.annual / 365.2425),
      services_month: services,
      ww_share: wwShare,
      curve: { points: curve.points.map(p => [p.m3, p.supply_per_m3]),
               shape: curve.shape.label, ratio: curve.shape.ratio, published: r2(pubRate) },
      components: bill.components.filter(x => !x.excluded)
        .map(x => ({ name: x.name, rate: x.rate_display, monthly: x.monthly, stream: x.stream })),
      scope: bill.scope_disclosures ?? [],
      transparency: t.transparency ?? {},
      mix: c.supply?.categories ?? [],
      mix_note: c.supply?.note ?? null,
      sources: (c.sources ?? []).map(id => ({
        id, publisher: sources[id]?.publisher, title: sources[id]?.title,
        archived: isArchived(sources[id])
      })),
      reference_connection: t.reference_connection ?? null,
      /* A city that clears the gate is published; the status is not stored on
         the record, it is the outcome of the checklist. */
      publication_status: 'published',
      /* Grade says how certain the number is; validation says how many
         independent ways it has been shown. Both travel with the figure. */
      validation: validationOf(t, sources),
      withholding_origin: null,
      /* Live relief bars the base basket whatever the grade — §5.4. */
      uwti_eligible: t.grade === 'A' && !both.relief,
      /* Provenance is asked per metric. A document behind the sewerage rate
         cannot withhold the water supply figure. */
      archive_status: archiveStatus(c, sources),
      archived: archiveStatus(c, sources).archived,
      gate_problems: [],
      archive_kinds: [...new Set((c.sources ?? []).map(id => sources[id]?.archive_kind ?? 'none'))],
      reconciled: c.reconciled_against ?? t.validated_against ?? null,
      metric_grades: t.metric_grades ?? null,
      metric_eligibility: t.metric_eligibility ?? null,
      /* Publication is per metric. A city may ship its supply figure while its
         services figure waits for a document. */
      /* Two field names have been asking one question. `metric_grades` came
         first and is still what Dubai and Toronto carry; `metric_eligibility`
         replaced it and is what the five newer records use. This line read the
         old name only, so five records could declare their services figure
         unpublishable and be ignored — which is how Perth, whose sewerage has
         no input in this scenario at all, came to be marked publishable with
         nothing to publish, and how its page came to throw on a null.

         Read both, and let either withhold. Then override both with the
         figure: a metric with no number is not publishable whatever a record
         says about it, and trusting the flag over the data is what broke. */
      services_publishable: !SERVICES_WITHHELD && services != null,
      services_blocked_by: t.metric_grades?.total_water_services?.blocked_by
        ?? t.metric_eligibility?.total_water_services?.reason
        ?? (services == null ? 'No wastewater figure is computed for this city under this scenario.' : null),
      tariff_effective: t.effective_from,
      /* §3.10 — how far the evidence reaches, published rather than implied. */
      valid_through: validThrough(t, sources),
      grade_reason: t.grade_reason ?? null
    };
  });

/* Dimensionless comparables — the figures that work without an FX rate. */
const rank = (key, dir = 'desc') => [...cities].filter(c => c[key] != null && !c.not_priced)
  .sort((a, b) => dir === 'desc' ? b[key] - a[key] : a[key] - b[key])
  .map((c, i) => ({ rank: i + 1, id: c.id, value: c[key] }));

const rubrics = read('content/rubrics.json').rubrics.filter(r => r.active);
const activeIds = new Set(rubrics.map(r => r.id));

const articles = readdirSync(join(ROOT, 'content/articles')).filter(f => f.endsWith('.md'))
  .map(f => {
    const raw = readFileSync(join(ROOT, 'content/articles', f), 'utf8');
    const { meta, body } = frontmatter(raw);
    if (!meta.slug) throw new Error(`${f}: no slug`);
    if (!activeIds.has(meta.rubric)) throw new Error(`${f}: rubric "${meta.rubric}" is not active`);
    /* Reading time is measured over the piece, not over its bibliography.
       Counting the citation list put a five-minute article at eight, because
       a source note is looked up rather than read at 220 words a minute. */
    const prose = body.split(/\n---\n/)[0];
    return { ...meta, html: render(body), minutes: readingMinutes(prose),
             /* Published so any other rendering of this piece can reproduce the
                figure rather than set its own. */
             reading_wpm: READING_WPM,
             words: prose.split(/\s+/).filter(Boolean).length,
             words_with_sources: body.split(/\s+/).filter(Boolean).length };
  })
  .filter(a => a.status !== 'draft')
  .sort((a, b) => String(b.published).localeCompare(String(a.published)));
const stories = read('content/stories.json');

const featuredArticle = articles.find(a => a.slug === stories.featured?.article)
  ?? articles.find(a => a.cover_wide) ?? articles[0] ?? null;

/* Cards name a slug and nothing else. A card that resolves to no published
   article is a dead link, and the build refuses to ship one. */
for (const card of stories.cards ?? []) {
  if (!articles.some(a => a.slug === card.slug))
    throw new Error(`content/stories.json: card "${card.slug}" has no published article`);
}
if (stories.featured?.article && !articles.some(a => a.slug === stories.featured.article))
  throw new Error(`content/stories.json: featured article "${stories.featured.article}" is not published`);

/* The Journal's three levels are an editorial decision and are read from the
   same file, not derived from publication dates. A lead chosen by date is not a
   lead; it is a sort order wearing a larger typeface.
   Everything named has to resolve, and the shape has to be the shape the page
   is built for: one lead, exactly two beside it. A typo here would otherwise
   quietly demote a piece to the archive and nobody would notice for a week. */
const J = stories.journal ?? {};
for (const [field, slugs] of [['lead', J.lead ? [J.lead] : []], ['secondary', J.secondary ?? []]]) {
  for (const slug of slugs) {
    if (!articles.some(a => a.slug === slug))
      throw new Error(`content/stories.json: journal.${field} names "${slug}", which is not published`);
  }
}
if (J.secondary && J.secondary.length !== 2)
  throw new Error(`content/stories.json: journal.secondary must name exactly two pieces, found ${J.secondary.length}`);
if (J.lead && (J.secondary ?? []).includes(J.lead))
  throw new Error(`content/stories.json: "${J.lead}" is both the lead and a secondary`);

const payload = {
  brand: { mark: 'brand/twj-mark-160.png', mark_large: 'brand/twj-mark-512.png',
           favicon: 'brand/twj-mark-64.png',
           note: 'Circle Graphite #3B3E42, dot PRANA Turquoise #00B1AE — the mark was recoloured to the palette rather than the palette bent to the mark.' },
  rubrics,
  stories: { ...stories, featured_article: featuredArticle?.slug ?? null },
  articles,
  generated_at: new Date().toISOString(),
  scenario: METHODOLOGY.scenario_id,
  /* The reader is told which version produced the figure in front of them,
     and that the superseded one is still readable. */
  index: {
    name: METHODOLOGY.index_name,
    abbreviation: METHODOLOGY.index_abbreviation,
    renamed_from: METHODOLOGY.index_renamed_from,
    headline_metric: METHODOLOGY.headline_metric_name,
    basket_reading: METHODOLOGY.price_readings.basket_uses
  },
  /* The public page states how a figure is checked. It said "two readers" for
     six versions after the two-person review was withdrawn, because the
     sentence was typed on the page instead of read from the rule. The
     conditions travel with the payload now, so the page counts them. */
  methodology_checklist: METHODOLOGY.publication_checklist,
  methodology: {
    version: METHODOLOGY.version,
    supersedes: METHODOLOGY.supersedes,
    frozen_on: METHODOLOGY.frozen_on,
    document: METHODOLOGY.document
  },
  base_period: {
    id: METHODOLOGY.base_period,
    month: METHODOLOGY.base_month,
    blocked_by: METHODOLOGY.base_month_blocker
  },
  corrections: read('data/corrections.json').corrections.map(c => ({
    id: c.id, recorded: c.recorded, kind: c.kind ?? 'correction', city: c.city,
    article: c.article ?? null,
    metric: c.metric, old_value: c.old_value, new_value: c.new_value,
    figures_changed: c.figures_changed ?? true, reason: c.reason
  })),
  fx: { status: 'not_fixed',
        note: 'No converted value is published until the period-average rate for the base month is loaded and stored.' },
  /* The public catalogue carries published cities and exception records. A
     research-pending city is real, computed and fully recorded in the
     repository — it simply is not a page, because it would be a page about our
     backlog rather than about the city (§5.3, v1.4). */
  cities: cities.filter(c => c.publication_status !== 'research_pending'),
  research_pending: cities.filter(c => c.publication_status === 'research_pending')
    .map(c => ({ id: c.id, name: c.name, utility: c.utility,
                 awaiting: read(`data/cities/${c.id === 'hong-kong' ? 'hongkong'
                   : c.id === 'abu-dhabi' ? 'abudhabi' : c.id}.json`).awaiting ?? null })),
  counts_public: {
    published: cities.filter(c => c.publication_status === 'published').length,
    exception_records: cities.filter(c => c.publication_status === 'exception_record').length,
    research_pending: cities.filter(c => c.publication_status === 'research_pending').length
  },
  comparables: {
    note: 'Proportions, so they compare across currencies where the bills cannot.',
    ww_share: [...cities].filter(c => c.ww_share != null && !c.not_priced
    && c.services_publishable !== false)
    .sort((a, b) => b.ww_share - a.ww_share)
    .map((c, i) => ({ rank: i + 1, id: c.id, value: c.ww_share })),
    gap_percent: rank('gap_percent'),
    curve_ratio: [...cities].filter(c => c.curve).sort((a, b) => b.curve.ratio - a.curve.ratio)
      .map((c, i) => ({ rank: i + 1, id: c.id, value: c.curve.ratio }))
  },
  counts: {
    modelled: cities.length,
    grade_a: cities.filter(c => c.grade === 'A').length,
    /* Published means a figure shipped: archived provenance and a price.
       Singapore's sources are archived and still carry no number. */
    published: cities.filter(c => c.archived && !c.not_priced).length,
    services_held: cities.filter(c => c.services_publishable === false).length
  }
};

/**
 * The payload is exported, and writing it is a side effect of running this file
 * rather than of importing it.
 *
 * Two tests read the public payload — the cross-currency display rules and the
 * jurisdiction migration. They read it from dist/site.json, which only this
 * script produces, and `npm run build` runs `node --test` before running this
 * script. On a clean checkout there is no dist/, so the tests failed on a
 * missing file and the build could not bootstrap itself; CI, which checks out
 * clean every time, failed on the first step for that reason and not for any
 * reason in the data. It had been failing on order, which is the kind of red
 * that teaches people to stop reading the red.
 *
 * A test asserting a property of the payload should compute the payload, not
 * read the last one somebody happened to build. Those two now import this
 * value, so what they check is what this code produces today.
 */
export { payload, cities, articles, rubrics };

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  if (!existsSync(join(ROOT, 'dist'))) mkdirSync(join(ROOT, 'dist'));
  writeFileSync(join(ROOT, 'dist/site.json'), JSON.stringify(payload, null, 2));
  console.log(`  ${articles.length} articles · ${rubrics.length} rubrics`);
  console.log(`site payload · ${payload.counts.modelled} modelled · ${payload.counts.grade_a} grade A · ${payload.counts.published} publishable`);
  const withheld = cities.filter(c => c.gate_problems?.length);
  for (const c of withheld) {
    console.log(`  WITHHELD · ${c.name}`);
    for (const p of c.gate_problems) console.log(`    − ${p}`);
  }
  for (const c of cities) console.log(c.not_priced ? `  ${c.name.padEnd(11)} not priced — ${c.blocked_by?.slice(0,60)}…` : `  ${c.name.padEnd(11)} ${c.symbol} ${c.price_m3}/m³  gap ${c.gap_percent}%  ww ${c.ww_share}%  ${c.curve.shape} ${c.curve.ratio}`);
}
