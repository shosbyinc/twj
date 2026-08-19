# TWJ WATER INDEX
## Methodology v1.0

> **Superseded by [Methodology v1.1](methodology-v1.1.md) on 17 August 2026.**
> Retained unaltered under Rule 7.3: nothing in this repository is deleted.
> Three rules below are no longer in force — Rule 3.2 (both figures always
> together), §5 grading, and the §10 fixtures. v1.1 §"Why there is a v1.1"
> states what changed and why. No published figure moved.

**Status:** Superseded. Frozen for V1 collection · 14 August 2026
**Scenario ID:** `TWJ-R180-v1.0`
**Supersedes:** none
**Change policy:** any change to a rule in §2–§6 increments the methodology version and re-stamps every affected observation. Existing published values are never silently recalculated.

---

## 0. What the Index is

> **TWJ Water Index is the public reference layer for understanding how cities price, source and secure water.**

Category: **Urban Water Intelligence.**
Public line: *What water costs. Where it comes from. What it takes to keep it flowing.*

### 0.1 The word "Index"

In this product, *Index* means a **systematic reference system**, not a number.

There is no single figure called "the TWJ Water Index," and there must never be one. Household water bills, desalination project tariffs, water rights, bottled water prices and water-sector equity indices are different economic objects. Nasdaq Veles measures the price of water rights in specified Californian markets. S&P's Global Water Index measures shares in water companies. Neither is the price of water, and neither is what we publish.

**Rule 0.1** — No page, chart, social asset or headline may present a single composite number as "the TWJ Water Index." Where a reader expects one, the interface answers instead:

> Water has no single global price. We measure the different ways water is priced, supplied and secured around the world.

### 0.2 Product hierarchy

| Layer | Status |
|---|---|
| **Cities** | Core product. Everything else is secondary. |
| Desalination Benchmark | Separate dataset, V2 |
| Water Markets | Separate dataset, V2, California and Australia only |
| Bottled Water Index | Beta, not before month 6–12, subject to §8 |

---

## 1. Scope of V1

**Proof set (3 cities):** Singapore · London · Dubai
**Launch set (10 cities max):** proof set plus New York, Los Angeles, Tokyo, Cape Town, Riyadh, Perth, Mexico City

The proof set is not chosen for prominence. It is chosen because the three cities break the calculation engine in three different ways, and an engine that survives all three survives almost anything:

| City | What it tests |
|---|---|
| **Singapore** | Multiple statutory components on one volume, plus a tax applied on top of a tax |
| **London** | Separable water and wastewater, each with its own volumetric rate and annual fixed charge, in a partially metered market |
| **Dubai** | Progressive slabs, a fuel surcharge, VAT, and a wastewater component levied by a *different authority* |

**Rule 1.1** — Collection order is Singapore → London → Dubai. Dubai is last because it is the only case requiring two primary schedules from two bodies, and it must not block the engine's validation.

---

## 2. The standard scenario

### 2.1 Definition

> **TWJ Standard Water Bill** represents the bill for a standardised residential consumption scenario of **15 m³ per month — 180 m³ per year**, on an ordinary metered residential account, at the utility serving most of the city.

### 2.2 What 15 m³ is not

**Rule 2.1** — The scenario is never described as an average, typical or representative household. It is a benchmark volume, chosen so that every city is asked the same question.

This is not a formality. Singapore's own public materials describe a typical four-person household at a figure meaningfully above 15 m³. Presenting the scenario as "an average household" would be false in Singapore and false in the opposite direction elsewhere, and a single quotable error of that kind would discredit the entire dataset.

Public wording, fixed:

> We compare the cost of the same amount of water everywhere: 15 cubic metres a month. It is a yardstick, not a measurement of how much your city actually uses.

### 2.3 Annual basis

The scenario is stored annually (180 m³) and displayed monthly (÷ 12).

Reason: some utilities price in annual cumulative bands and others price seasonally. A monthly-only scenario cannot compute either. The annual basis computes both correctly and collapses to a monthly figure for the reader.

| Tariff shape | Computation |
|---|---|
| Flat volumetric | 180 × rate, ÷ 12 |
| Monthly blocks | 15 m³ resolved through the block schedule, per month, × 12, ÷ 12 |
| Annual cumulative bands | full 180 m³ resolved through annual bands, ÷ 12 |
| Seasonal | each of twelve months computed at 15 m³ against its own published schedule, summed, ÷ 12 |

---

## 3. The formula

### 3.1 Block resolution

For volume *V* = 15 m³ and each tariff block *i* with lower bound *Lᵢ*, upper bound *Uᵢ* and rate *rᵢ*:

```
Qᵢ(V) = max(0, min(V, Uᵢ) − Lᵢ)

C_v(V) = Σᵢ Qᵢ(V) · rᵢ
```

### 3.2 Water supply

```
TWJ_water = C_v(15) + F_w + S_w + T_w − R_w
```

### 3.3 Total water services

```
TWJ_services = TWJ_water + C_ww(15) + F_ww + S_ww + T_ww
```

### 3.4 Terms

| Term | Definition | Test applied |
|---|---|---|
| `C_v` | Volumetric charge | Resolved through published blocks. A marginal block rate is never multiplied by 15. |
| `F` | Fixed, service, standing and meter charges | Mandatory for the account to exist. Annual and quarterly charges prorated to the month. |
| `S` | Water-specific surcharges and levies | Mandatory and applied to this account class. Fuel surcharges belong here. |
| `T` | Taxes and VAT | Payable by the household. Applied in the published order, including tax computed on a base that already contains another tax where that is the published rule. |
| `R` | Rebates and subsidies | **Subtracted only if universal and automatic** — see 3.5. |
| `C_ww`, `F_ww`, `S_ww`, `T_ww` | The same terms for wastewater | Stored separately, never merged into the water figure. |

### 3.5 The rebate test

**Rule 3.1** — A rebate enters `R` only if it satisfies all three conditions:

1. Applied automatically, with no application by the household;
2. Applied to every residential account of this class, regardless of household income, size, tenure, housing type or status;
3. Published as a standing feature of the tariff, not a one-off or budget-cycle measure.

Anything failing any condition is **excluded from the calculation** and shown as an affordability note on the city page.

*Worked case:* Singapore's U-Save rebates fail condition 2 — eligibility depends on housing type. They are excluded from the bill and described in words. This is the correct treatment even though it makes Singapore's published figure higher than what many households experience, because the alternative is a benchmark that silently encodes a housing policy.

### 3.6 Two headline figures, always both

| Label | Contents |
|---|---|
| **Water Supply** | `TWJ_water` |
| **Total Water Services** | `TWJ_services` |

**Rule 3.2** — Both figures are published together. Neither appears alone in any card, chart, export or social asset.

**Rule 3.3** — Where water and wastewater are inseparable in the published tariff, `Water Supply` is left empty rather than estimated, and the page states why.

**Rule 3.4** — A component is labelled by its statutory name, never renamed for convenience. Singapore's Waterborne Tax is a specific PUB charge tied to the used-water system; it is presented as the Waterborne Tax and grouped under wastewater, not relabelled "sewer charge."

### 3.7 Effective price

`effective_per_m3 = TWJ_services ÷ 180`, displayed monthly as `÷ 15`.

**Rule 3.5** — The effective price is a derived field. It is never the headline and never the sort key on a comparison page.

---

## 4. Currency

| Figure | Rule |
|---|---|
| **Local currency** | Canonical. Always shown first. |
| **Nominal USD** | Monthly period-average rate from a single named source, with the month printed beside the figure. Never a spot rate, never an undated conversion. |
| **PPP** | Advanced view only. Labelled explicitly as a national household-consumption measure, not a city cost of living. |

**Rule 4.1** — No converted value is published before its reference month is fixed and stored.

---

## 5. Comparability grade

Assigned **per metric**, not per city. A city may hold Grade A on its bill and Grade C on its consumption figure.

| Grade | Criterion | Permitted use |
|---|---|---|
| **A** | Reproducible directly from the current official tariff with no material assumption | Sorting, ranking, comparison |
| **B** | Reproducible, but requires a specific disclosed assumption — meter size, season, property class, drainage status, metered-household definition | Comparison, with a visible caution marker and the assumption printed |
| **C** | The system differs so fundamentally that a standardised comparison would mislead — unmetered supply, property-value billing, status-based tariffs, or a parallel supply market the tariff does not describe | Context or range only. Never enters a ranking. |

**Rule 5.1** — Where no grade can honestly be assigned, TWJ publishes no comparative figure. Refusing to publish a number is a product feature, and the refusal is shown with its reason rather than hidden as a gap.

---

## 6. Freshness

Stored independently of grade, because age and comparability are different defects.

| State | Meaning |
|---|---|
| `current` | Source checked within its cadence window, no change detected |
| `verification_due` | Past the window, no change detected yet |
| `stale` | Source changed or unreachable. The figure remains visible, marked, until re-verified |

### Cadence

| Dataset | Window |
|---|---|
| Residential tariffs | Automated change monitor weekly · human check monthly · immediate on detected change |
| FX | Monthly, automated |
| PPP | On source release |
| Water stress | On Aqueduct version release |
| Consumption | Annual, on source release |
| Source mix | Annual, or on utility release |

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

### 7.3 Append-only history

**Rule 7.3** — Observations are append-only. A superseded value is closed with an `effective_to` date and retained forever. Nothing is overwritten, nothing is deleted, and no historical figure is recalculated under a later methodology version.

This rule is the product. Five years of normalised, dated, source-stamped tariff history is the one asset a competitor cannot assemble in a quarter.

### 7.4 Corrections

Published in a visible log with the affected observation, the old and new value, the reason and the timestamp. Never silent.

---

## 8. What is excluded from V1

| Excluded | Reason |
|---|---|
| **TWJ Water Security Score** | Aqueduct already publishes 13 indicators and states that its global framework is a prioritisation tool requiring local analysis. Assigning our own weights would produce invented science. Revisit only after a published methodology paper, sensitivity analysis and external review. |
| **Commercial tariffs** | "Commercial" is dozens of customer classes per utility. Not comparable. |
| **Premium bottled water** | *Premium* has no objective definition. A brand-owned publication cannot supply one. |
| **Bottled Water Index** | Deferred to month 6–12. Requires a public conflict-of-interest policy, a deterministic eligibility rule, an editorial firewall and a retailer panel fixed for twelve months. |
| **A world price of desalinated water** | Project tariffs are contract-specific. Published as dated project records only. |
| **Composite scores of any kind** | See §0.1. |
| **Automated publication** | See Rule 9.2. |

---

## 9. Production rules

**Rule 9.1 — Acceptance.** A city goes live only when: the utility geography is known; the tariff has an effective date; every modelled component has a Tier 1 or Tier 2 source; the calculation passes its fixture test; a grade is assigned; sources are archived with hashes; a second person has reviewed any new tariff logic; and **no unknown component has been silently assumed to be zero**.

**Rule 9.2 — No model calculates a published number.** Language models may assist with discovery, extraction and summarising a source. Every published figure is produced by a deterministic calculator from stored components, and the calculation is hashed so it can be reproduced by anyone holding the same inputs.

**Rule 9.3 — Two-person review** is required for any new tariff structure. A routine rate change within an already-tested structure may be updated by one person with an automated regression test and a post-publication audit.

**Rule 9.4 — Never average utilities.** One utility per city, named on the page.

**Rule 9.5 — Capacity is not production.** Source shares are published only where a utility publishes an actual annual production mix, with the year attached. Installed desalination or reuse capacity is never converted into a percentage of supply.

---

## 10. Fixture tests

The engine ships only when all three pass against hand-computed values.

### Fixture A — Singapore
Multiple statutory components on one volume, with tax applied to a base containing another tax.

```
Components (domestic, below 40 m³ band, effective 1 April 2025)
  Water Tariff             1.43 /m³   ×15 = 21.45
  Water Conservation Tax   0.72 /m³   ×15 = 10.80
  Waterborne Tax           1.09 /m³   ×15 = 16.35
  GST                      9% on the total of the above

Water Supply           = (1.43 + 0.72) × 15 × 1.09  = S$ 35.15
Total Water Services   = (1.43 + 0.72 + 1.09) × 15 × 1.09 = S$ 52.97
Effective per m³       = S$ 3.53
Grade A · Rebates: U-Save excluded per Rule 3.1
```

*Open item before publication:* confirm from the PUB schedule whether the Water Conservation Tax is published as a rate per m³ or as a percentage of the tariff. The stored component must match the published form, because the two diverge under any future tariff change.

### Fixture B — London
Separable water and wastewater, each with a volumetric rate and an annual fixed charge, in a partially metered market.

```
Water Supply         = (water volumetric × 15) + (annual water fixed ÷ 12)
Total Water Services = above + (wastewater volumetric × 15) + (annual wastewater fixed ÷ 12)
Grade B — standard household defined as metered; assumption printed
```

### Fixture C — Dubai
Progressive slabs, fuel surcharge, VAT, and wastewater from a second authority.

```
Water Supply         = Σ slab charges at 15 m³ + (fuel surcharge × 15), then VAT
Total Water Services = above + municipal wastewater component, then VAT
Grade B — residency-based schedule differences disclosed
Requires two primary schedules: DEWA and Dubai Municipality
```

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

This document is frozen for V1 collection. Rules in §2–§6 may not change during the proof phase without incrementing the methodology version and re-stamping affected observations.

The next artefacts are:

1. Deterministic tariff engine passing Fixtures A, B and C
2. Three city records with complete provenance
3. Public methodology page, written in the plain-language wording of §2.2 and §0.1
4. Corrections log, live before the first figure is published

**Company formula, for internal use:**

> Water is the subject. Data is the asset. Trust is the moat. Journalism is the distribution.

---

## Rule 13 — Register

**The Index reports what a household pays. It does not allege concealment.**

A utility publishes a volumetric rate. A bill also carries standing charges,
surcharges and taxes, each of them published as well. When the TWJ figure
exceeds the rate, nothing has been hidden: the rate answers *what does a cubic
metre cost*, and our figure answers *what does the household pay*. Those are
different questions, and the difference between the answers is arithmetic, not
misconduct.

Forbidden framings, anywhere on the site or in any asset:

| Not this | This |
|---|---|
| the published tariff says less | the tariff is one line of the bill |
| what the printed rate leaves out | the largest line, not the only one |
| the real price | the standardized total |
| the true cost of water | what the household pays |
| hidden charges · what they don't tell you | mandatory charges, all published |

The reason is not politeness. A publication whose credibility rests on
reproducing official figures exactly cannot simultaneously imply that the
officials are misleading anyone. If a utility ever does conceal a charge, that
is a story, and it will be reported with the document that proves it.
