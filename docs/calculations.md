# TWJ WATER INDEX
## Open calculations — Scenario `TWJ-R180-v1.0`

Methodology v1.0 · computed 14 August 2026

Anyone holding the same primary documents can reproduce every figure below by hand. That is the point of publishing the arithmetic rather than the result.

---

## 1. The formula, in full

**Scenario.** 180 m³ per year on an ordinary metered residential account, at the utility serving most of the city. Displayed as a monthly equivalent — the annual model divided by twelve.

**Block resolution.** For volume *V* and each published block *i* with lower bound *Lᵢ*, upper bound *Uᵢ* and rate *rᵢ*:

```
Qᵢ(V) = max(0, min(V, Uᵢ) − Lᵢ)

C_v(V) = Σᵢ Qᵢ(V) · rᵢ
```

**Water supply**

```
TWJ_water = C_v + F_w + S_w + T_w − R_w
```

**Total water services**

```
TWJ_services = TWJ_water + C_ww + F_ww + S_ww + T_ww
```

| Term | Meaning |
|---|---|
| `C_v` | Volumetric charge, resolved through the published blocks |
| `F` | Mandatory fixed, standing and meter charges, prorated to the month |
| `S` | Mandatory water-specific surcharges and levies |
| `T` | Taxes, applied over the base the utility publishes them against |
| `R` | Rebates — subtracted only if automatic, universal to the class, and a standing feature |

**Volume basis by tariff shape**

| Shape | How the 180 m³ is resolved |
|---|---|
| Flat | 180 × rate, ÷ 12 |
| Monthly blocks | 15 m³ through the block schedule, each of twelve months |
| Annual cumulative bands | the full 180 m³ through the annual bands, ÷ 12 |
| Seasonal | each month at 15 m³ against its own schedule, summed, ÷ 12 |

**Units.** A rate is stored in the unit the utility publishes it in. Conversion is declared on the component and performed by the calculator:

```
1 hundred cubic feet (ccf) = 2.8316846592 m³
1 thousand US gallons      = 3.785411784 m³
```

---

## 2. Singapore — Grade A

**Source.** PUB, Singapore's National Water Agency. Water price effective 1 April 2025.
**Shape.** Monthly blocks, threshold 40 m³. The scenario sits entirely in the first block.

| Component | Published rate | × 15 m³ |
|---|---|---|
| Water Tariff | S$ 1.43 / m³ | 21.45 |
| Water Conservation Tax | S$ 0.72 / m³ | 10.80 |
| Waterborne Tax | S$ 1.09 / m³ | 16.35 |

```
Water Supply     = (1.43 + 0.72) × 15 × 1.09          = S$ 35.15
Total Services   = (1.43 + 0.72 + 1.09) × 15 × 1.09   = S$ 52.97
Effective        = 52.97 ÷ 15                          = S$  3.53 / m³
```

GST at 9% is applied over the total of the three components — a tax computed on a base that already contains two taxes. This is the published order and the calculator follows it.

**Excluded.** U-Save rebates. They are automatic, but eligibility depends on housing type, so they fail the second condition of the rebate test and are shown as an affordability note rather than subtracted.

**Open item.** Confirm whether PUB publishes the Water Conservation Tax as S$ 0.72/m³ or as 50% of the water tariff. Both give the same figure today and diverge at the next tariff change. The stored component must match the published form.

---

## 3. London — Grade B

**Source.** Thames Water Household Charges Scheme 2026-27, version 2.0, published 29 May 2026, effective 1 April 2026. Table 2 volumetric charges; Table 1 metered fixed charges, single households.
**Shape.** Flat volumetric plus annual fixed charges.

| Component | Published rate | Annual | Monthly |
|---|---|---|---|
| Water supply service | 273.46 p / m³ | 492.23 | 41.02 |
| Metered fixed charge — water | £66.87 / year | 66.87 | 5.57 |
| Wastewater service | 147.21 p / m³ | 264.98 | 22.08 |
| Metered fixed charge — wastewater, full | £128.13 / year | 128.13 | 10.68 |

```
Water Supply     = (2.7346 × 180 + 66.87)  ÷ 12   = £ 46.59
Total Services   = (952.21)                 ÷ 12   = £ 79.35
Effective        = 952.21 ÷ 180                    = £  5.29 / m³
```

**No VAT.** Domestic water and wastewater charges in the United Kingdom carry none.

**Same volume both sides.** Thames bills wastewater on the full metered volume; the published wastewater rate already assumes up to 10% is not returned to the sewer (clause 6.1.3). No 90% factor is applied.

**Why Grade B — two declared assumptions.**
1. Metering is not universal in the region, so the standard household is defined as metered.
2. The full wastewater fixed charge is used, not the abated £80.43 — the surface water drainage rebate is not claimed.

**A live demonstration of the source rule.** A widely read secondary site gives Thames's 2026-27 rates as 247.43 p/m³ water, 154.80 p/m³ wastewater, and standing charges of £63.96 and £130.22. The primary scheme gives 273.46, 147.21, £66.87 and £128.13. Every one of the four is wrong. Using them would have overstated the wastewater rate and understated the water rate, and the error would have been invisible in the final figure.

---

## 4. New York — Grade A

**Source.** New York City Water Board, Water and Wastewater Rate Schedule effective 1 July 2026. Part II §1.A; Part III §2.
**Shape.** Flat, published per hundred cubic feet.

```
Volume        180 m³ ÷ 2.8316846592      = 63.5664 ccf / year

Water         63.5664 × $5.35            = $ 340.08 / year → $ 28.34 / month
Wastewater    159% of the water charge   = $ 540.73 / year → $ 45.06 / month

Total Services                            = $ 880.81 / year → $ 73.40 / month
Effective     880.81 ÷ 180                = $   4.89 / m³
```

**The wastewater charge is stored as a percentage, not as a rate per volume,** because that is how the Water Board defines it. Converting it to a per-m³ rate would silently create a number the city has never published.

**Minimum charge checked and not binding.** The $0.49 per day per meter minimum totals about $178.85 a year, well below the $340.08 actually charged at this volume. Checked rather than assumed.

**Grade A.** No fixed charge, no assumed property characteristic, and the only conversion is a declared unit conversion.

---

## 5. The three together

| City | Water Supply | Total Water Services | Effective / m³ | Grade | Tariff effective |
|---|---|---|---|---|---|
| Singapore | S$ 35.15 | **S$ 52.97** | S$ 3.53 | A | 1 Apr 2025 |
| London | £ 46.59 | **£ 79.35** | £ 5.29 | B | 1 Apr 2026 |
| New York | $ 28.34 | **$ 73.40** | $ 4.89 | A | 1 Jul 2026 |

**No cross-currency comparison is published here.** Conversion requires a monthly period-average rate fixed to a named month, and that month has not been set. Publishing a dollar figure without it would be the first unsourced number on the site.

**What the two columns show that one would hide.** New York has the lowest water supply cost of the three and the second-highest total, because its wastewater charge is 159% of the water charge. On a water-only comparison New York looks cheap; on a total-services comparison it does not. Both are true, which is why the methodology publishes both.

---

## 6. The remaining cities

Nothing is published for these. Each entry states the primary document required and the shape the calculator must already handle.

| City | Utility | Required document | Expected grade | Engine shape |
|---|---|---|---|---|
| **Dubai** | DEWA + Dubai Municipality | Residential slab tariff with fuel surcharge, and the municipal wastewater schedule | B | Monthly blocks + volumetric surcharge + VAT over a declared base, across two authorities |
| **Tokyo** | TMG Bureau of Waterworks | Official bill-calculation schedule | B | Blocks + fixed charge varying by meter diameter — the assumed diameter must be printed |
| **Los Angeles** | LADWP | Water rate ordinance | B | Seasonal, twelve months computed separately; allocation depends on tier rules |
| **Cape Town** | City of Cape Town | Annual tariff schedule | A | Steeply banded blocks; 15 m³ sits mid-band |
| **Perth** | Water Corporation | Residential price schedule | A | Annual cumulative bands — the reason the scenario is stored annually |
| **Riyadh** | NWC / Saudi Water Authority | Residential tariff schedule | B | Blocks, with a subsidy stated in words and never adjusted for |
| **Mexico City** | SACMEX | Tariff schedule | C | Publishable only as context: the tariff describes a minority of households, with tanker delivery priced outside it |
| **Reykjavík** | Veitur | Water and wastewater bills | C | Not computable. Charges are fixed by property size, not usage. There is no price per cubic metre to publish |

Two of these — Mexico City and Reykjavík — are expected to produce no comparative figure at all. That is a result, not a gap, and both belong in the Index for exactly that reason.

---

## 7. Publication status

All three verified cities are currently **withheld by the build**, and the build prints the reason:

```
published  0
withheld   3   london, newyork, singapore
  − source has no archived snapshot hash (Rule 7.2)
```

The arithmetic is verified and every fixture passes. What is missing is the archived snapshot of each primary document with its hash. A utility page updated next April stops proving a figure dated today, so a live URL is not provenance.

Three PDFs, three hashes, and the Index publishes its first cities.
