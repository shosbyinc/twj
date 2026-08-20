# TWJ URBAN WATER TARIFF INDEX
## Index Methodology — Beta v0.1

**Status:** Beta. No index value is published.
**Companion to:** TWJ City Benchmark Methodology v1.6, which this document does
not modify. City benchmark methodology and index methodology are separate
documents on purpose: one measures what a household pays in a city, the other
aggregates movement across cities, and mixing them has already caused one wrong
implementation.

---

## 1. What the index measures

The structural level of residential water tariff liability for a standard service
bundle, and its movement over time. It is not a cost of production, not a
comparison of price levels between cities, and not an affordability measure.

## 2. The formula

For each constituent city, a local-currency structural price relative:

    r_i,t = P_structural_i,t / P_structural_i,base

And the index is their weighted geometric mean:

    UWTI_t = 100 × exp( Σ_i w_i · ln r_i,t )

## 3. Why not a median of bills in USD

The previous implementation converted bills to USD and took a median. That is
wrong in a way no care in collection could repair: **a water tariff index must
not move because a currency moved.** If no city changed a tariff and the dollar
fell ten per cent, a USD-based index reports a ten per cent change in the price of
water. It is reporting the currency market.

Each relative above is a ratio of one city's currency to itself. There is nowhere
for an exchange rate to enter, and `fx_used: false` is returned to say so.

USD and PPP views remain useful as *comparison* presentations of a point in time.
Neither enters the time series.

## 4. Why geometric

The quantities are ratios. The mean of a doubling and a halving should be no
change, and only the geometric mean gives that: the arithmetic mean of 2 and 0.5
is 1.25, reporting a 25% rise where nothing happened on average. The geometric
form also makes the index invariant to the units each city is priced in.

## 5. Structural, never payable

The basket takes the structural price — City Benchmark §5.4. Tokyo under a
four-month basic-charge waiver pays about a quarter of its tariff; the index
tracks the tariff, because the waiver expires and the base does not. A base period
that captured the waiver would embed a temporary budget decision in the permanent
geometry of the index.

A **tariff state** is the opposite case and does enter. Sydney's drought rate is
part of the tariff architecture, so its activation moves the structural relative.

## 6. Weighting

    weighting_method = equal_city
    w_i = 1 / N

Population weighting is not introduced until a denominator dataset of uniform
quality exists for every constituent. An unequal weight is a claim about
importance and needs its own evidence.

Weights must sum to one, and the engine refuses a basket where they do not.

## 7. The basket is not the database

    DATABASE COVERAGE ≠ INDEX BASKET

The constituent list is frozen between scheduled reconstitutions, recommended
annually. A new city entering the database does not rewrite index history. A
constituent missing a price for a period is refused, never silently dropped —
dropping one would change the index by changing its membership rather than by
any tariff moving.

Basket changes are joined by chain linking.

## 8. Entities

    index_basket            frozen membership, weights, base period, version
    index_constituent       a city's participation, with its base structural price
    index_observation       a dated index value and the relatives behind it
    basket_reconstitution   a scheduled membership change, chain linked

## 9. Release thresholds

Internal governance targets, not external standards:

    Research Preview   ≥ 10 Grade A supply cities
    UWTI Beta          ≥ 30 Grade A cities, ≥ 15 countries
    UWTI Candidate     ≥ 50 Grade A, with operational change monitoring
    UWTI 1.0           ≥ 75 Grade A, ≥ 40 countries, formal basket,
                       independent external review

At five published cities this document specifies an index that is deliberately
not yet computed. It exists now so that the formula in production code is not
knowingly wrong while the cities are collected.

## 10. Not in scope

Affordability, water scarcity, true cost of water and any composite score are
separate products with their own methodologies. Income does not enter the UWTI.
