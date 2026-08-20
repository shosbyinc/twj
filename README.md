# TWJ Water Index

The repository *is* the database.

Every published figure is produced by a deterministic calculator from stored
tariff components, verified by two people, and traceable to an archived primary
document. Git provides what a database would otherwise have to be taught:
an append-only history, a signed author for every change, and a diff for every
correction.

## Methodology

`docs/methodology-v1.1.md` — frozen, and the freeze is enforced by a test
rather than by intention. Scenario `TWJ-R180-v1.0`: 180 m³ per year on an
ordinary metered residential account, displayed as a monthly equivalent.

`docs/methodology-v1.0.md` is retained, superseded and unaltered. Nothing here
is deleted.

**Why there is a v1.1.** v1.0 was frozen and the engine changed underneath it.
The document graded London and Dubai B; the engine graded them A. The document
required both headline figures to be published together; the site ships Dubai's
supply figure while holding its services figure. The document's Singapore
fixture asserted Grade A at S$ 35.15; the engine refuses to price Singapore.
Three frozen rules were no longer the rules being applied, and the change policy
that exists to prevent exactly this was never invoked.

Nothing noticed. The CI step named *Refuse a silent methodology change* fired
only when the document was edited, and its condition — that `src/engine.js`
contains the string `Methodology v1` — was satisfied by the engine's own header
comment. It could not fail in either direction.

v1.1 moves no published number. Every figure it prints is what the engine
already produced. What changes is that the document now says so.

## The freeze, enforced

Every frozen constant lives once, in `src/methodology.js`. The `declared` block
in §13 of the document quotes it. `test/methodology-sync.test.js` parses that
block, compares it against the constants, and recomputes each fixture from its
stored tariff — closing the loop document → constants → arithmetic.

Change a rule in one place and the build fails. Break it deliberately and it
says which link parted:

    document says London grade B, constants say A   → document vs constants: grade
    constant says Dubai 143.83, engine says 143.85  → the engine disagrees on water supply
    version bumped in code but not in the document  → 1 failing suite

A frozen rule that exists only as prose is not frozen. It is unread.

Two headline figures, always published together:

| Figure | Contents |
|---|---|
| **Water Supply** | volumetric + fixed + surcharges + taxes − universal rebates |
| **Total Water Services** | the above, plus the same terms for wastewater |

## Layout

```
data/cities/*.json       one record per city
data/tariffs/*.json      published tariff schedules, by effective date
data/sources/*.json      primary documents, tier, URL, archived snapshot hash
data/corrections.json    public correction log, append only
src/engine.js            the deterministic calculator
src/acceptance.js        the gate: what may not be published, and why
src/publication.js       provenance, asked per metric rather than per city
test/engine.test.js      fixtures A, B, C and the methodology guardrails
scripts/site.js          the acceptance gate + the public payload
scripts/render.js        the payload becomes a site: preview, or a deploy tree
archive/                 archived source PDFs, named by source id and date
```

## A rule that was documented but not run

`scripts/build.js` held the acceptance gate. When the pipeline moved to
`site.js`, the gate did not come with it — and for a while this file described
a build that refuses to publish an unverified city while the build actually
running refused nothing. Every condition below was true of a script no command
invoked.

That is a worse failure than an absent rule. An absent rule is visible; a
documented rule that does not execute gets quoted as though it had.

The gate now lives in `src/acceptance.js`, runs inside `site.js`, and has
tests that break a city on purpose to prove it bites. `build.js` is deleted:
its logic is not lost, it is finally being enforced.

## Commands

```bash
npm test       # the fixtures, the guardrails and the acceptance targets
npm run build  # dist/index.html — one self-contained file, opens from disk
npm run deploy # dist/site/ — the uploadable tree, one file per address
```

The two outputs answer two questions. The preview is a single file with its
images inlined: it can be opened from a folder, sent to a phone, and checked
by someone who has not cloned the repository. The deploy tree is what a
server needs — real paths, real assets, a page per address, a sitemap.

Nothing is typed into either. Both are the same template filled from the same
payload; the only difference is where the images live and how many files the
router is given to work with.

## What the engine refuses to do

These are not warnings. The calculation throws.

- Multiply a marginal block rate by 15 instead of resolving the blocks
- Read a missing rate as zero
- Subtract a rebate that is not universal and automatic
- Assign Grade A to a bill containing an assumed component
- Publish a standardised comparative bill for a Grade C system
- Estimate Water Supply where the streams are inseparable
- Apply a tax without a declared base
- Calculate against a scenario other than the one it implements

## What the build refuses to publish

A city is withheld — visibly, with its reasons — when it lacks two verifiers,
a named utility, a tier 1 or 2 source, or an archived snapshot hash. A withheld
city is not a build failure. Shipping it silently would be.

## Current state

This section is dated. The build prints the live figure every run — read that
rather than this, and treat the sections below as a chronological record of
how each decision was reached rather than as a description of today.

    modelled   4
    grade A    3   dubai, london, new york
    grade B    1   singapore — Water Conservation Tax rounding stage open
    published  3   supply figures, provenance complete
    withheld   1   singapore — fewer than two verifiers (Rule 9.3)
    held       1   dubai total water services — decree 47/2024 not obtained

## Singapore, and what a document is for

Singapore was unpriced because PUB publishes its rate table as an image. On
17 August 2026 the rates were established from PUB's own media release of
27 September 2023, whose Annex A is an HTML table: tariff 1.43 below 40 m³,
Waterborne Tax 1.09, and the Conservation Tax rule stated in the footnote as
50% of tariff. Archived and hashed. SP Services, PUB's billing agent, evidences
that the 1 April 2025 rates are still in force at Q3 2026 — an announcement of
a future revision cannot do that by itself.

The city now computes: water supply S$ 35.07, total water services S$ 52.89,
effective S$ 2.338 per m³, Grade B.

**Grade B, because one thing is still open** — and it is smaller than first
described. The Annex A row is labelled *(% of Tariff)* and prints 0.72; the rule
in its own footnote gives 50% of 1.43 = 0.715. Precedence puts the formula above
the presentation table, so 0.715 is stored and 0.72 is kept in the conflicts log.
The two differ by S$ 0.08, which is U = 0.233%.

**The private invoice was demoted from blocker to second opinion**, because the
questions it was being sought to answer turned out to be published. SP's own
*Understanding Your Utilities Bill* carries a sample redesigned bill and states
the rounding order outright: GST is computed per individual item and the items
summed, not applied once to a grand total. Two water lines on that sample are
legible — rate 1.4300 against 33.89, and 1.0900 against 25.83 — and both resolve
to one consumption of 23.7 m³, which the engine reproduces exactly. That is the
same independent reconciliation Dubai has through its verified invoice, obtained
from a public document. `test/singapore-reconciliation.test.js` holds it.

The 9% GST is now sourced to IRAS. Until that capture it sat in the stored tariff
with nothing behind it — a rate taken on trust inside a record whose whole claim
is that nothing is. A test now fails if any Singapore rate lacks a source.

What is left is one field: the Water Conservation Tax rate on that same sample
bill, printed to four decimals like its neighbours, but sitting in a region the
PDF's text layer does not expose. Either 0.7150 or 0.7200 closes it and lifts the
city to Grade A.

**And it is withheld, because of a person rather than a document.** Rule 9.3
requires two-person review of a new tariff structure, and monthly blocks with a
tax applied to a base containing another tax is a new structure. One reader has
read it. Until a second has, the gate prints *fewer than two verifiers* where
the number would go — which is what the gate is for, and the reason a
placeholder name was not written into `verified_by` to make the count pass.

Three positions on this one city in three days — A at S$ 35.15, then C, then B
at S$ 35.07 — each printed with its reason. §10 sits outside the frozen range,
so no version increment is due: the figures moved because the evidence moved.

## UWTI — the index layer

`src/uwti.js` implements the TWJ Urban Water Tariff Index on a frozen 2026 base.

Two series, published together wherever both exist:

| Series | Measures |
|---|---|
| **UWTI-W** | standardized residential water supply |
| **UWTI-S** | total water services — water, wastewater, mandatory drainage |

A supply-only index measures a shrinking share of the bill. New York's water
component was 80% of a household's bill in 1979 and is 39% today. An index
built on supply alone would have shown a false trend across that period
without publishing a single wrong number. Both series exist for that reason.

**The base cannot be frozen today, and the code says so.** `freezeBase()`
refuses a basket with fewer than 20 constituents, more than one territory per
country, or any constituent below grade A. Run against the four cities
currently modelled it throws with three reasons: too few, and London and Dubai
are grade B. No UWTI value is publishable until the basket is real.

Once frozen, the denominator never moves. Adding Santiago in 2028 cannot
change Singapore's 2026 value — there is a test for exactly that.

Values carry their unit. `84` is never printed bare; it is
`84 pts vs TWJ-2026 base`.

## Exact arithmetic

`src/decimal.js` holds money as BigInt scaled by 10¹². Binary floating point
cannot represent 0.715 or 1.43 exactly, and the error accumulates across
components, across a percentage, and across a 49-point back-series. A figure a
reader cannot reproduce digit-for-digit is not provenance. Nothing rounds until
display, unless the utility's own rule requires it — and then the rounding is
declared on the component.

## Source precedence

When a document states a formula and also prints a rounded rate, the formula
wins:

    statutory formula → official billing formula → invoice rate
    → rounded presentation table → derived secondary rate

PUB defines the Water Conservation Tax as 50% of the water tariff and prints
S$ 0.72/m³ in its table. Fifty percent of S$ 1.43 is S$ 0.715. The engine uses
0.715, stores 0.72 as the alternative, and flags `rounding_rule_unknown`. The
0.23% spread caps Singapore at grade B until an invoice settles it.

## Materiality

    U = (Bmax − Bmin) / ((Bmax + Bmin) / 2)

    U = 0      grade A available
    U ≤ 1%     grade B, assumption disclosed
    U > 1%     grade C, no headline value

Dubai fails it. DEWA lists a meter service charge of AED 5 for Type 1 and AED 7
for Type 2 without publishing which applies to a standard residential
connection. The bill ranges from AED 138.58 to AED 145.95 — a 5.2% spread. The
engine refuses the calculation and names the unresolved component.

## Reconciliation

The engine is validated against real bills, not only against itself.
`test/fixtures/dubai-invoice-reconciliation.json` runs the Dubai tariff model
at a verified invoice's own volume — 3,740 imperial gallons — and asserts every
line to the fils:

    Water            3,740 IG × 0.035    AED 130.90
    Fuel surcharge   3,740 IG × 0.005    AED  18.70
    Meter service                        AED   5.00
    Subtotal                             AED 154.60
    VAT 5%                               AED   7.73
    Water total                          AED 162.33

A reconciliation run sets `reconciliation_volume_m3` and is marked
not publishable: it exists to prove the engine, not to produce a figure.

**What the invoice changed.** Three things the published pages did not settle:

1. The fuel surcharge is billed per imperial gallon, not per m³. Same rate,
   different native unit — and the native unit is what gets stored.
2. The meter service charge is AED 5.00, once per monthly bill. This is the
   component that held Dubai at grade C.
3. VAT applies to the subtotal *including* the meter charge. The model had the
   VAT base wrong.

Dubai's scenario figure moved from AED 138.58 to **AED 143.83** and the grade
from C to B. It is not A: DEWA publishes no mapping establishing Type 1 as the
standard residential connection, so the meter profile rests on one invoice.

The invoice also carries no sewerage line, so Total Water Services for Dubai
remains withheld.

## Two kinds of B

The methodology graded uncertainty and scope with the same letter, and that
conflation is what made a grade A basket look unreachable.

**Uncertainty** — the bill could be more than one number and we do not know
which. Singapore: 35.07 or 35.15, depending on where the utility rounds.
Dubai: 143.83 or 145.93, depending on meter type. This is an error bar,
measured by U and never argued about.

**Scope** — the bill is exactly one number, but it describes a defined subset
of households. London's reference account is metered in a region where
metering is not universal. Nothing about the figure is uncertain; what it
represents is narrower than "a London household".

A scope disclosure is not an error. Grading it as one bars a city with a
perfectly determined tariff from the base basket for being honest about who it
describes. **The grade now follows uncertainty alone; scope travels with the
figure as a printed disclosure.**

Regraded on that basis:

| City | U | Grade | Note |
|---|---|---|---|
| New York | 0% | **A** | no assumption required |
| London | 0% | **A** | scope: metered reference account |
| Singapore | 0.23% | B | rounding stage unconfirmed |
| Dubai | 1.45% | C | meter type unresolved |

## Basket readiness

`basketReadiness()` measures the yield instead of hoping for it:

    audited                    4
    grade A                    2
    admissible                 2   (one territory per country)
    still needed              18
    observed yield            50%
    projected audits          40
    can freeze             false

At the observed yield, twenty grade A observations imply auditing about forty
cities. That number is a projection from four data points and will move — but
it is the difference between a plan and a hope, and it should be recomputed
after every city.

## What changed

`src/monitor.js` and `scripts/monitor.js`. A reference layer is only as good as
the moment it notices it is wrong.

Every source carries a content hash from the moment it was captured. The
monitor re-hashes, compares, and produces a change record. Cadence windows vary
by class — DEWA's fuel surcharge is checked on a 25-day window because it
resets monthly; a tariff schedule on 30 days; a rate history on 180.

Three states, and the third is the one that matters:

| State | Meaning |
|---|---|
| `current` | unchanged, inside its window |
| `verification_due` | unchanged, past its window |
| `stale` | content changed, or the source could not be reached |

**Detection is automatic. Publication is not.** A changed source moves its
observations to `stale` and opens a review. No figure on the site is ever
republished by a script. An unreachable source is stale too — a check that
could not be performed is not a check that passed.

The reader-facing output is a monthly line. When nothing moved it says so, and
that is the stronger claim:

    No published tariff changed this period. 7 sources re-checked.

Run today it says something less comfortable and more useful:

    checked 7 · current 0 · due 0 · stale 7
    − every source: no baseline hash captured

Seven sources, none archived. The monitor's first output is the list of work
that has to happen before the Index can publish anything at all.

## Base period

`TWJ-2026`, base month **July 2026** — the last completed calendar month at
freeze time. Not August: DEWA sets its fuel surcharge per month, and freezing
a denominator against a rate still in force would fix the base to an
unfinished month.

## The eight-point Grade A gate

`src/gradeA.js`. A grade is not awarded by judgement. Each point must be
satisfied by a stored field and the gate names the ones that are not.

    primary source · current tariff with a date · customer class
    residency class · volumetric tariff · all recurring fixed fees
    all mandatory levies and taxes · reproducible calculation

Reconciliation against an invoice or official calculator is recorded either
way. Its absence does not bar grade A, but a figure never checked against a
real bill is a different kind of figure from one that has been.

Run against the four cities:

| City | Gate | Missing |
|---|---|---|
| London | **A** | — (two scope disclosures) |
| New York | **A** | — |
| Singapore | B | mandatory levies — rounding stage unconfirmed |
| Dubai | B | recurring fixed fees — meter type not published |

## London, resolved

Thames website pages show £65.76 for the assessed household tariff and £81.76
for unmetered customers. Neither is the metered fixed charge, and treating
either as one would have produced a wrong bill from an official URL. Table 1
of the Charges Scheme 2026-27 gives **£66.87** water and **£128.13**
wastewater for single households, and the Scheme is the document of record.

Source precedence resolves it. London is grade A at **£46.59**, with two scope
disclosures: the reference account is metered, and the full wastewater fixed
charge is applied rather than the abated £80.43.

## Residency is a required field

The same city can hold two prices for reasons of entitlement rather than
consumption. EtihadWE publishes AED 3.30/m³ flat for citizens against AED
7.70/m³ for expatriates on the first slab. The benchmark uses the general
non-concessionary class; the concessionary plan is stored separately and never
averaged with it.

## Epistemic categories

    observed     read directly from a primary document
    rule         a formula stated by the authority, applied by us
    derived      computed by TWJ under the scenario
    third_party  a modelled indicator published by someone else

PUB's S$1.43 is observed. "50% of tariff" is a rule. S$35.07 is derived. WRI's
stress category is third-party. Mixing them is how a modelled figure comes to
look like a measured one.

## Tariff transparency

Six declarations printed beside each city, explaining a figure without scoring
it: subsidised, nationality-dependent, wastewater included, fixed charge,
consumption blocks, variable surcharge.

Where a tariff is subsidised the page says so plainly: **a low bill measures
what the household pays, not what the water costs to produce.** Abu Dhabi's
regulator states openly that end-user tariffs may sit below cost with the gap
met by government. No city may be called cheap, efficient or best on the
strength of a small bill.

## Dubai — the full evidence chain

    legislation → current tariff page → verified invoice → engine → exact reconciliation

Grade A, July 2026 base:

| | |
|---|---|
| Water consumption | AED 115.48 |
| Fuel surcharge | AED 16.50 |
| Meter service charge, Type 1 | AED 5.00 |
| VAT 5% | AED 6.85 |
| **Standard Water Supply Bill** | **AED 143.83** |
| Sewerage, 2.0 fils/IG, no VAT | AED 65.99 |
| **Total Water Services** | **AED 209.82** |

**143.83, not 143.85.** The legislation sets 0.035 AED per imperial gallon;
DEWA's AED 7.70/m³ is that rate restated and rounded, since 0.035 × 219.9692 =
7.6989. Source precedence takes the statutory unit. The difference is 0.014% —
the same class of question as Singapore's 0.715 against 0.72, and far inside
the materiality ceiling.

**The invoice validates the legislation, not the other way round.** Its
sewerage line is AED 49.50 on 3,300 IG, which is exactly 1.5 fils per gallon —
the 2025 rate under Decree No. 47 of 2024. That resolves a conflict this
repository carried for two days between 1.0 and 2.0 fils: the schedule is 1.5
in 2025, 2.0 in 2026, 2.8 from 2027.

**Grade A because the meter type is scope, not uncertainty.** The reference
customer is a Residential – Flat account on a Type 1 meter. A Type 2
connection at AED 7.00 is a different reference customer, not a second
possible value for this one. The engine now distinguishes `assumed` from
`scope`: the first forbids grade A, the second is printed beside the figure.

## Billing lag

On the verified invoice the water line covers 3,740 IG and the sewerage line
covers 3,300 IG — the previous month's volume, because the municipality charge
trails the meter reading.

**The scenario computes each service's liability for the same standardized
volume. It never sums the lines that happen to share one calendar invoice.**
Doing so would compare one month of water against another month of sewerage.
There is a test for it.

The Housing fee of AED 229.17 on the same invoice is a municipality property
charge and belongs to neither metric.

## Evidence privacy

The invoice is held privately. It carries name, account number, business
partner, premise number, address and meter number. It is never published, and
no screenshot appears without full redaction. The public methodology says only
that the calculation was independently reconciled against a residential DEWA
invoice.

## The tariff curve

`src/curve.js`. A single volume measures a tariff at one point; it does not
describe it.

    P(V) = B(V) / V     at 5 · 10 · 15 · 20 · 25 m³

15 m³ stays the headline because a reader needs one number. It is not the
data — it is the point at which we measure a published function.

| City | 5 m³ | 15 m³ | 25 m³ | Shape | Ratio |
|---|---|---|---|---|---|
| Dubai | 10.288 | **9.589** | 9.449 | declining | 1.089 |
| London | 3.850 | **3.106** | 2.958 | declining | 1.302 |
| New York | 1.890 | **1.889** | 1.889 | flat | 1.001 |
| Singapore | 2.338 | **2.338** | 2.338 | flat | 1.000 |

Per cubic metre, supply only, local currency.

**The shape is dimensionless, so it compares across currencies when the bills
themselves cannot.** London's 1.302 says a five-cubic-metre household pays 30%
more per cubic metre than a twenty-five-cubic-metre one, because £195 a year
in standing charges is spread over less water. Singapore's 1.000 says the
opposite: no fixed charge exists to spread, and the price is the price.

That is a second cross-currency comparable alongside the wastewater share, and
neither needs an FX rate.

**Published rate against effective price.** Dubai prints AED 7.70/m³ and the
scenario pays AED 9.589 — 24.5% higher, entirely surcharge, meter fee and VAT.
London prints £2.7346 and pays £3.106. The gap is the product.

**A caution the curve makes visible.** Two cities can meet at 15 m³ and be
different instruments either side of it. Any ranking built on one volume is a
ranking of that volume, not of the tariffs.

## Editing the site without touching code

Two files under `content/` drive everything editorial. Change them and run
`npm run build`.

**`content/rubrics.json`** — the rubrics. Each has an `active` flag. Set Earth
to `true` and it appears; set Human Performance to `false` and it goes. The
Instagram feed carries more rubrics than the site does, and the inactive ones
are kept in the file with a note saying why they stay in the feed.

**`content/stories.json`** — the featured piece, the big question, and the
cards on the home page. A card's `rubric` must match an active rubric id.

No figure lives in either file. Everything numeric comes from the engine.

## Publishing a city

    npm run archive                          # lists what is still needed
    npm run archive -- pub-water-price ~/Downloads/pub-water-price.pdf
    npm run build

`archive` copies the document into `archive/`, computes its SHA-256, and writes
the hash into the source record. That is the step that moves a city from
withheld to published, and it is the only step left for the four cities already
modelled.

A live URL is not provenance. A utility page replaced next April stops proving
a figure dated today; the archived copy does not.

## Writing an article

    npm run new -- "The Bend That Explains Water" science
    # edit content/articles/the-bend-that-explains-water.md
    # drop a cover at content/images/the-bend-that-explains-water.jpg
    # set status: published
    npm run build

Frontmatter fields: `slug`, `rubric`, `title`, `standfirst`, `question`,
`city`, `cover`, `cover_alt`, `published`, `author`, `status`.

`status: draft` keeps a piece out of the build. Setting `city` links the piece
to a city record in both directions: the article ends with a button into the
data, and the city page gains a button into the article.

The build refuses an article whose rubric is not active, so a piece cannot
quietly appear under a rubric that was switched off.

### House block

    :::figure AED 9.59 | per 1,000 litres | TWJ scenario, July 2026

Renders a large figure with its unit and source, so a writer drops a number
into prose without hand-writing HTML. Everything else is ordinary Markdown:
`##` headings, `>` pull quotes, `-` lists, `![alt](images/x.jpg)`, `---`.

## Archived sources, and what kind of copy each one is

TWJ captured what it could fetch directly. The kind of capture is recorded,
because they are not equivalent:

| Source | Kind | Meaning |
|---|---|---|
| Thames Charges Scheme | extract | Text of the components used, from a direct fetch of the original PDF |
| NYC rate schedule | extract | Text of the sections used, from a direct fetch of the original PDF |
| NYC rate history | extract | Text of the table, from a direct fetch of the page |
| PUB water price | page text | Full page. **The rate table on it is an image** |
| DEWA slab tariff | not captured | Never fetched by TWJ |
| Dubai Resolution 16/2011 | not captured | Never fetched by TWJ |
| DEWA invoice | not captured | Held privately; carries personal identifiers |

An extract is not the original file. It proves the figures were present at the
capture date and gives the monitor something to re-hash, which is most of what
provenance is for — but the record says plainly which it is.

## Singapore is grade C, and that is the finding

PUB's page states the rule in text: the Water Conservation Tax is a percentage
of the tariff, confirmed at 50% for domestic use below 40 m³ by a PUB media
release. **The rate table itself is published as a PNG.** No figure on it is
machine-readable.

So S$1.43, S$0.72 and S$1.09 are not established by anything TWJ holds. They
circulate widely, and every place they circulate is tier 5.

Singapore therefore appears in the Index described but not priced, with the
reason printed where the number would be. It is the clearest demonstration so
far of what the methodology is for: the figure was easy to find, easy to
believe, and impossible to prove.

An SP Services invoice would close it in one step — the same step that closed
Dubai.

## What the DEWA capture settled, and what it moved

Three screenshots of the slab tariff page, captured in Dubai on 16 August 2026,
each hashed and archived alongside a text extract of the values used.

**Settled.** The meter service charge of AED 5 for Type 1 is now on the tariff
page as well as on the invoice. Residential slabs 7.700 / 8.800 / 10.120 per m³
are confirmed from the publisher. The 5% VAT note is on the page.

**Confirmed the precedence rule again.** The page states the slab in AED per
cubic metre. The invoice bills 0.035 AED per imperial gallon. Over the invoice
volume of 3,740 IG the per-gallon rate gives exactly the 130.90 charged; the
per-cubic-metre rate gives 130.92. The billing formula outranks the
presentation table, so 0.035 per gallon stays.

**Moved the observation.** The captured page shows the surcharge for **August
2026**, not July. Nothing we hold evidences July. The Dubai record is therefore
dated August, and the base period question becomes operational: a frozen base
needs every constituent evidenced for the same month, and the month has to be
one where each city's surcharge is capturable.

## A monitor that disagreed with the archiver

The first real monitor run reported all five archived sources as changed. They
had not. `archive.js` hashed raw bytes; the monitor hashed whitespace-normalised
text, so the two never matched.

A monitor that cries wolf on every source is worse than none — it teaches the
reader to ignore the warning. Both now hash raw bytes, with a separate
`hashText` for live HTML where markup churns. There is a test asserting the two
agree.

    checked 7 · current 5 · due 0 · stale 2
    − dewa-invoice-2025-01: never archived
    − dubai-ecr-16-2011: never archived

## An invoice is never a tariff source

The rule is now enforced by an acceptance test. Every published tariff cites a
schedule, a piece of legislation or a regulator; the invoice sits in a separate
field, `validated_against`. It confirms that the engine reproduces real billing
logic — it does not supply a rate.

## Private validation documents

Two DEWA documents are held privately and appear here only as a hash:

    dewa-invoice-2025-01              sha256:467e748b…
    dewa-statement-2023-11-2024-04    sha256:2b881ccc…

`archive_kind: hash_only`. The files carry name, account number, business
partner, premise number, address and meter number, and are never placed in this
repository. The hash lets a future reader verify that the document reconciled
against was this one, without the document.

## Recorded conflicts

`data/conflicts.json`. When two official sources disagree, precedence decides
and **the losing value stays visible**.

**New York.** The DEP consumer page shows a combined FY2027 rate of $13.50 per
hundred cubic feet; the Water Board's Rate Schedule says $13.86. The Board
states the Rate Schedule is the definitive basis for billing, so 13.86 governs.

**Dubai.** The DEWA page states 7.700 AED/m³; the invoice bills 0.035 AED per
imperial gallon and its own column header says so. 0.035 × 219.9692 = 7.69892,
which the page rounds to 7.700. The billing formula outranks the presentation
table, so the scenario computes 3,299.538 IG × 0.035 = AED 115.48 and the bill
is **AED 143.83, not 143.85**.

That 0.014% does not change the grade. The rule does, and it is the same rule
that keeps Singapore's conservation tax on 0.715 rather than 0.72. A precedence
rule that bends for small differences is not a rule.

## Acceptance tests

`test/acceptance.test.js` holds the hard QA targets, separate from the unit
tests. A unit test protects an implementation; an acceptance test protects a
published number.

    Dubai    15 m³   AED 143.83 · AED 9.589/m³ · services AED 209.82
    Dubai    invoice AED 162.33, every line to the fils
    London   15 m³   £46.59 · £3.106/m³ · services £79.35
    NYC      15 m³   $28.34 · services $73.40

If any fails against the defined tariff version and customer profile,
publication is blocked until it is reconciled.

## The legislation settled the conversion, against us

Executive Council Resolution 16/2011 is now archived as an original PDF.
Schedule 2 sets residential water at **3.5, 4.0 and 4.6 fils per gallon**.

DEWA's page prints 7.700, 8.800 and 10.120 per m³. Each is the statutory rate
multiplied by **exactly 220** — which is the meter multiplication factor
printed on the invoice.

    3.5 × 220 = 7.700        4.0 × 220 = 8.800        4.6 × 220 = 10.120

So there was never a conflict between the two expressions. There was a conflict
between DEWA's working factor of 220 and the physical constant 219.9692, which
appears on the same invoice and is used only to display a cubic-metre figure
beside the metered gallons.

**We were using the physical constant. That was wrong.** Source precedence puts
the billing formula above a number we happen to prefer, and the utility does
not bill with 219.9692.

    Dubai, corrected
      Standard Water Supply Bill    AED 143.83 → 143.85
      Total Water Services          AED 209.82 → 209.85
      Standardized price            AED 9.589 → 9.590 per m³

Logged in `data/corrections.json`. A corrections log that only records other
people's errors is not a corrections log.

## The concessionary plan, from the legislation

Schedule 2, item 7: water for residences and farms of UAE nationals is **0.0
fils per gallon up to 10,000 gallons**, then 1.5. Article 2(f) exempts the same
category from the fuel surcharge.

At the reference volume of 15 m³ — 3,300 gallons — such a household pays
**nothing for water consumption and nothing for fuel**. Its whole bill is the
AED 5 meter charge plus VAT: AED 5.25 against AED 143.85 for the benchmark
household.

Stored as `dubai-dewa-2026-08-nationals.json` with `benchmark_eligible: false`.
It is context, never averaged into the Index, and there is a test asserting it
cannot move the benchmark figure.

## Hash-only sources and the monitor

A privately held document has no copy here to re-read, so the monitor now
treats `hash_only` as current rather than unreachable. Absence of a file is not
absence of provenance — the hash is the record.

## One city, one conversion

The final source registry supplied by the publisher applies **220** to water
(15 × 7.70 = 115.50) and **219.9692** to sewerage (15 × 219.9692 = 3,299.538
IG). Those are two different households in one city record.

The invoice settles it. Its sewerage line is AED 49.50 on **3,300 IG** — a
whole number only under a factor of 220, and exactly 15 meter units. The
municipality charge is computed on the same basis as the water charge.

    Sewerage at 15 m³   AED 66.00, not 65.99
    Total water services AED 209.85, not 209.84

## Publication is per metric, not per city

The registry records "Publication blocker: NONE". For the water supply figure
that is right — the legislation is archived, the tariff page is captured and
hashed, and the calculation reconciles exactly against a real invoice.

For total water services it is not. The 2026 sewerage rate of 2.0 fils per
gallon is read from Decree No. 47 of 2024, and that decree has not been
obtained or hashed. The invoice validates the schedule's **2025** step of 1.5
fils; it says nothing about the 2026 step.

So Dubai now ships its supply figure and holds its full bill:

    Standard Water Supply Bill    AED 143.85     published
    Total Water Services          AED 209.85     held

The city page prints *Held — awaiting one document* where the number goes, and
Dubai drops out of the wastewater-share comparison until the decree arrives.
A held metric is not a missing one; it is a metric with a named reason.

## The numbers card

A house block for the multi-figure card — vertical rail, turquoise dots, large
figures, light captions, source line:

    :::numbers Smith, Newell & Baker, 2012
    −1.5% | Body mass lost across twelve hours without fluid.
    4.1 → 8.8 m | Error in judging distance: more than doubled.
    :::

Each row is `figure | caption`. The line after `:::numbers` becomes the source.
Use `:::figure` for a single number in the flow of prose, `:::numbers` for a set.

## Articles now in the build

    earth               The Visible Fraction               6 min   featured
    myth                Water Was an Element               5 min
    science             The Last Step of Every Breath      6 min
    human-performance   Judgement Goes First               5 min

The Earth rubric was dormant in `content/rubrics.json` and is now active.

## Covers

`npm run cover -- <slug> <Article_TWJ_*.pdf>` lifts the cover out of the supplied
layout PDF. Those PDFs embed it as a lossless PNG at exactly 1080×1350, so the
original bytes are extracted rather than the page rasterised — rendering the page
would resample a perfectly good image and soften the type. Two files are written:
the 1080×1350 archival copy and the 700×875 the page actually loads.

Vertical story covers (1080×1920) are not in the layout PDFs and are still
supplied separately.

**`cover_credit`** is a new frontmatter field, rendered as a caption under the
cover on both the article page and the home poster. An image whose provenance is
stated is held to the same standard as a figure: a satellite photograph is
somebody's data, taken over a real place, and both belong under it. Earth pieces
carry it as a rule.

## Ten cities

    Published            Dubai · Hong Kong · London · New York · Perth
                         Seoul · Singapore · Sydney
    Exception records    Toronto · Abu Dhabi
    Research pending     Riyadh · Jeddah          (internal)

Eight published figures, every one recomputable from an archived document. Two
exception records where the reason for having no number is itself established
evidence. Two cities held internally because our own work is unfinished, which is
not a fact about them.

    23 archived sources · 12 tariff jurisdictions · 1 state observation
    17 corrections logged · 447 tests · methodology v1.7

### Sydney — the first rate that needed two kinds of evidence

    applicable rate = tariff rule + dated authoritative state observation

Sydney publishes two usage rates and a 60/70 storage trigger. The tariff document
gives the rule and cannot give the state. WaterNSW publishes Greater Sydney
storage at 92%, so the normal rate applies and the record carries that
observation with its own authority, date and hash — `observed_at` separate from
`retrieved_at`, because a document archived today can prove a past state.

The trigger mechanics are still unresolved: WaterNSW's wholesale determination
defines a 31-day lag, Sydney Water's retail page states the thresholds without
one, and the two instruments must not be conflated. **At 92% it cannot matter** —
thirty-two points above the threshold, moving 0.1 a week, no lag of any length
selects the drought rate. Reclassified from material blocker to validation gap,
and the record says the reclassification reverts if storage approaches 60%.

Applying that exposed a real inconsistency: the engine barred Grade A on any
unresolved component while the gate honoured `blocker_class`. Two rules for one
distinction is how a methodology drifts from its own code — the failure this
project keeps correcting. They now share one rule.

## Seoul — closed by statute, not by silence

    Water Supply           ₩12,330 / month  ·  ₩822 / m³   Grade B, published
    Total Water Services   withheld — the sewerage tax question is a different one

The VAT question came from tax law, which is where it was always going to be:
art. 26(1)2 of the Value-Added Tax Act exempts tap water, and Basic Ruling 26-0-1
defines that as water supplied through conduits by a supplier under the Water
Supply Act. That attaches the exemption to Arisu.

It could never have been closed by the silence of Arisu's rate table, and Tokyo
is the proof: its table carries no tax line either while its calculation formula
multiplies by 1.10.

**And art. 26(1)2 names tap water, not sewerage.** A sewerage use charge is
levied by a local authority under the Sewerage Act rather than supplied by a
business — a different question, still open, so total water services is not
published.

That exposed a gap: the gate held the whole city over a component affecting only
one metric. §5 already graded per metric and §7.2a already asked provenance per
metric; the component state was the third thing that had to follow, and it did
not. **A blocker now holds the metric it names.** Dubai's unobtained decree is
the same shape and had been handled by hand.

## Abu Dhabi was in the data and invisible on the map

Reported as "Abu Dhabi still isn't displaying". It was in the payload, in the
Water Index table and on its own page at `/city/abu-dhabi` — and its dot sat
**one pixel** from Dubai's on the world map, with its label drawn underneath.
Accurate about the map, wrong about everything else, and only a reader finds it.

Measured, the collisions were general: Dubai/Abu Dhabi 1 px, Toronto/New York
5 px, Hong Kong/Singapore 9 px. Every city added makes it worse.

**The fix moves labels and never dots.** A dot in the wrong place is a false claim
about geography. A colliding label steps down a line at a time, alternating sides,
with a hairline leader to its own dot. Deterministic — sorted west to east, so the
same set always renders identically, which a test asserts by laying out the cities
in reverse order and comparing.

The first attempt was still wrong: a step of 4.6 SVG units renders as 4.1 px on a
map scaled at about 0.9 px per unit, and the labels are 5 px tall. Dubai moved and
still overlapped by a pixel. 7 units clears it — measured in the browser rather
than guessed.

## Methodology v1.7 — the observation unit is not a city

    observation = tariff_jurisdiction × utility × service_area
                  × customer_class × tariff_schedule × effective_period × metric

City identifiers and URLs are unchanged — `/city/dubai` is what a reader wants.
Beneath it the observation belongs to the jurisdiction.

**Saudi Arabia forced it and proves it.** Riyadh and Jeddah are two display
cities on one national schedule: the tariff logic exists once, neither city owns
it, and resolving a blocker resolves it for both. A metropolitan market served by
several providers is the inverse case and the same separation handles it.

Migrated at six published observations rather than thirty. A regression test keyed
on a pre-migration snapshot asserts that no published figure moved — component by
component, keyed on position and name, because Singapore carries two components
both called GST.

### The curve is the primary data object

Proved by the cities, not preferred on principle:

    Hong Kong   cheapest in the set at 5 m³, among the dearest at 25 — crosses everyone
    Perth/Sydney  change places between 5 and 25 m³, in one currency and one country
    New York    looked flat; a USD 0.49/day minimum lifts 5 m³ from 1.889 to 2.982

    1. residential water price curve            the primary object
    2. standardized price at 15 m³              the canonical comparable observation
    3. standardized monthly bill at 15 m³

**15 m³ is not wrong at 15 m³.** It ranks the cities correctly there. What one
point cannot do is show whether that ranking is a stable relation between tariff
systems or an artefact of where it was measured.

> TWJ compares tariff systems as curves. 15 m³ is the standardized reference
> point on that curve.

### A minimum bill is a floor, not an item

    payable = max(calculated bill, minimum bill)

Model it as a fixed charge and it is added to every bill; model it as absent and
every small bill is understated. Either error leaves 15 m³ correct and the curve
wrong below 8 m³ — the hardest error to notice, because the number everyone
quotes is right.

## Methodology v1.6 — tariff state, and a stop on architecture

Four changes, then architecture freezes until ten cities are published.

**§3.8 Tariff state.** Where a tariff selects between published rates on the
measured state of the system, `applicable rate = tariff rule + dated
authoritative state observation`. The tariff document gives the rule and cannot
give the state.

A tariff state is **structural** and is not a temporary policy adjustment. Tokyo's
waiver is discretionary and expires: payable only. Sydney's drought rate is an
existing rule firing on a measured condition: structural, and it belongs in the
index. Modelling the drought as a waiver would have kept it out of both, which is
backwards.

**§3.8a Trigger provenance.** WaterNSW's wholesale determination defines a 31-day
lag; Sydney Water's retail page states the trigger without one. Identical
thresholds, different instruments — the engine now refuses a trigger the tariff
does not cite.

**§7.6 `non_standardizable`.** Perth's sewerage rests on Gross Rental Value, set
by law. Nothing is unknown; the scenario simply has no property valuation to
supply. Calling that *unresolved* implied a document we had failed to find.

**§5.5 Publication ≠ index eligibility.** A city can be published and outside the
basket. Toronto's services figure is publishable and never index-eligible.

### The index formula was wrong and is replaced

`docs/uwti-index-beta-v0.1.md` — a separate document, because city benchmark
methodology and aggregation are different things and mixing them already caused
one wrong implementation.

    r_i,t  = P_structural_i,t / P_structural_i,base      (local currency)
    UWTI_t = 100 × exp( Σ_i w_i · ln r_i,t )

The old code took a median of bills converted to USD. **A water tariff index must
not move because a currency moved.** With nothing changing in any tariff and the
dollar down ten per cent, it reported a ten per cent change in the price of water.
Each relative is now a ratio of a city's currency to itself; there is nowhere for
an exchange rate to enter, and the result says `fx_used: false`.

Geometric because these are ratios: the arithmetic mean of a doubling and a
halving is 1.25 — a 25% rise reported where nothing happened.

No index value is published. The formula exists now so that production code is not
knowingly wrong while the cities are collected.

## Methodology v1.5 — the gate was too hard

Three levels of proof were being treated as one. Source validity and calculation
reproducibility are ours to require. **External reconciliation is not**, because a
utility publishes a tariff rather than a worked example of somebody else's
benchmark scenario.

The v1.3 checklist made it a gate condition, and the rule amounted to: *an
official tariff is insufficient until the utility computes our scenario for us.*
It withheld London, where Thames states £2.7346/m³, £66.87 a year, the customer
class and the period — from which 15 × 2.7346 + 66.87 ÷ 12 = £46.5915 follows and
nothing else does.

    material blocker    the number could actually differ  → holds publication
    validation gap      the number is determined, a check is absent → reported

    London      Grade A   Source ✓   Calculation ✓   Reconciliation —
    Dubai       Grade A   Source ✓   Calculation ✓   Invoice reconciled ✓

Both Grade A. Grade says how certain the number is; validation says how many
independent ways it has been shown. A reader gets both.

`confirmed_absent_by_exhaustive_schedule` is added, and must state why the
document is exhaustive for that customer class. Hong Kong qualifies — WSD
enumerates the whole of a domestic bill. Seoul's rate table does not: it lists
rates, so its silence about tax proves nothing, and **Tokyo is the demonstration**
— no tax line in its table either, and a formula that multiplies by 1.10.

**Five published, not seven.** New York's possible minimum charge, Seoul's and
Toronto's tax treatment, Sydney's drought state and Abu Dhabi's VAT conflict are
each material: the number genuinely differs on the answer. Loosening the gate
correctly did not loosen it past the evidence.

## Methodology v1.4 — three publication statuses

The two-person review was withdrawn in v1.3 and replaced by a seven-condition
publication checklist. §5.3 was rewritten in v1.4, because the old rule — show
every refusal with its reason — produced a catalogue that was mostly the word
*withheld*, and presented our own unfinished capture as though it were a property
of a city's water system.

    Published            Dubai · Hong Kong · Perth · Singapore
    Exception records    Toronto · Abu Dhabi
    Research pending     London · New York · Seoul · Sydney   (internal)

The test is not how serious a withholding looks. It is whether the sentence
explaining it is about the city or about us. Toronto's tariff combines water and
wastewater — a fact about Toronto. ADDC's VAT sentence supports two readings 4.9%
apart — a fact about the source record. "We have not captured the storage figure"
is a fact about us, and belongs in a research register.

The four research-pending cities stay fully computed, tested and recorded. They
are not pages. Nothing is deleted.

### What the checklist found on its first run

- **Singapore** stored 1.42 in its upper waterborne block where PUB prints 1.40.
  Above 40 m³, so no acceptance test could reach it.
- **London had never been reconciled against any figure Thames Water produced** —
  the only city in that position, and nobody had looked. It left the published set.
- **Dubai's** reconciliation existed against a verified invoice but sat in a field
  the checklist did not read.
- **The deploy tree kept stale pages.** London stayed reachable for one build
  after v1.4 removed it. The route tree is now cleared before writing.

## Methodology v1.2

Four rules added, one index renamed, nothing recalculated. `docs/methodology-v1.2.md`;
v1.1 and v1.0 retained and marked superseded.

    §2.5  reference connection    utility-designated size, printed as scope
    §2.6  time convention         365.2425 days, two narrow exceptions
    §5.4  payable vs structural   page shows payable, basket uses structural
    §7.6  source completeness     observed | confirmed_absent | unresolved

**The index is now the TWJ Urban Water Tariff Index (UWTI).** It measures the
structural level of residential tariff liability for a standard service bundle,
not what water costs to produce, which is what the old name claimed. The shorter
*Water Tariff Index* was rejected on a practical ground: WTI is West Texas
Intermediate, and a water index that collides with an oil benchmark gets misread
by exactly the financial press we want citing it. On a city page the headline
keeps a consumer-facing name — **TWJ Standardized Water Price**, local currency
per m³.

### §2.5 gained a third basis during implementation

The approved wording required a utility-designated connection size, or the
smallest documented one. Two of the five modelled cities — New York and
Singapore — have no size parameter anywhere in the residential tariff: no
standing charge, one volumetric rate. Requiring them to designate a size would
withhold a fully evidenced figure over a parameter the tariff does not have,
which is the mistake v1.1 Rule 3.2 made and v1.1 fixed.

So `basis: 'size_independent'` exists, and it is not a loophole: it is a claim
about the tariff and needs a source establishing that residential service is
billed without reference to connection size. No source means `unresolved`.

### §7.6 withheld New York within the hour

Asked what every silent zero in the base actually was, the answer for New York
was that the record models no fixed component at all — and the Water Board Rate
Schedule is understood to set minimum charges by meter size. Nobody had read it.
Either it sets none for a residential account, in which case `confirmed_absent`
with the page cited, or it does and must be modelled even where it does not bind
at 180 m³ a year.

New York now shows *Withheld* with that reason where the figure was. The
arithmetic is unchanged and still under test at USD 28.34 and USD 73.40. This is
the rule earning its place on the day it was introduced, and it is logged.

## Source capture sprint 01 — Sydney

City 3, and the one that found a hole in §6.

    Water Supply           A$59.97 / month  (non-drought rate)
    Total Water Services   A$122.79 / month
    Standardized price     A$3.998 / m³
    Grade B · withheld on Rule 9.3 and Rule 7.6

**Sydney is the first city whose published price depends on a physical
measurement that changes weekly.** Two usage rates are published — A$3.41/kL and
a drought rate of A$3.84/kL — and which applies depends on Greater Sydney storage
against a 60/70 trigger. The spread is 10.8% of the supply bill, ten times the
ceiling that separates Grade B from Grade A.

So the applicable rate is `unresolved` under §7.6, and Sydney is withheld with
every document in hand. Closing it needs a dated, hashed capture of the WaterNSW
storage figure — not a reading taken at publication time.

**A trap avoided.** WaterNSW's bulk pricing documents a 31-day lag: drought
prices apply 31 days after levels fall below 60% and continue until 31 days after
they exceed 70%, defined at Part 7 Clause 25 of *that* determination. Sydney
Water's retail page states the trigger without a lag. Two different instruments,
and borrowing the mechanics of one for the other would have been invisible in the
output and wrong. Recorded in the capture, asserted in the tests.

**And §6 has no cadence class for this.** Every freshness window in the
methodology assumes a document revised on a schedule. A storage-triggered tariff
is not that, and the state needs storing as a dated observation. Written into the
city record as an open methodology question rather than left implicit.

**Reconciled exactly:** Sydney Water publishes a typical quarterly house bill of
A$387.03 at 50 kL over 92 days. 26.65 + 170.50 + 189.88 = 387.03. Getting there
exposed a defect — a reconciliation run was slicing quarterly fixed charges into
monthly portions and landing A$145 below the publisher. Fixed charges now prorate
to the period the run declares.

The same reconciliation settles a structural question: the publisher's own
typical bundle excludes stormwater. Had it been included the sum would not close.

## Source capture sprint 01 — Toronto

City 4, and the one that pays for the whole design.

    Water Supply           does not exist
    Total Water Services   C$70.31 / month  (2025, closed)
    Grade C on supply · Grade A on services · withheld on Rule 9.3 and 7.6

The statutory instrument was captured: Toronto Municipal Code Chapter 441,
Appendix D, Schedule 1. Its title is *Water & Wastewater Consumption Rates*, so
the combined nature of the rate is not an inference — it is the name of the
by-law.

**The captured schedule is dated 11 February 2025.** That is printed in the
footer of all eleven pages, which is how we know it is not the current version.
It gives C$4.6872/m³, not the 2026 figure. Council approved 3.75% from 1 January
2026, and 4.6872 × 1.0375 = 4.862970 — rounding to 4.8630, truncating to 4.8629.
The figure circulating everywhere is 4.8629, consistent with truncation and not
evidence of it. On 15 m³ the candidates differ by C$0.0015 a month: immaterial to
a reader, fatal to a claim of Grade A.

So Toronto is published as a **closed 2025 observation** and the 2026 rate stays
queued. That is Rule 7.3 doing what it exists for: the figure is dated, kept, and
not recalculated when the next one arrives.

**One inference found and refused, in writing.** Schedule 3 prices a sewer
surcharge on private water at 57% of the Block 1 rate. It invites the arithmetic —
57% wastewater, 43% water, C$2.0155/m³ of supply — and the record refuses it and
says why. The 57% is what the City charges a customer who draws water privately
and discharges to the sewer, not a statement that the domestic rate divides in
that proportion. Rule 3.3 leaves the supply figure empty rather than estimated,
and a plausible ratio in a neighbouring schedule is still an estimate. It is
recorded in `refused_inferences` because a later reader will find the same 57%
and wonder why it was not used.

**Toronto is the exact inverse of Perth**, and between them they are the argument
for grading per metric. Perth's water charge is a clean function of volume and
its sewerage charge rests on a property valuation. Toronto's combined charge is a
clean function of volume and cannot be split at all.

That required a fix. The Rule 5.1 refusal applied to the whole record, so a city
Grade C on one metric produced nothing — throwing away a figure the methodology
says is publishable. The refusal now runs per metric, and fires only when every
metric is Grade C.

**And the absent fixed charge is confirmed by enumeration.** Schedule 1 carries
one per-cubic-metre figure for metered consumers; every fee in Schedule 2 is a
one-off event or applies to customers who refuse a meter. Nothing recurs on a
metered household bill.

## Source capture sprint 01 — Abu Dhabi

City 6, and the only one that stays unpriced **with its document in hand**.

    Grade C · not priced · U = 4.878%

ADDC's tariff page is archived and hashed. The rates are established from the
utility itself: AED 7.84/m³ in the Green band, AED 10.41 above, with a Green
allowance of 0.7 m³ **a day** — so the standardized 180 m³ a year, being
0.492823 m³ a day, sits entirely inside Green.

**The blocker is one sentence.** ADDC's footnote reads: *"Effective 01/01/2018,
charges will be inclusive of VAT at 5%."* That supports two readings, both
ordinary English — either the published AED 7.84 already contains the tax, or the
amount charged will be VAT-inclusive so 5% is added:

    inclusive   AED 117.60 / month   AED 7.840 / m³
    exclusive   AED 123.48 / month   AED 8.232 / m³
    U = 4.878%

Nearly five times the ceiling that separates Grade B from Grade C. Above 1% a
figure may be shown as context or a range and may never be ranked. So Abu Dhabi
is Grade C and the engine refuses to price it.

**And precedence cannot rescue it.** §7.5 ranks a statutory formula above a
billing formula above an invoice rate above a presentation table. Both readings
here come from the same publisher and neither is a formula. What settles it is
arithmetic from ADDC — the official calculator at a known volume, or a real
invoice. Another sentence will not do.

The handoff called this a VAT reconciliation question and was right to withhold.
Capturing the tariff page **confirmed the conflict rather than resolving it**, and
turned up two more open questions the draft had not raised: whether a water
account carries a recurring charge at all, and whether sewerage is bundled into
the water rate — which would make Abu Dhabi the Toronto case, with no supply
metric to publish. The page is also titled 2025 and last updated 26 May 2025, so
even the year is open. Caught the same way as Toronto: by reading the footer.

## Source capture sprint 01 — Seoul

City 5, the cleanest structure captured so far, and still Grade B.

    Water Supply           ₩12,330 / month
    Total Water Services   ₩19,530 / month
    Standardized price     ₩822 / m³
    Grade B · withheld on Rules 9.3, 7.6 and 2.2

Arisu's own rate table is archived. Every rate is established under a named
ordinance — Article 23 of the Seoul Water Supply Ordinance and Article 23 of the
Sewerage Use Ordinance: ₩580/m³ water as a single rate, ₩1,080 basic at 15 mm,
₩170/m³ water-use burden levy universal since 2011, ₩480/m³ sewerage. All three
figures from the handoff reproduced exactly.

**And it is held on the two questions a rate table cannot answer.**

The tax. No tax line appears anywhere in Arisu's table — and that is *not*
evidence of exemption. The enumeration argument that closed Hong Kong's fixed
charge does not transfer: WSD enumerated everything a bill can carry, whereas a
rate table enumerates rates. **Tokyo is the proof.** Its rate table carries no
tax line either, while the Bureau's calculation formula multiplies by 1.10. I
nearly closed this as a confirmed absence, and the test now asserts that nothing
in Seoul is claimed absent on the strength of a silent table.

The reference connection. Arisu prices eight bores from 15 mm up and identifies
none as ordinary for a single dwelling. §2.2 requires the size the utility
designates, or the smallest explicitly documented as suitable for one dwelling.
The table documents neither, so 15 mm is an assumption rather than scope, and
Grade A is barred.

**Two things the capture found beyond the rates.** A published five-year sewerage
schedule — ₩480 rising to ₩560, ₩630, ₩700 and ₩770 through 2030, which is
unusual in this Index where most utilities publish one year at a time. Recorded
and not used: a future rate is not an observation. And the page contradicts
itself, stating that all four categories use three-band progressive pricing while
the table above shows domestic as a single rate and dates itself to July 2021.
The prose describes the superseded structure. The table governs — a rate schedule
outranks a sentence describing the schedule.

## Tokyo — a partial capture, and why it stays unpriced

The Bureau's pages refuse a direct fetch, so what is archived is its own text as
returned in search extracts of those pages: an extract of an extract, weaker than
a capture, and marked `partial: true`. Even so it settled more than expected.

**Established.** The billing formula and its rounding rule, stated by the Bureau
for both water and sewerage: `(basic + volumetric) × 1.10`, **truncated to the
yen**. The basic charge of ¥1,170 a month and the 10% rate, from the Bureau's own
bi-monthly worked example. That billing is bi-monthly, so a tier threshold applies
to a two-month volume.

**Three exact reconciliations against the Bureau's own published figures**, using
the tier structure from the handoff:

    20 mm at 24 m³/month   →  ¥3,533  ·  ¥147.2/m³   Bureau: "about 147.2"
    bi-monthly example     →  ¥9,038.7 truncated      Bureau: ¥9,038
    waiver, 20 mm, 4 mo    →  1,170 × 1.10 × 4        Bureau: ¥5,148

Three independent figures, one tier structure. **And Tokyo is still unpriced**,
because the thing being corroborated is the table, and reproducing three totals is
not reading it. A different structure that happens to sum identically at those
volumes cannot be ruled out by arithmetic. §7.1 does not bend for a good
correlation.

**Three corrections to the draft.** The waiver runs four months as **May–August or
June–September**, depending on whether the property's meter is read in an even or
an odd month — not the single month of July the draft modelled, and a single
payable figure cannot express it. The first 5 m³ a month is a **basic volume
inside the basic charge** for connections at 25 mm or below, not an ordinary
zero-rated tier; under the waiver the charge goes to zero and the allowance
survives. And rounding is truncation, which the ¥9,038 example proves: rounding
gives ¥9,039.

**One thing recorded as the issuer states it.** The Bureau calls this 「今年の夏に
限った臨時的な特別措置」— a temporary special measure limited to this summer — and
has now run it two years running, funded by a transfer from the metropolitan
general account rather than from water revenue. The tariff itself is unchanged,
which is exactly why §5.4 puts the structural price in the basket. We record the
characterisation the issuer gives, note the repetition, and do not reclassify it.

## Capture manifest

`data/capture-manifest.json` holds the seven cities not yet sourced. Each entry
names the document required and **the exact question it must answer** —
`test/capture-manifest.test.js` fails on an entry whose document has no stated
question, because a document with no question is a wish rather than a task. It
also fails if a queued city calls itself published, or if a listed blocker has
quietly vanished from its spec.

Toronto was investigated this round and deliberately not published. The 2026
Block 1 rate of C$4.8629/m³ appears in every secondary source and in no captured
primary document. The City's own news release gives C$1,118 for a household using
230 m³, and 230 × 4.8629 = 1,118.47 — which rounds to it. That corroborates the
rate and does not establish it: a figure rounded to the dollar constrains the rate
only to roughly 4.860–4.865. Under §7.1 a tier 5 source may not produce a
published number, so Toronto waits for Municipal Code Chapter 441, Schedule 1 —
whose title, *Water & Wastewater Consumption Rates*, is itself the evidence that
the rate is combined.

## Source capture sprint 01 — Perth

City 2. The first city whose grade differs between its two metrics for a
structural reason.

    Water Supply           A$58.79 / month  ·  A$705.52 / year
    Total Water Services   withheld
    Standardized price     A$3.919 / m³
    Grade A on supply · Grade C on services · withheld on Rule 9.3

**Total Water Services is not published, and that is not a gap.** Perth assesses
residential sewerage at 3.059 cents in the dollar of Gross Rental Value and
drainage at 0.444 cents, and Water Corporation states the use of GRV is set by
law. A property valuation is not a quantity of water. Grading per metric was
built for this and had not met it until now: the water charge is a clean function
of volume, the sewerage charge is a function of what the property would rent for.

That exposed a real defect. A tariff with no modelled wastewater component was
silently reporting Total Water Services **equal to** Water Supply — the most
misleading figure the engine could produce. It now distinguishes a wastewater
charge nobody has found from one that is published and cannot be standardised,
and withholds with the reason.

**GST-free now rests on statute.** The handoff asserted it as a general rule
about Australian water charges. A rule is not a source: it is s 38-285 of the
*A New Tax System (Goods and Services Tax) Act 1999* — "A supply of water is
GST-free" — which under source precedence outranks the Commissioner's ruling
GSTR 2000/25 and both outrank a utility page.

**And the accumulating bill year matters by A$21.03.** Six two-monthly periods
accumulate across a bill year, so 180 m³ sits 150 kL in Tier 1 and 30 kL in
Tier 2. Resolving the same volume monthly keeps every month inside Tier 1 and
loses the difference. Disclosed as scope: the benchmark prices a full bill year
at 2026-27 rates, which no individual customer experiences, because a real bill
year begins between March and October and straddles the 1 July price change.

## Source capture sprint 01 — Hong Kong

First city of the sprint, and the first priced from a document that publishes its
own worked examples.

    Water Supply           HK$59.62 / month
    Total Water Services   HK$94.65 / month
    Standardized price     HK$3.975 / m³
    Grade A · U = 0 · withheld on Rule 9.3, second reader

WSD's tariff page is archived and hashed. Rates unchanged since 16 February 1995,
sewage charge since 1 April 2017 — thirty-one years of a frozen tariff, which is
itself a story.

**Two public reconciliations instead of one private invoice.** WSD publishes
worked examples for the same 66 m³ over 127 days and over 117 days, and the
engine reproduces HK$274.05 and HK$299.51 to the cent. The pair is the stronger
test: a shorter reading interval must cost more, so the engine has to get the
proration right in both directions rather than hit one number.

Getting there needed two rounding stages nobody would have guessed, both visible
in those examples:

- the prorated tier volume is **rounded to three decimals before multiplying** —
  WSD shows a third tier of 19.837 m³, not 19.83722, and bills HK$127.94 rather
  than 127.95;
- the line amount is **truncated to cents, not rounded** — HK$117.87375 is
  billed as 117.87.

Assume either convention the other way and the engine lands a cent from the
publisher's own example. The tests assert both by breaking each stage in turn.

**The unresolved fixed charge is now a confirmed absence.** The draft assumed no
standing charge; §7.6 forbade that. WSD enumerates the whole of what a domestic
bill can carry — four water tiers plus sewage — and separately enumerates the
only other items that can appear: odd cents carried between bills and a 5%
surcharge on overdue bills. That enumeration is what turns an assumed zero into
`confirmed_absent` with a source.

Also checked and recorded rather than ignored: a 50% concession running from
15 January 2026 applies to non-domestic accounts only.

## City expansion — the calculation standard

Ten cities were handed over as a calculation standard. Four of their tariff
architectures did not exist in the engine, so the standard is now executed
rather than proposed: `test/expansion-shapes.test.js` asserts every figure from
the handoff against the engine, and `test/fixtures/expansion/` holds the specs.

    Perth       annual accumulating blocks       A$58.79/mo   A$3.92/m³   ✓
    Sydney      fixed charge billed in days      A$59.97/mo   A$4.00/m³   ✓
    Tokyo       temporary relief, two prices     ¥825 payable / ¥2,112     ✓
    Seoul       mandatory volumetric levy        ₩12,330/mo   ₩822/m³     ✓
    Abu Dhabi   daily allowance bands            AED 123.48   AED 8.23/m³ ✓
    Hong Kong   121.64-day billing period        HK$59.62/mo  HK$3.97/m³  ✓
    Riyadh      monthly blocks                   SAR 6.50/mo  SAR 0.43/m³ ✓
    Toronto     combined rate — refused                                   ✓

**Not one of them is publishable.** Every spec carries
`blocking: ['no archived primary source — Rule 7.2']`. Correct arithmetic does
not waive provenance, and a test fails if any of them claims Grade A.

### What the engine gained

- `annual_accumulating_blocks` — Perth's threshold is crossed once a year, not
  once per billing period. Resolving it monthly understates the bill by A$84.27.
- `period: 'days'` on a fixed charge — Sydney accrues its service charge daily
  over a 92-day quarter. Four quarters is not a year.
- `daily_allowance_blocks` — Abu Dhabi's bands are per day, so the scenario has
  to become 0.492823 m³/day first. Applying a 0.7 daily threshold to a 15 m³
  monthly volume misprices the bill by more than 20%.
- `billing_period_blocks` — Hong Kong's free 12 m³ recurs every 121.64 days.
  A `repeat` factor on the schedule keeps a per-period allowance from being
  spent once a year.
- `calculateBothPrices()` — a tariff under temporary relief returns payable and
  structural, and marks itself out of the base basket.
- Combined tariffs are refused. Toronto publishes one water-and-wastewater rate;
  the engine will not apportion it into a supply figure.

### One year length

The handoff used 365 to annualise Sydney and 365.2425 for Abu Dhabi and Hong
Kong. Two constants in one standard is one too many — it moves Sydney in the
fourth significant figure and makes the result depend on which one a reader
picks. `METHODOLOGY.days_in_year = 365.2425`, declared once, and Hong Kong's
statutory 121.64-day period is measured against it.

## Reading time excludes the bibliography

Counting the source notes put a five-minute article at eight. A citation list is
looked up, not read at 220 words a minute, so `minutes` is measured over the
prose above the rule and `words_with_sources` is kept alongside for reference.

Frontmatter gained two optional fields for Science: `formula`, printed under
the standfirst, and `hook`, the cover line.

## The site

`site/template.html` was rewritten from scratch. Two rules hold throughout:

1. **Every figure comes from the engine.** None is typed into the page.
2. **Every word of editorial prose is the editor's.** The site supplies
   structure, labels and arithmetic — nothing else.

Eight views: home, journal, section, article, water index, city record,
compare, methodology, editorial independence.

### What was removed in the rewrite

The previous build carried a substantial amount of prose written here rather
than supplied: two city articles, a *Why does water cost this much* paragraph
on every city record, closing questions, plain-language summaries, and two
six-panel Follow-the-Water scroll pieces. All of it is gone, along with the
files that held it.

A city record is now data: the standardized cost, the arithmetic behind it, the
source mix, the comparisons that work across currencies, and a disclosure block
listing sources, assumptions and publication status. Where a methodological
note is required — why a share is withheld, why a figure is held — it states
the constraint and stops.

### Published articles

    science             The Last Step of Every Breath
    human-performance   Judgement Goes First

Both supplied by the editor. The build refuses a home card or a featured slug
that resolves to no published article.

### Covers

Shown whole, on the brand ground, as finished artefacts. Nothing is laid over
them: they already carry the masthead, the rubric and a line of their own.
Where a 9:16 story crop exists the phone gets it; otherwise the 4:5 feed cover.

### Type

    --micro 12.5px · --small 15–16 · --ui 16.5–17.5
    --read 19–20 · --lead 21–25 · --h1 33–58 · --display 38–72

Reading text in Lora at 19–20px, everything else in Poppins Regular. Light is
reserved for large figures.
