# NEW YORK — 47 YEARS
## The first TWJ back-series

Scenario `TWJ-R180-v1.0` · 49 schedules, FY1980 to FY2027 · computed 14 August 2026

---

## What was done

The New York City Water Board publishes its metered water and sewer rate history from Fiscal Year 1980. Every one of those 49 schedules has now been run through the same calculator, under the same scenario, as the 2026 figure: 180 m³ a year on an ordinary metered residential account, converted from the published unit of one hundred cubic feet, with the wastewater charge applied as the percentage the Board set in that year.

Nobody has to trust the result. The rates are public, the formula is published, and the arithmetic is one multiplication and one percentage.

**This is the moat, and it took an afternoon rather than five years.** The assumption all along was that the historical series had to be accumulated forward from launch. For New York it did not. The history was already public — it had simply never been normalised to a single comparable scenario.

---

## The series

Monthly equivalent, nominal USD, not inflation adjusted.

| Effective | Water / 100 cu ft | Sewer % of water | Water supply | Total services | Effective / m³ |
|---|---|---|---|---|---|
| Jul 1979 | $0.525 | 25% | $2.78 | **$3.48** | $0.23 |
| Jul 1984 | $0.62 | 50% | $3.50 | **$5.59** | $0.37 |
| Jul 1989 | $0.87 | 88% | $4.61 | **$8.66** | $0.58 |
| Jan 1990 | $0.95 | 112% | $5.03 | **$10.67** | $0.71 |
| Jul 1992 | $1.01 | 159% | $5.35 | **$13.86** | $0.92 |
| Jul 1999 | $1.30 | 159% | $6.89 | **$17.84** | $1.19 |
| Jul 2004 | $1.60 | 159% | $8.48 | **$21.95** | $1.46 |
| Jul 2009 | $2.61 | 159% | $13.83 | **$35.81** | $2.39 |
| Jul 2014 | $3.70 | 159% | $19.60 | **$50.76** | $3.38 |
| Jul 2019 | $3.99 | 159% | $21.14 | **$54.74** | $3.65 |
| Jul 2024 | $4.87 | 159% | $25.80 | **$66.82** | $4.45 |
| Jul 2026 | $5.35 | 159% | $28.34 | **$73.40** | $4.89 |

Full 49-point series: `data/series/newyork-standard-bill.json`

---

## Four findings

### 1. The bill grew twice as fast as the water

Over 47 years the standard household bill rose **21.1×**. The water component rose **10.2×**.

```
Total water services   6.70% a year
Water supply only      5.06% a year
```

The gap is entirely wastewater. A reader looking only at the water rate would conclude New York's water roughly tracked inflation over two generations. The bill did not.

### 2. Wastewater went from a quarter of the water charge to more than one and a half times it

Every change the Board made:

| Effective | Sewer as % of water | Wastewater's share of the whole bill |
|---|---|---|
| Jul 1979 | 25% | 20.1% |
| Jul 1980 | 33.3% | 25.1% |
| Jul 1982 | 50% | 33.4% |
| Jul 1984 | 60% | 37.4% |
| Jul 1987 | 70% | 41.2% |
| Jul 1988 | 75% | 42.9% |
| Jul 1989 | 88% | 46.8% |
| Jan 1990 | 112% | 52.9% |
| Jul 1991 | 136% | 57.6% |
| Jul 1992 | **159%** | **61.4%** |

Ten increases in thirteen years, then frozen for thirty-four. Since July 1992 the ratio has not moved once.

**This is the single strongest argument for publishing two figures instead of one.** In 1979 a water-only comparison described 80% of a New Yorker's bill. Today it describes 39%. The same metric, unchanged, quietly stopped meaning what it used to mean — and any index that had published only "the price of water" across those years would have shown a false trend without a single wrong number in it.

### 3. The crossover happened in January 1990

That is the moment the wastewater charge passed the water charge and never went back. It took ten months: 88% in July 1989, 112% in January 1990. From that date, most of what a New York household pays for water is not for water.

### 4. The steepest increases are older than most readers expect

| Effective | Increase in the standard bill |
|---|---|
| Jul 1982 | +24.3% |
| Jan 1990 | +23.2% |
| Jul 1987 | +18.7% |
| Jul 1991 | +18.4% |
| Jul 1989 | +15.3% |

Every one of the five largest single-step increases falls between 1982 and 1991, and every one is driven by the sewer percentage rather than the water rate. The 2010s, widely reported at the time as a period of steep water increases, do not appear in the top five.

Three periods of genuine standstill: 1979–1981, 1991–1994, and 2015–2017, when the water rate held at $3.81 across three consecutive schedules.

---

## Caveats, stated plainly

**Nominal, not real.** No inflation adjustment is applied. In 1979 dollars the increase is far smaller, and a real-terms series requires a deflator choice that has not been made or published. Until it is, the nominal series is the only one shown.

**The Board's own caveat is carried forward.** The rate history table is described by the Water Board as informational; the individual Rate Schedules are the definitive billing basis. Each year's schedule is linked from the same page, and the back-series will be recomputed against those documents as they are archived. The source record states this.

**One scenario, not one household.** 180 m³ a year is a fixed yardstick applied to every year. Actual New York household consumption changed considerably across five decades, so this series measures the price of a constant basket, not what anyone actually paid.

**Grade A throughout, with one structural note.** The scenario is reproducible from the published rate in every year: no fixed charge, no assumed property characteristic, one declared unit conversion. The minimum daily charge existed throughout and was not binding at this volume in any year checked.

**Not yet published.** The snapshot of the rate history page has not been archived and hashed. The build withholds it, as it withholds the other three cities.

---

## What this changes

Three consequences follow, and they are not small.

**The back-series is a collection target, not a waiting game.** Thames Water publishes past charges schemes. Singapore dates its tariff revisions. Chile's regulator maintains historical tariff tables — which is why Santiago is in the launch set. The instruction to collect forward from launch was correct; it was also incomplete. Wherever a regulator archives its own schedules, the history can be recovered now.

**Depth beats breadth for this product.** One city with 47 years of normalised history is more defensible, more citable and more interesting than eleven cities with one year each. It is also the thing no competitor assembles in a quarter — not because the data is secret, but because normalising it requires a published scenario and a deterministic calculator, and by then they have built our product.

**The chart writes the article.** "Why New Yorkers pay more for sewage than for water, and when that started" is a story that could not be written before this afternoon, because nobody had put the two lines on the same axis.
