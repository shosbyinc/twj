# TWJ WATER INDEX
> **Superseded by [Methodology v1.3](methodology-v1.3.md) on 17 August 2026.**
> Retained unaltered under Rule 7.3. Rule 9.3, the two-person review, was
> withdrawn and replaced by the publication checklist. No published figure moved
> except Singapore's upper waterborne block, corrected from 1.42 to 1.40.

## Methodology v1.2

**Status:** Superseded. Frozen for V1 collection · 17 August 2026
**Scenario ID:** `TWJ-R180-v1.0`
**Supersedes:** v1.1, retained at `docs/methodology-v1.1.md`; v1.0 at `docs/methodology-v1.0.md`
**Change policy:** any change to a rule in §2–§6 increments the methodology version and re-stamps every affected observation. Existing published values are never silently recalculated.

---

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

**Rule 5.3** — Where no grade can honestly be assigned, TWJ publishes no comparative figure. Refusing to publish a number is a product feature, and the refusal is shown with its reason rather than hidden as a gap.

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

**Rule 9.3 — Two-person review** is required for any new tariff structure. A routine rate change within an already-tested structure may be updated by one person with an automated regression test and a post-publication audit.

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
version = v1.2
supersedes = v1.1
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
