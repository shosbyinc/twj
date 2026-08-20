# TWJ WATER INDEX
## Methodology v1.9

**Status:** Frozen for V1 collection · 18 August 2026
**Scenario ID:** `TWJ-R180-v1.0`
**Supersedes:** v1.8, retained at `docs/methodology-v1.8.md`; v1.7 to v1.0 also retained
**Companion document:** aggregation is specified separately in `docs/uwti-index-beta-v0.1.md`. City benchmark methodology and index methodology are not mixed.
**Change policy:** any change to a rule in §2–§6 increments the methodology version and re-stamps every affected observation. Existing published values are never silently recalculated.

---

## Why there is a v1.9

One clause, narrowed the day after it was written, because it claimed a reach it did not have.

### Rule 13.1 applies to the Index, not to the journal

As written in v1.8, Rule 13.1 governed "anything TWJ ships." The check that enforces it reads the Index records, the corrections log and this document, and has never read an article. A rule whose stated scope exceeds its enforcement is the failure this project keeps correcting, in the direction that is easiest to miss: it looks stricter than it is.

The choice was to widen the guard or narrow the rule. The rule is narrowed, because the wider version was wrong on the merits.

**The Index is an instrument. The journal is journalism.** They are not held to one standard because they do not make one kind of claim. An Index record says what a household pays, under what grade, and through what date its evidence reaches; a comparative adjective attached to a city there is the instrument editorialising about its own subject, and the number beside it stops being a measurement. An article is an argument — attributed, sourced, and answerable — and an argument forbidden from characterising anything is not an argument.

**Rule 13.1 therefore governs:** city records, grades, withholding and continuity reasons, the corrections log, and this document.

**Articles remain governed by Rule 13 and the evidence standard**, which are not weaker rules — they are different ones. No water may be called cheap and no utility may be implied to conceal; a comparison must carry its source; and where an index places a country, the article says which index and on what definition rather than asserting the placement as fact.

## Why there is a v1.8

One rule, and it was already being applied. That is the reason for the version rather than an argument against it.

### §3.10 — Tariff validity in time · new

Abu Dhabi raised it. The captured tariff page is titled 2025 and was last updated in May 2025, and the question was whether TWJ may use those rates for an observation dated later. The strict answer — obtain a document dated on the valuation date — sounds like rigour and is not. Hong Kong's water rates have not been revised since 16 February 1995. There is no 2026 Hong Kong tariff document and there will not be one, because nothing has changed. A rule requiring one would exclude a tariff on the ground that its publisher has had no reason to reissue it, and admit one revised every year — which measures publishing frequency rather than evidence.

**Rule 3.10 (v1.8)** — A tariff stated by an authoritative instrument with an `effective_from` and no stated expiry remains applicable until superseded by another authoritative instrument. A document dated on the valuation date is not required. Four conditions:

1. an authoritative instrument states the rate and the date it took effect;
2. that instrument states no expiry, or an expiry after the valuation date;
3. a search for a superseding instrument, covering the period from `effective_from` to the valuation date, found none;
4. an archived source accessed on or after the valuation date shows the rate still in force.

**Condition 3 is a claim about a search and not about silence.** Not having found a superseding instrument is not the same as having looked. Where the evidence is the publisher's own live schedule the condition is met by that schedule — a superseding rate would appear there, and does not — and the record states the basis as `live_publisher_schedule`. Where it is anything else, the search is recorded with its date, its scope and its finding, or the condition fails. Dubai's UAE National tariff rests on a 2011 Executive Council Resolution rather than a maintained page, and carries the recorded search accordingly.

### What the rule publishes

`valid_through` — the date the continuity source was accessed, and not one day further.

This is the part that is genuinely new. The permission was already being exercised; what was missing was the date on which it rests. A record now says that Hong Kong's 1995 tariff is shown in force **through 17 August 2026** and that Abu Dhabi's is shown in force **through 17 August 2026 on a page last updated 26 May 2025** — and a reader can weigh those differently, which they should. A tariff with a stated expiry reports that expiry instead and needs nothing from this rule.

### What the rule does not do

It does not block. The first implementation demanded a separately recorded search for every open-ended tariff and withheld Hong Kong, Dubai and New York — three fully evidenced records — which is the v1.5 failure exactly: a gate that stalls everything and catches nothing. What blocks is failing to say through what date the evidence reaches. That the date is older than one would like is reported, not punished, because the reader is better placed to judge it than the gate is.

### What the basis does not carry

`live_publisher_schedule` establishes that a rate stood as the current schedule on the day it was captured. It establishes nothing about what happened between the day the page was last updated and the day we looked.

Abu Dhabi shows the difference plainly, and the record publishes the three dates rather than a verdict on them: the page was captured **17 August 2026**, is titled **2025**, and was last updated **26 May 2025**. The capture queue asks for an Executive Council or Department of Energy instrument covering the period, which would replace the basis with a recorded search over the instruments themselves.

TWJ does not rank cities by the strength of its own evidence, and does not describe one city's record as weaker than another's. The grade states how certain a figure is, `valid_through` states how far the evidence reaches, and the dates state themselves. A reader who concludes that one record rests on less than another has reached that conclusion from the evidence, which is the correct order.

## Why there is a v1.7

Three changes, all of them things the cities already collected have proved rather than suggested.

### §2.7 — The observation unit is not a city

A tariff is set by a jurisdiction, a utility, a service area and a customer class. A city is a display label and a public URL. The two coincide often enough to be mistaken for one thing, until they do not.

    observation = tariff_jurisdiction × utility × service_area
                  × customer_class × tariff_schedule × effective_period × metric

**Rule 2.4 (v1.7)** — `CITY ≠ OBSERVATION UNIT`. City identifiers and URLs are unchanged and stay public: `/city/dubai` is what a reader wants. Beneath it the observation belongs to the jurisdiction.

Saudi Arabia is the case that forced it and the test that proves it: Riyadh and Jeddah are two display cities on **one** national schedule. The tariff logic exists once, neither city owns it, and resolving a blocker resolves it for both. The inverse case — one metropolitan market served by several jurisdictions — is handled by the same separation.

Migrated at six published observations rather than at thirty. The cost of this change is measured in records, and it was never going to be cheaper.

### §3.9 — The curve is the primary data object

Empirically, not by preference. On the cities collected:

- **Hong Kong** has the steepest rising curve in the set: its own price per m³ at 5 m³ is 0.279 of its price at 25 m³, because twelve cubic metres per statutory period are free and the rates then climb. The ratio is dimensionless and is a comparison of the city with itself, which is the only kind this Index makes. Where the city sits against others in money is a question Rule 4 does not permit and no figure here answers.
- **Perth and Sydney change places** between 5 and 25 m³, in one currency and one country, so the crossing cannot be a currency artefact.
- **New York looked flat and is not.** A minimum bill of USD 0.49 a day does not bind at 15 m³ and does bind at 5, lifting the price from USD 1.889 to USD 2.982 per m³ while the rate never changes.

**Rule 3.9 (v1.7)** — the hierarchy:

| | Object |
|---|---|
| 1 | **Residential water price curve** — the primary object |
| 2 | **Standardized effective water price at 15 m³** — the canonical comparable observation |
| 3 | Standardized monthly bill at 15 m³ |

Published at 5, 10, 15, 20, 25, 30 and 40 m³.

**15 m³ is not wrong at 15 m³.** It ranks the cities correctly there. What a single point cannot do is show whether that ranking is a stable relation between tariff systems or an artefact of where it was measured. The canonical figure therefore stays canonical for tables, search, comparison and citation, and stops being the only thing TWJ publishes about a city.

> TWJ compares tariff systems as curves. 15 m³ is the standardized reference point on that curve.

### §7.7 — Component ontology, and the minimum bill

Components cannot be classified by the name on a bill, and they act differently on the curve. The functional classes are enumerated: volumetric and block charges, fixed recurring charge, **minimum bill**, minimum consumption charge, meter service, resource or conservation levy, surcharge, tax, rebate, waiver, wastewater collection and treatment, stormwater, and property-based water service.

**Rule 7.7 (v1.7)** — `payable = max(calculated bill, minimum bill)`. A minimum is a floor on the bill and never an item in it.

The distinction is not pedantic. Model New York's minimum as a fixed charge and it is added to every bill; model it as absent and every small bill is understated. Either error leaves the 15 m³ figure correct and the curve wrong below 8 m³ — the hardest kind of error to notice, because the number everyone quotes is right.

## Why there is a v1.6

Three normative additions, each one already demanded by a city in the set.

### §3.8 — Tariff state · new

Sydney publishes two usage rates and a 60/70 storage trigger. Which rate applies is not a fact about the tariff document; it is a fact about the reservoirs.

**Rule 3.8** — Where a tariff selects between published rates on the measured state of the system:

    applicable rate = tariff rule + authoritative dated state observation

The rule alone is not enough. A tariff document gives the rule and cannot give the state, so a state-conditioned rate without a dated observation is unresolved — the engine holds both numbers and no basis for choosing between them.

**A tariff state is structural, and is not a temporary policy adjustment.** The two must not share a field. Tokyo's basic-charge waiver is a discretionary act with an end date: it moves the payable price and leaves the tariff untouched. A drought rate is part of the tariff architecture — an existing regulatory rule firing on a measured condition — so it moves the structural price and the index. Modelling a drought as a waiver would keep it out of both, which is exactly backwards.

**Rule 3.8a — Trigger provenance.** A tariff-state trigger must come from the instrument governing this tariff, or from another instrument that one explicitly incorporates. WaterNSW's wholesale determination defines a 31-day lag at Part 7 Clause 25; Sydney Water's retail page states the trigger without one. The thresholds look identical, which is precisely why borrowing the wholesale mechanics would be invisible in the output and wrong. The engine refuses a trigger whose source the tariff does not cite.

A state observation is evidence in its own right, with `observed_at` distinct from `retrieved_at`: a document archived today can prove the state of the system on a past date.

### §7.6 — `non_standardizable` · new status

Perth showed that *unresolved* and *known but not standardizable* are different claims and were sharing one word.

Perth's sewerage liability depends on the property's Gross Rental Value, which Water Corporation states is set by law. Nothing about it is unknown. The TWJ reference scenario simply contains no property valuation, so there is no input to supply. Recording that as *unresolved* implies a document we have failed to find; recording it as `non_standardizable` says what is true. It withholds the metric it names and does not hold the record.

### §5.5 — Publication and index eligibility are separate · new

Publication asks whether a metric is provable from archived primary sources. Index eligibility asks whether it is compatible with the basket. They are different questions and were being answered with one flag.

    Perth      supply    publishable ✓   basket eligible ✓
               services  publishable ✗   basket eligible ✗   non_standardizable
    Toronto    supply    exception       basket eligible ✗   system_structural
               services  publishable ✓   basket eligible ✗   combined figure
    Tokyo      supply    once the tier table is captured: publishable and
                         basket eligible, because the index uses the structural
                         price and a live waiver does not touch it

A city can be published and outside the basket. A basket is frozen; a database grows.

## Why there is a v1.5

The publication gate was too hard, and in a specific way: three levels of proof were being treated as one.

| | Level | Required? |
|---|---|---|
| 1 | **Source validity** — is there an authoritative primary source | Yes |
| 2 | **Calculation reproducibility** — does the source determine our result | Yes |
| 3 | **External reconciliation** — does the publisher independently confirm it | **No** |

The first two are ours to require. The third is not always available, because a utility publishes a tariff rather than a worked example of somebody else's benchmark scenario. Making it a gate condition produced a rule that read: *an official tariff is insufficient until the utility computes our scenario for us.*

It withheld London. Thames Water's Charges Scheme states a volumetric rate of £2.7346, an annual fixed charge of £66.87, the customer class and the period. From those, 15 × 2.7346 + 66.87 ÷ 12 = £46.5915 follows and nothing else does. There was never any doubt about the number; what was missing was a second party's arithmetic on it.

### Rule 9.4 (v1.5) — Material blockers and validation gaps

**A material blocker** is one where the published number could actually differ depending on the answer. Only a material blocker holds publication.

**A validation gap** is one where the number is determined and an additional independent check is absent. It is reported beside the figure and never suppresses it.

### Grade A, restated

Required: a primary authoritative source, archived and hashed; the applicable customer scope established; all *material* components resolved; an effective date; a deterministic and reproducible calculation; each stored rate verifiable against its capture where the capture is machine-readable; no material source conflict.

Strongly preferred and not required: a public calculator reconciliation, a publisher worked example, an invoice reconciliation, an independent second reading.

### Validation is reported, not folded into the grade

Grade says how certain a number is. Validation says how many independent ways it has been shown. They are different facts and a reader gets both:

    London      Grade A   Source ✓   Calculation ✓   Reconciliation —
    Dubai       Grade A   Source ✓   Calculation ✓   Invoice reconciled ✓

Both are Grade A. Dubai carries an additional layer, and that is visible rather than hidden inside a letter.

### An exhaustive schedule proves an absence

`confirmed_absent_by_exhaustive_schedule` is added, and it must state why the document is exhaustive for that customer class. Where a schedule is normatively complete and a charge is not in it, the charge does not exist — utilities rarely write the sentence *there is no fixed service charge*, and demanding one was over-literal.

Hong Kong qualifies: WSD enumerates the whole of what a domestic bill can carry. Seoul's rate table does not: it lists rates, so its silence about tax proves nothing. **Tokyo is the demonstration** — no tax line in its rate table either, and a calculation formula that multiplies by 1.10. The test is whether the document is exhaustive for the customer class, not whether a sentence denies the charge.

### What this changed, and what it did not

London returns to publication, and Seoul's meter-size question is resolved as scope — §5.1 already separated uncertainty from scope, and blocking on it conflated the two, which is the error v1.2 exists to prevent.

Four cities stay withheld and every one is a material blocker: New York's possible minimum charge, Seoul's and Toronto's tax treatment, Sydney's drought state, Abu Dhabi's VAT conflict. In each the number could genuinely differ. Five cities are published, not seven — loosening the gate correctly did not loosen it further than the evidence allows.

### The principle

The strength is *we can prove every published figure* — not *we publish nothing until three separate proofs agree*. The first builds authority. The second becomes an audit that never ships.

## Why there is a v1.4

§5.3 is rewritten, because applied to ten cities it produced the wrong thing.

The old rule said that refusing to publish is a product feature and every refusal is shown with its reason. That is right about refusals and wrong about *all* refusals. Eight of ten city pages carried the word *withheld*, which reads as a broken site rather than a careful one — and worse, it presented our own unfinished capture as though it were a property of the city's water system. A reader looking at London learned that we had not got round to a reconciliation. That is a fact about us.

**Rule 5.3 (v1.4) — Public withholding.** A withheld numerical result is shown publicly only where the reason for withholding is itself a verified characteristic of the tariff system, the regulatory framework, or the authoritative source record. A result withheld because TWJ has not completed source capture, reconciliation, state verification or component verification stays internal until the publication gate is satisfied. TWJ never presents incomplete internal research as an apparent property of a city's water system.

### Three publication statuses

| Status | Meaning | Public |
|---|---|---|
| **Published** | A publishable metric exists and passes the publication gate | Yes |
| **Exception record** | No comparable number is published, and the reason is itself established by sufficient authoritative evidence and is methodologically informative | Yes |
| **Research pending** | Withheld because our own evidence package is incomplete | No |

### And one required field: `withholding_origin`

| Origin | Public | Meaning |
|---|---|---|
| `system_structural` | yes | the tariff system or regulatory framework prevents the comparison |
| `source_conflict` | yes, where the conflict is itself Grade A evidence | authoritative sources support incompatible readings |
| `twj_research_incomplete` | never | capture, reconciliation or verification is unfinished |

The test of a public withholding is not how serious it looks. It is whether the sentence explaining it is about the city or about us.

### Applied

    Published            Dubai · Hong Kong · Perth · Singapore
    Exception records    Toronto · Abu Dhabi
    Research pending     London · New York · Seoul · Sydney

**Toronto** is an exception record because its published residential tariff combines water and wastewater in one rate, and the statutory instrument is titled *Water & Wastewater Consumption Rates*. No decomposition exists to infer from. That is a fact about Toronto.

**Abu Dhabi** is an exception record because ADDC's own tariff page states charges are inclusive of VAT at 5% in a sentence that supports two readings differing by 4.9% of the bill. That is a fact about the source record.

The four research-pending cities remain fully computed, tested and recorded in the repository. They are not pages, because a page about them would be a page about our backlog. Nothing is deleted; the register is internal.

### What this does not license

An exception record is not a place to put a hard problem. It requires the reason to be *established* — Abu Dhabi qualifies because the conflict is documented and hashed, not because the VAT question is difficult. A withholding whose own reason is unverified is research pending, however structural it feels.

## Why there is a v1.3

One rule withdrawn, and replaced rather than deleted.

**Rule 9.3, the two-person review, is withdrawn.** It required a second reader for any new tariff structure. It was a real safeguard and the system contained one reviewer, so in practice it held three fully evidenced cities — Hong Kong, Perth and Singapore — indefinitely, while catching nothing. Eight of ten cities showed *withheld* to a reader, and only one of the eight was genuinely blocked on evidence. A rule that stalls everything is not a safeguard; it is a queue nobody can clear.

**Rule 9.3 (v1.3) — the publication checklist.** One reviewer is recorded, because the provenance of a reading matters. Publication then requires seven conditions, every one of them checkable by code:

1. every rate-bearing component carries a `source_id`
2. every source behind a published metric is archived under a real hash
3. no component state is `unresolved`
4. no component on a Grade A record is marked `assumed`
5. **each stored rate appears verbatim in its own archived capture**
6. either a reconciliation against a publisher figure passes, or the record states in writing that the publisher offers none
7. the reference connection is declared with a source, or declared size-independent with a source

### What was lost, stated plainly

A single reader checking twice is not two readers. No condition above can notice that a document was misread — that is exactly what a second human is for, and the loss is real. It is recorded here rather than glossed, because a methodology that hides its own weak point is the failure this project keeps correcting.

### What was gained

Condition 5 is a second pass a careful re-reading could not perform. It goes back to the archived capture and looks for the stored figure as text, which catches transcription between document and record — the error a reader reviewing their own work is least likely to see, because the record looks right.

It earned its place on the first run. Singapore's waterborne tax carried **1.42** in its upper block where PUB's Annex A prints **1.40**; the component's own label said 1.40 while the stored rate said 1.42. The tier sits above 40 m³, so it never touched the 15 m³ figure and no acceptance test could have found it. Two further findings came from the same run: **London had never been reconciled against any figure its publisher produced** — the only city in the Index in that position — and Dubai's reconciliation existed against a verified invoice but sat in a field the checklist did not read.

### And the check declares its own blind spot

Condition 5 reads text. The Dubai record rests in part on the publisher's original PDF and page images, which the check cannot read, so the slab rates verified by eye against that PDF are listed in the record as unreachable by the check. A limitation that looks like a pass is worse than one that is written down.

## Why there is a v1.2

Four rules changed, and this is the cheapest moment they will ever change: the public database has not launched, so nothing has to be recalculated and no citation breaks.

Three of the four came out of extending the engine to ten new cities. A calculation standard meets architectures the scenario never anticipated — annual accumulating blocks, daily allowances, statutory billing periods, a four-month tax waiver — and the gaps it finds are gaps in the methodology, not in the cities.

### §2.5 — The reference connection · new

Tokyo bills a 20 mm connection; Seoul a 15 mm one. Both were being carried as *assumptions*, which under Rule 5.2 forbids Grade A. That was the wrong classification. Nothing about either bill is uncertain: it is exactly one number for a named connection size. What was missing was a rule saying **which** size, and Dubai had already been given a Type 1 meter scope disclosure without one.

**Rule 2.2 (v1.2)** — The reference connection is the standard individual residential meter or service size **explicitly designated by the utility** for an ordinary single dwelling.

Where a utility identifies several ordinary residential sizes but no default, TWJ uses the smallest size explicitly documented as suitable for an individual dwelling, and prints that choice on the city record as scope. Where it cannot be established from a primary source, the observation cannot receive Grade A.

The rule is deliberately tighter than "the smallest connection". A loose version would let a collector shop for the cheapest meter and produce a flattering price, and the whole point of a designated size is that the utility chose it, not us. The size is always printed; it is never a hidden assumption.

Applied: Dubai → Residential Flat, Type 1. Tokyo → Residential, 20 mm. Seoul → Residential, 15 mm.

### §2.6 — Time convention · new

The city expansion used 365 days to annualise Sydney's 92-day service charge and 365.2425 to derive Abu Dhabi's daily volume and Hong Kong's 121.64-day period. Two constants in one standard is one too many: it moves Sydney in the fourth significant figure, and it makes the answer depend on which constant a reader happens to pick.

**Rule 2.3 (v1.2)** — `days_per_year = 365.2425`, the Gregorian mean year, and `days_per_month = 365.2425 ÷ 12 = 30.436875`. Two exceptions, both narrower than the rule:

- Where a regulation defines the billing-period duration itself, that duration governs. Hong Kong's statutory four-month period of 121.64 days is used as published and is not replaced by a third of our mean year.
- An invoice reconciliation uses the invoice's own period dates. It is checking a bill that was actually issued, not computing a benchmark.

### §5.4 — Payable and structural price · new

Tokyo waived its basic water charge outright for four months of 2026. The payable price is ¥55/m³; the standing tariff gives ¥140.80/m³. Both are true, they differ by a factor of 2.56, and a record carrying only one of them misleads whichever way it chooses.

**Rule 5.4 (v1.2)** — Two readings are stored and both are published:

| | |
|---|---|
| **Current payable price** | What the standardized household is billed today, including temporary relief |
| **Structural tariff price** | The standing tariff, with explicitly temporary, time-limited relief removed |

**The city page leads with the payable price** — the Index answers what a household pays. **The reference basket and the index use the structural price**, because a base period that captured a four-month waiver would embed a temporary budget decision in the permanent geometry of the index. The waiver expires; the base does not.

A city under live relief is therefore out of the base basket while the relief runs, and the page names the policy rather than leaving a reader to wonder why two numbers disagree.

### §7.6 — Source completeness · new

**Rule 7.6 (v1.2)** — An unknown component never defaults to zero. Every potential component of a bill carries exactly one of three states:

| State | Requirement |
|---|---|
| `observed` | a value and a `source_id` |
| `confirmed_absent` | a `source_id` establishing that the charge does not exist |
| `unresolved` | a blocker; bars Grade A |

Rule 9.1 already forbade silently assuming a component to be zero, and the expansion drafts broke it twice within a day: Seoul was computed with no tax line and no statement about why, and Hong Kong with no fixed charge on the same silent basis. A rule that only exists in prose gets broken by the people who wrote it. `confirmed_absent` with a source is a far stronger claim than a zero, and it is now checkable.

### And the index is renamed

`TWJ Water Cost Index` measured no cost of production, and using the structural tariff makes that worse rather than better. It becomes the **TWJ Urban Water Tariff Index (UWTI)**: the structural level of residential tariff liability for a standard service bundle.

The obvious shorter form was rejected on a practical ground. *Water Tariff Index* abbreviates to WTI, which is West Texas Intermediate — one of the most quoted tickers in the world. A water index that collides with an oil benchmark would be misread by exactly the financial press we want citing it.

On a city page the headline number keeps a consumer-facing name: **TWJ Standardized Water Price**, in local currency per m³.

Nothing was published under the old name, so the rename costs nothing today and would cost a great deal later.

### What did not change

No published figure moves. Dubai, London and New York are untouched. Singapore stays Grade B on the Water Conservation Tax rounding stage. The scenario identifier stays `TWJ-R180-v1.0`: §2's definition of the household is unchanged, and a tariff record declaring that scenario is still calculating the same 180 m³.

---

## Why there is a v1.1

v1.0 was frozen, and then the engine changed underneath it.

The document graded London B for defining its reference household as metered, and Dubai B for resting on a meter type. The engine graded both A. The document required both headline figures to be published together; the engine shipped Dubai's water supply while holding its total water services. The document's Singapore fixture asserted Grade A at S$ 35.15; the engine refuses to price Singapore at all. Three of the frozen rules were no longer the rules being applied, and the change policy above — the one that exists to prevent exactly this — was not invoked.

Nothing in the repository noticed. The CI step named *Refuse a silent methodology change* fired only when the document was edited, and its condition (`src/engine.js` contains the string `Methodology v1`) was satisfied by the engine's own header comment, so it could never fail in either direction.

The corrections log is for wrong figures. This was not a wrong figure; it was a wrong description of correct figures, which is the more dangerous kind, because a reader checking whether to trust the Index reads the description.

**v1.1 changes no published number.** Every figure in §10 is what the engine already produced under v1.0. What changes is that the document now says so, and a test now reads the document.

### The mechanism

Every frozen constant lives once, in `src/methodology.js`. The `declared` block in §13 quotes it. `test/methodology-sync.test.js` parses this file, compares it against the constants, and computes the fixtures from the stored tariffs to check all three agree. A rule changed in one place and not the others fails the build.

A frozen rule that exists only as prose is not frozen. It is unread.

---

## 0. What the Index is

The TWJ Water Index reports what a standardized household pays for tap water, calculated the same way in every city from that city's own published tariff, and shown with its arithmetic, its sources and its comparability grade.

### 0.1 The word "Index"

Used in the sense of a *register* — a dated, sourced, reproducible collection of observations — and not in the sense of a *composite score*. TWJ publishes no weighted rating of anything. A composite requires weights, weights are judgements, and a brand-owned publication cannot supply judgements about water and expect to be quoted on them.

### 0.2 Product hierarchy

```
Observation   one metric · one city · one tariff period · one source
Record        every observation for a city, append-only
Index         every record, under one scenario and one methodology version
```

---

## 1. Scope of V1

Residential tap water, metered, at the utility serving the majority of the city. One utility per city. Four cities modelled at the time of this freeze; twenty grade A constituents are required before any base period can be set.

---

## 2. The standard scenario

### 2.1 Definition

`TWJ-R180-v1.0` — 180 m³ per year on an ordinary metered residential account, displayed as a monthly equivalent of 15 m³.

The scenario identifier is unchanged in v1.1. §2 did not change; a tariff record declaring `TWJ-R180-v1.0` is still calculating the same household.

### 2.2 What 15 m³ is not

It is not a claim about an average home, in any city. It is a yardstick: the point at which each published tariff is measured, chosen so that the same sum can be done everywhere. A household using more or less pays differently, and §3.7 measures how differently.

### 2.3 Annual basis

The scenario is annual. A monthly figure is the annual figure divided by twelve, so that a tariff with an annual standing charge and a tariff with a monthly one are compared without either being advantaged by the calendar.

### 2.4 Base period · new in v1.1

The index layer (`src/wci.js`) requires a frozen denominator. Its period identifier is `TWJ-2026`.

**Rule 2.1 — The base month is not set, and the reason is operational rather than editorial.** A frozen denominator needs every constituent evidenced for the same month. DEWA sets its fuel surcharge monthly and publishes only the month in force, so the Dubai record is evidenced for August 2026 and nothing held here evidences July. `freezeBase()` additionally refuses a basket with fewer than twenty constituents, more than one territory per country, or any constituent below grade A; run against the four cities modelled it throws with three reasons.

No WCI value is publishable until the basket is real. The base month is set at that point and not before.

---

## 3. The formula

### 3.1 Block resolution

A marginal block rate applies to the volume falling within its block. The engine resolves the blocks; multiplying a single block rate by the whole volume is a calculation error and the engine throws rather than perform it.

### 3.2 Water supply

```
TWJ_water = volumetric + fixed + surcharges + taxes − universal rebates
```

### 3.3 Total water services

```
TWJ_services = TWJ_water + the same terms for wastewater and mandatory drainage
```

### 3.4 Terms

A component is stored in the unit the utility bills in, with the conversion to m³ declared explicitly. A rate is never restated into a more convenient unit and then treated as the source.

### 3.5 The rebate test

**Rule 3.1** — A rebate is subtracted only where it is universal and automatic. A means-tested credit, an opt-in discount or a one-off government payment describes a subset of households and is excluded, with the exclusion named on the page. Singapore's U-Save is excluded on this test.

### 3.6 Two headline figures · amended in v1.1

| Label | Contents |
|---|---|
| **Water Supply** | `TWJ_water` |
| **Total Water Services** | `TWJ_services` |

**Rule 3.2 (v1.1)** — Both figures are published together **wherever both are publishable**. Where one metric is held, the other may ship, and the held metric appears in its own place with a named reason rather than as a gap. Neither figure is ever presented as the other, and no card, chart, export or social asset carries one while implying it is the full bill.

> **What v1.0 said, and why it changed.** v1.0 Rule 3.2 read: *"Both figures are published together. Neither appears alone in any card, chart, export or social asset."* Applied literally it withholds a fully evidenced water supply figure because a second, separately sourced metric is waiting on a document — punishing the reader for a gap in a different evidence chain. Publication is a property of a metric, not of a city. Dubai's supply figure rests on archived legislation, a hashed tariff capture and an exact invoice reconciliation; its services figure rests additionally on Decree No. 47 of 2024, which has not been obtained. One of those is provable today.
>
> The old rule protected against a real hazard — a supply figure being read as a full bill — and that protection is retained in the second sentence.

**Rule 3.3** — Where water and wastewater are inseparable in the published tariff, `Water Supply` is left empty rather than estimated, and the page states why. Unchanged.

**Rule 3.4** — A component is labelled by its statutory name, never renamed for convenience. Singapore's Waterborne Tax is presented as the Waterborne Tax and grouped under wastewater, not relabelled "sewer charge." Unchanged.

### 3.7 Effective price

`effective_per_m3 = TWJ_water ÷ 180`, displayed monthly as `÷ 15`, and measured additionally at 5, 10, 20 and 25 m³ because two tariffs can meet at one volume and behave differently either side of it.

**Rule 3.5** — The effective price is a derived field. It is never the headline and never the sort key on a comparison page.

---

## 4. Currency

Local currency only. A converted figure requires an exchange rate fixed to a named month; until that rate is loaded and stored, no converted value is published and no cross-currency ranking exists. The dimensionless comparisons — wastewater share, the gap between published rate and effective price, the shape of the tariff curve — compare directly and are published.

---

## 5. Comparability grade · rewritten in v1.1

Assigned **per metric**, not per city. A city may hold Grade A on its bill and Grade C on its consumption figure.

### 5.1 Two things v1.0 graded with one letter

**Uncertainty** — the bill could be more than one number and we do not know which. Singapore: 35.07 or 35.15, depending on where the utility rounds. This is an error bar. It is measured, not argued about.

**Scope** — the bill is exactly one number, but it describes a defined subset of households. London's reference account is metered in a region where metering is not universal. Nothing about the figure is uncertain; what it represents is narrower than "a London household."

v1.0 graded both with the same letter. That conflation bars a city with a perfectly determined tariff from the base basket for being honest about who it describes, and it made a grade A basket look unreachable when it was not.

**Rule 5.1 (v1.1) — The grade follows uncertainty alone. Scope travels with the figure as a printed disclosure and never lowers a grade.**

### 5.2 Materiality

```
U = (Bmax − Bmin) ÷ ((Bmax + Bmin) ÷ 2)
```

| U | Grade | Permitted use |
|---|---|---|
| `0` | **A** | No material assumption. Sorting, ranking, comparison |
| `≤ 1%` | **B** | One disclosed assumption. Comparison, with the assumption printed and a visible caution |
| `> 1%` | **C** | Context or range only. Never enters a ranking |

A system that cannot be standardized at all — unmetered supply, property-value billing, or a tariff whose figures are not machine-readable from any tier 1 or 2 source — is Grade C irrespective of U.

**Rule 5.2** — An *assumed* component forbids Grade A, because the bill could be another number. A *scope* component does not: the bill is exactly this number, for this reference customer. The engine distinguishes the two and throws if a tariff declares Grade A while carrying an assumed component.

**Rule 5.4 (v1.2)** — Where a tariff carries explicitly temporary, time-limited relief, both the payable and the structural price are computed and published. The city page leads with payable; the reference basket uses structural; the city is out of the base basket while the relief runs. See §"Why there is a v1.2".

**Rule 5.3 (v1.4)** — Where no grade can honestly be assigned, TWJ publishes no comparative figure. Refusing to publish is a product feature. The refusal is shown publicly only where its reason is itself a verified characteristic of the tariff system, the regulatory framework or the authoritative source record — see §"Why there is a v1.4". A refusal caused by our own incomplete evidence stays internal.

### 5.3 Residency

The same city can hold two prices for reasons of entitlement rather than consumption. The benchmark uses the general non-concessionary class. A concessionary plan is stored separately, marked ineligible for the benchmark, and never averaged with it.

---

## 6. Freshness

| State | Meaning |
|---|---|
| `current` | Unchanged, inside its cadence window |
| `verification_due` | Unchanged, past its window |
| `stale` | Content changed, or the source could not be reached |

A check that could not be performed is not a check that passed: an unreachable source is stale.

**Rule 6.1 — Detection is automatic; publication is not.** A changed source moves its observations to `stale` and opens a review. No figure is ever republished by a script.

### Cadence

| Class | Window |
|---|---|
| Variable surcharge reset monthly | 25 days |
| Tariff schedule | 30 days |
| Rate history | 180 days |
| Privately held validation document (`hash_only`) | Current by hash; there is no copy here to re-read, and absence of a file is not absence of provenance |

---

## 7. Sources and provenance

### 7.1 Tiers

| Tier | Source | May produce a published value? |
|---|---|---|
| 1 | Utility · regulator · ministry · procurement authority · index administrator | Yes, preferred |
| 2 | WRI · World Bank · FAO · ADB · OECD and comparable multilateral datasets | Yes, within their own domain |
| 3 | GWI · Bluefield and other licensed professional datasets | Only within licence; preferably discovery and validation |
| 4 | Direct retail observation captured by TWJ | Only for TWJ's own retail indices |
| 5 | Media · blogs · aggregators · calculators | **Never.** Discovery and context only |

**Rule 7.1** — Tier 5 may not produce a published number under any circumstance. Demonstration: Dubai's residential sewerage charge appears in widely read secondary sources as 0.5 fils per gallon, as 2 fils per gallon, and as 5% of the water bill. Three confident answers, one of them at most correct.

### 7.2 Required provenance per observation

```
Metric · Scenario ID · Volume · Customer class
Components (each with rate and derived amount)
Fixed charge · Wastewater treatment · Taxes · Concessions
Tariff effective from / to
Source · Source tier · Source URL · Archived snapshot hash
Comparability grade · Freshness state
Observed at · Last verified at · Verified by
Methodology version · Calculation hash
Correction history
```

**Rule 7.2** — A URL is not provenance. Every source is archived at the moment of collection and stored with a hash, because a utility page updated next April stops proving this year's figure.

**Rule 7.2a (v1.1) — Provenance is asked per metric.** A city record cites every document behind every figure it carries. Asking *is this city archived* of that whole list answers the wrong question: one unobtained decree behind a sewerage rate marked Dubai's water supply figure as unpublished, although that figure rests on archived legislation, a hashed capture and an exact reconciliation. A city may declare `sources_by_metric`; each metric is then judged on its own documents, and any metric that declares none inherits the whole list — the conservative reading, and the default.

### 7.3 Kinds of capture

An extract is not the original file. The kind of capture is recorded, because they are not equivalent:

| Kind | Meaning |
|---|---|
| `original` | The publisher's own file, fetched directly |
| `extract` | Text of the sections used, from a direct fetch |
| `screenshot_and_extract` | Images of the page as displayed, hashed, with a text extract of the values used |
| `page_text` | Full page text; note where the figures themselves are images |
| `hash_only` | Held privately; the hash is the record. Carries personal identifiers and is never placed in this repository |
| `not_captured` | Never fetched by TWJ. Cannot support a published figure |

### 7.4 An invoice is never a tariff source

Every published tariff cites a schedule, a piece of legislation or a regulator. An invoice sits in a separate field, `validated_against`. It confirms that the engine reproduces real billing logic; it does not supply a rate.

### 7.5 Source precedence · new in v1.1

When two official expressions of one rate disagree, precedence decides and **the losing value stays visible** in `data/conflicts.json`.

```
statutory formula
  → official billing formula
    → invoice rate
      → rounded presentation table
        → derived secondary rate
```

This ladder was in force before it was written down, and it determined two published figures. PUB defines the Water Conservation Tax as 50% of the water tariff and prints S$ 0.72/m³; fifty percent of S$ 1.43 is S$ 0.715, and the formula wins. DEWA prints 7.700 AED/m³; the invoice bills 0.035 AED per imperial gallon at the meter factor of 220, and the billing formula wins.

**Rule 7.5** — A precedence rule that bends for small differences is not a rule. The Dubai spread is 0.014% and the Singapore spread 0.23%; both are resolved by the ladder rather than by size.

### 7.6 Source completeness · new in v1.2

**Rule 7.6** — An unknown component never defaults to zero. Every potential component is `observed` (value plus source), `confirmed_absent` (a source establishing the charge does not exist), or `unresolved` (a blocker that bars Grade A).

### 7.7 Append-only history

**Rule 7.3** — Observations are append-only. A superseded value is closed with an `effective_to` date and retained forever. Nothing is overwritten, nothing is deleted, and no historical figure is recalculated under a later methodology version.

This rule is the product. Five years of normalised, dated, source-stamped tariff history is the one asset a competitor cannot assemble in a quarter.

### 7.8 Corrections

Published in a visible log with the affected observation, the old and new value, the reason and the timestamp. Never silent.

A restatement of a rule that leaves every figure unchanged is logged as a **re-stamp** rather than a correction, and says so, so that the correction count stays a measure of wrong figures.

---

## 8. What is excluded from V1

| Excluded | Reason |
|---|---|
| **TWJ Water Security Score** | Aqueduct already publishes 13 indicators and states that its global framework is a prioritisation tool requiring local analysis. Assigning our own weights would produce invented science. |
| **Commercial tariffs** | "Commercial" is dozens of customer classes per utility. Not comparable. |
| **Premium bottled water** | *Premium* has no objective definition. A brand-owned publication cannot supply one. |
| **Bottled Water Index** | Deferred. Requires a public conflict-of-interest policy, a deterministic eligibility rule, an editorial firewall and a retailer panel fixed for twelve months. |
| **A world price of desalinated water** | Project tariffs are contract-specific. Published as dated project records only. |
| **Composite scores of any kind** | See §0.1. |
| **Automated publication** | See Rule 9.2. |
| **Connection fees, deposits, penalties, property charges** | Not part of receiving water. Dubai's Housing fee is a municipality property charge and belongs to neither metric. |

---

## 9. Production rules

**Rule 9.1 — Acceptance.** A city goes live only when: the utility geography is known; the tariff has an effective date that has begun; every modelled component has a Tier 1 or Tier 2 source; the calculation passes its fixture test; a grade is assigned; the sources behind the metric are archived with hashes; a second person has reviewed any new tariff logic; and **no unknown component has been silently assumed to be zero**.

**Rule 9.1a (v1.1)** — This gate is executed by `src/acceptance.js` inside the build. A city failing it is neither dropped nor shipped: it appears with its reasons printed where the number would be. Between the pipeline moving to `scripts/site.js` and this freeze, the gate existed only in an unreferenced script and nothing enforced it.

**Rule 9.2 — No model calculates a published number.** Language models may assist with discovery, extraction and summarising a source. Every published figure is produced by a deterministic calculator from stored components, and the calculation is hashed so it can be reproduced by anyone holding the same inputs.

**Rule 9.3 (v1.3) — The publication checklist**, in place of the withdrawn two-person review. One reviewer is recorded; publication requires the seven checkable conditions set out in §"Why there is a v1.3", enforced by `src/acceptance.js` and `test/publication-checklist.test.js`. A single reader checking twice is not two readers, and the checklist exists because that is true rather than to pretend otherwise.

**Rule 9.4 — Never average utilities.** One utility per city, named on the page.

**Rule 9.5 — Capacity is not production.** Source shares are published only where a utility publishes an actual annual production mix, with the year attached.

**Rule 9.6 (v1.1) — Billing lag is not netted.** The scenario computes each service's liability for the same standardized volume. It never sums the lines that happen to share one calendar invoice, because that compares one month of water against another month of sewerage.

---

## 10. Fixture tests · restated in v1.1

The engine ships only when all four pass against the stored tariffs. Every figure below is what the engine produced under v1.0; v1.1 changes the description, not the number.

### Fixture A — Singapore
Multiple statutory components on one volume, with tax applied to a base containing another tax.

```
Water Tariff             1.43 /m³   × 15 = 21.45
Water Conservation Tax   0.715/m³   × 15 = 10.72   assumed: rounding stage
Waterborne Tax           1.09 /m³   × 15 = 16.35
GST 9% on each stream                       2.90 + 1.47

Water Supply          S$ 35.07
Total Water Services  S$ 52.89
Effective per m³      S$ 2.338
Grade B · U = 0.233%
Rebates: U-Save excluded per Rule 3.1
```

The rates rest on PUB's media release of 27 September 2023, Annex A, whose table is HTML and therefore readable. The PUB Water Price page publishes the same figures as an image and establishes nothing; it is retained as a source of record for the page, not of the rates. SP Services, PUB's billing agent, evidences that the 1 April 2025 tariff is still in force at Q3 2026 — an announcement of a future revision cannot do that by itself.

What remains open is the rounding stage. The Annex A row is labelled *(% of Tariff)* and prints 0.72, while the rule stated in its own footnote gives 50% of 1.43 = 0.715. Under §7.5 the formula outranks the presentation table, so 0.715 is stored and 0.72 is recorded in the conflicts log. The two produce bills S$ 0.08 apart, which is U = 0.233% — inside the Grade B ceiling and nowhere near Grade C.

**Publication waits on a person, not a document.** The engine computes this bill and this fixture passes. Rule 9.3 requires two-person review of a new tariff structure, and this is one: monthly blocks with a tax applied to a base containing another tax. Until a second reader has read it, the acceptance gate withholds the city and prints *fewer than two verifiers (Rule 9.3)* where the number would go. An anonymised SP Services invoice then closes the rounding stage and lifts the city to Grade A and into the WCI base basket.

> **Collection log.** v1.0 asserted Grade A at S$ 35.15, with an open item asking whether the Conservation Tax is published as a rate or a percentage. v1.1 recorded Grade C: the open item was closed — it is a percentage — but the rates themselves rested on no readable primary document. On 17 August 2026 Annex A was obtained and hashed, and the fixture moved to Grade B at S$ 35.07. Three positions on one city in three days, each one printed with its reason. §10 sits outside the frozen range, so no version increment is due; the figures moved because the evidence did, which is the intended behaviour and not a correction.

### Fixture B — London
Separable water and wastewater, each with a volumetric rate and an annual fixed charge, in a partially metered market.

```
Water Supply          £ 46.59
Total Water Services  £ 79.35
Effective per m³      £ 3.106
Grade A · U = 0
Scope: reference account is metered
Scope: full wastewater fixed charge, not the abated £80.43 rate
```

Thames website pages show £65.76 for the assessed household tariff and £81.76 for unmetered customers. Neither is the metered fixed charge. Table 1 of the Charges Scheme 2026-27 gives £66.87 water and £128.13 wastewater for single households, and the Scheme is the document of record.

> **v1.0 graded this B**, on the metered-household definition. Under Rule 5.1 that is scope, not uncertainty: nothing about the figure is uncertain.

### Fixture C — Dubai
Progressive slabs billed per imperial gallon, a monthly fuel surcharge, VAT on a base including the meter charge, and wastewater from a second authority.

```
Water consumption      3,300 IG × 0.035     AED 115.50
Fuel surcharge         3,300 IG × 0.005     AED  16.50
Meter service charge, Type 1                AED   5.00
VAT 5% on the subtotal above                AED   6.85
Water Supply                                AED 143.85    published
Sewerage 3,300 IG × 0.020, no VAT           AED  66.00
Total Water Services                        AED 209.85    held
Effective per m³                            AED   9.590
Grade A · U = 0
Scope: Residential – Flat on a Type 1 meter
Scope: general residential, non-concessionary
```

Executive Council Resolution 16/2011, Schedule 2 sets residential water at 3.5, 4.0 and 4.6 fils per gallon. DEWA's published 7.700 / 8.800 / 10.120 per m³ is each statutory rate multiplied by exactly 220 — the meter multiplication factor printed on the invoice. One city takes one conversion, and it is the utility's, not the physical constant 219.9692.

Total Water Services is **held**: the 2026 sewerage rate of 2.0 fils per gallon is read from Decree No. 47 of 2024, which has not been obtained or hashed. The verified invoice validates the schedule's 2025 step of 1.5 fils and says nothing about the 2026 step. The city page prints *Held — awaiting one document* where the number goes, and Dubai drops out of the wastewater-share comparison until the decree arrives.

> **v1.0 graded this B** on residency-based schedule differences, and computed the slabs per cubic metre with VAT applied to the wastewater component. All three are corrected here: residency and meter type are scope; the billing unit is the imperial gallon; the municipality sewerage charge carries no VAT on the verified invoice.

### Fixture D — New York
A flat combined rate, and the demonstration of why a supply-only index would mislead.

```
Water Supply          $ 28.34
Total Water Services  $ 73.40
Effective per m³      $ 1.889
Grade A · U = 0
```

The DEP consumer page shows a combined FY2027 rate of $13.50 per hundred cubic feet; the Water Board's Rate Schedule says $13.86. The Board states the Rate Schedule is the definitive basis for billing, so 13.86 governs and 13.50 stays visible in the conflicts log.

New York's water component was 80% of a household's bill in 1979 and is 39% today. An index built on supply alone would have shown a false trend across that period without publishing a single wrong number.

---

## 11. Success measures

**Rule 11.1** — Page views and subscriber counts are not primary measures of this product in years one and two.

| Measure | Why |
|---|---|
| Credible citations by journalists, researchers and institutions | The product's purpose is to be quotable |
| Count of historical observations under a stable methodology | The moat, measured directly |
| Institutional data requests | Evidence the reference layer is being used as one |
| Corrections issued | Tracked as a health metric, not suppressed. Zero corrections over a long period suggests insufficient checking, not perfection |

---

## 12. Freeze

This document is frozen for V1 collection. Rules in §2–§6 may not change without incrementing the methodology version and re-stamping affected observations.

**Rule 12.1 (v1.1) — The freeze is enforced by a test, not by intention.** `test/methodology-sync.test.js` reads the `declared` block below, compares it against `src/methodology.js`, and computes each fixture from its stored tariff. A rule changed in one place and not the others fails the build. The CI step that previously claimed to guard this could not fail and has been replaced.

**Company formula, for internal use:**

> Water is the subject. Data is the asset. Trust is the moat. Journalism is the distribution.

---

## 13. Declared constants

Read by `test/methodology-sync.test.js`. Do not edit by hand without editing `src/methodology.js`; the test compares them and fails if they disagree.

```declared
version = v1.9
supersedes = v1.8
tariff_validity_conditions = 4
comparative_predicates_forbidden = true
rule_13_1_scope = index
valid_through_published = true
observation_unit_is_city = false
canonical_point_m3 = 15
tariff_state_is_structural = true
index_methodology_document = docs/uwti-index-beta-v0.1.md
reconciliation_required = false
blocker_classes = 2
publication_statuses = 3
withholding_origins = 3
two_person_review = withdrawn
publication_checklist_conditions = 7
index_abbreviation = UWTI
days_in_year = 365.2425
reference_connection_printed = true
basket_price_reading = structural
scenario_id = TWJ-R180-v1.0
annual_m3 = 180
monthly_m3 = 15
u_grade_a = 0
u_grade_b_ceiling = 1
max_source_tier = 2
base_period = TWJ-2026
base_month = unset
fixture.dubai.grade = A
fixture.dubai.supply = 143.85
fixture.dubai.services = 209.85
fixture.dubai.per_m3 = 9.59
fixture.london.grade = A
fixture.london.supply = 46.59
fixture.london.services = 79.35
fixture.london.per_m3 = 3.106
fixture.newyork.grade = A
fixture.newyork.supply = 28.34
fixture.newyork.services = 73.4
fixture.newyork.per_m3 = 1.889
fixture.singapore.grade = B
fixture.singapore.supply = 35.07
fixture.singapore.services = 52.89
fixture.singapore.per_m3 = 2.338
```

---

## Rule 13 — Register

**The Index reports what a household pays. It does not allege concealment.**

A utility publishes a volumetric rate. A bill also carries standing charges, surcharges and taxes, each of them published as well. When the TWJ figure exceeds the rate, nothing has been hidden: the rate answers *what does a cubic metre cost*, and our figure answers *what does the household pay*. Those are different questions, and the difference between the answers is arithmetic, not misconduct.

Forbidden framings, anywhere on the site or in any asset:

| Not this | This |
|---|---|
| the published tariff says less | the tariff is one line of the bill |
| what the printed rate leaves out | the largest line, not the only one |
| the real price | the standardized total |
| the true cost of water | what the household pays |
| hidden charges · what they don't tell you | mandatory charges, all published |

The reason is not politeness. A publication whose credibility rests on reproducing official figures exactly cannot simultaneously imply that the officials are misleading anyone. If a utility ever does conceal a charge, that is a story, and it will be reported with the document that proves it.

Where a tariff is subsidised the page says so plainly: **a low bill measures what the household pays, not what the water costs to produce.** No city may be called cheap, efficient or best on the strength of a small bill.

### Rule 13.1 (v1.8) — No comparative predicate takes a city as its subject

Extended from prices to evidence, because the first version covered only half the exposure. v1.8 shipped a sentence calling Abu Dhabi *the weakest instance in the Index* and a correction-log entry calling Hong Kong *the best-evidenced record* while *the least stable cities* stayed in place. Every one of those statements was true, was about TWJ's own capture rather than about any city's water system, and was still wrong to publish: the grammatical subject was a city name, and a city name is what gets quoted.

In the Index — city records, grade reasons, withholding and continuity reasons, the corrections log, this document — a comparative or superlative predicate may not take a city, a utility or a country as its subject. Articles are outside this rule and inside Rule 13; see «Why there is a v1.9». Not *cheapest*, and equally not *weakest*, *thinnest*, *best-evidenced*, *least stable*, *most opaque*.

What replaces it is the evidence itself. Instead of *the thinnest continuity evidence in the Index*: captured 17 August 2026, titled 2025, last updated 26 May 2025. The second is shorter, is checkable, cannot age into a falsehood, and leaves the judgement where it belongs.

A computed rank is not a verdict. `curve_ratio`, `ww_share` and `gap_percent` are dimensionless, reproducible and published with the metric named, and reporting that a city holds the highest of one is reporting a number. What Rule 13.1 forbids is the bare adjective that replaces the number, and what Rule 4 separately forbids is any ranking by price across currencies — which is how this document came to describe Hong Kong as the cheapest in the set while the bullet beneath it explained why such a comparison needs one currency.

This does not stop TWJ from grading. A grade is a statement about a figure's certainty under a published rule, computed identically everywhere, and publishing it is the whole function of the Index. The distinction is between a rule applied to a record and an adjective applied to a place.

`test/register.test.js` scans the published payload and fails the build on a violation.
