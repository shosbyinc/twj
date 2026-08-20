/**
 * The freeze, enforced.
 *
 * v1.0 was frozen and the engine changed underneath it. Nothing noticed,
 * because the freeze lived in prose and prose does not run.
 *
 * This test closes the loop three ways:
 *
 *   document  →  constants     the declared block matches src/methodology.js
 *   constants →  engine        the engine stamps the declared version
 *   constants →  arithmetic    each fixture recomputes to its declared figure
 *
 * Change a rule in one place and this fails. That is the mechanism, and it is
 * the only reason the word "frozen" means anything in this repository.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { METHODOLOGY, FIXTURES } from '../src/methodology.js';
import { SCENARIO, calculateBill } from '../src/engine.js';
import { tariffCurve } from '../src/curve.js';

const ROOT = new URL('..', import.meta.url).pathname;
const DOC = join(ROOT, METHODOLOGY.document);

/** Parse the ```declared block: one `key = value` per line. */
function declared() {
  const text = readFileSync(DOC, 'utf8');
  const block = text.match(/```declared\n([\s\S]*?)```/);
  assert.ok(block, `${METHODOLOGY.document} has no declared block`);
  const out = {};
  for (const line of block[1].split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf('=');
    assert.ok(i > 0, `malformed declaration: ${t}`);
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

/** `none` is a declared absence, not the string "none". */
const num = v => (v === 'none' ? null : Number(v));

describe('the document exists and is the one the code names', () => {
  test('the frozen document is present', () => {
    assert.ok(existsSync(DOC), `${METHODOLOGY.document} is missing`);
  });

  test('every superseded document is retained, never deleted (Rule 7.3)', () => {
    for (const v of ['v1.0','v1.1','v1.2','v1.3','v1.4','v1.5','v1.6','v1.7','v1.8']) {
      assert.ok(existsSync(join(ROOT, `docs/methodology-${v}.md`)),
        `${v} must remain readable: an append-only project does not delete its own history`);
    }
  });

  test('each superseded document says so in its own header', () => {
    for (const v of ['v1.0', 'v1.1']) {
      const old = readFileSync(join(ROOT, `docs/methodology-${v}.md`), 'utf8');
      assert.match(old.slice(0, 900), /Superseded by/i,
        `a reader who lands on ${v} must be told there is a later version`);
    }
  });
});

describe('the v1.2 and v1.3 rules are declared, not merely described', () => {
  const d = declared();

  test('§2.5 the reference connection is a rule with a tie-break and a floor', () => {
    const r = METHODOLOGY.reference_connection;
    assert.match(r.rule, /explicitly\s+designated by the utility/);
    assert.match(r.tie_break, /smallest size explicitly documented/);
    assert.match(r.no_primary_source, /cannot receive Grade A/);
    assert.equal(r.always_printed, true);
    assert.equal(d.reference_connection_printed, 'true');
  });

  test('§2.6 one year length, with the two narrow exceptions written down', () => {
    assert.equal(Number(d.days_in_year), METHODOLOGY.days_in_year);
    assert.equal(METHODOLOGY.days_in_month, 365.2425 / 12);
    assert.equal(METHODOLOGY.time_convention_exceptions.length, 2);
    assert.match(METHODOLOGY.time_convention_exceptions[0], /regulator-defined/);
    assert.match(METHODOLOGY.time_convention_exceptions[1], /invoice/);
  });

  test('§5.4 the basket uses the structural price, not the payable one', () => {
    assert.equal(METHODOLOGY.price_readings.basket_uses, 'structural');
    assert.equal(d.basket_price_reading, 'structural');
    assert.match(METHODOLOGY.price_readings.city_page_shows, /^payable/);
    assert.match(METHODOLOGY.price_readings.reason, /temporary budget decision/);
  });

  test('§7.6 a component has three states and none of them is a bare zero', () => {
    assert.ok(METHODOLOGY.component_states.includes('observed'));
    assert.ok(METHODOLOGY.component_states.includes('unresolved'));
    /* v1.5 added an exhaustive-schedule absence and non_standardizable. */
    assert.ok(METHODOLOGY.component_states.includes('confirmed_absent_by_exhaustive_schedule'));
    assert.match(METHODOLOGY.component_state_rule, /Nothing defaults to zero/);
  });

  test('the index is renamed, and the collision that ruled out the short form', () => {
    assert.equal(METHODOLOGY.index_abbreviation, 'UWTI');
    assert.equal(d.index_abbreviation, 'UWTI');
    assert.match(METHODOLOGY.index_name, /Urban Water Tariff Index/);
    const text = readFileSync(DOC, 'utf8');
    assert.match(text, /West Texas Intermediate/,
      'the reason WTI was rejected belongs in the record, not in a chat log');
  });
});

describe('the document and the constants agree', () => {
  const d = declared();

  test('version and lineage', () => {
    assert.equal(d.version, METHODOLOGY.version);
    assert.equal(d.supersedes, METHODOLOGY.supersedes);
  });

  test('the scenario', () => {
    assert.equal(d.scenario_id, METHODOLOGY.scenario_id);
    assert.equal(num(d.annual_m3), METHODOLOGY.annual_m3);
    assert.equal(num(d.monthly_m3), METHODOLOGY.monthly_m3);
  });

  test('the grading thresholds (§5)', () => {
    assert.equal(num(d.u_grade_a), METHODOLOGY.u_grade_a);
    assert.equal(num(d.u_grade_b_ceiling), METHODOLOGY.u_grade_b_ceiling);
  });

  test('the source tier ceiling (§7.1)', () => {
    assert.equal(num(d.max_source_tier), METHODOLOGY.max_source_tier);
  });

  test('the base period, and that its month is still unset (§2.4)', () => {
    assert.equal(d.base_period, METHODOLOGY.base_period);
    assert.equal(d.base_month, 'unset');
    /* v1.8 — the two declarations that would otherwise be decorative. A line in
       the declared block that nothing asserts is prose wearing a fence. */
    assert.equal(Number(d.tariff_validity_conditions), METHODOLOGY.tariff_validity.conditions.length);
    assert.equal(d.valid_through_published, 'true');
    assert.equal(d.rule_13_1_scope, 'index');
    assert.equal(METHODOLOGY.base_month, null);
    assert.ok(METHODOLOGY.base_month_blocker.length > 40,
      'an unset base month must carry its reason, not just a null');
  });
});

describe('the engine stamps the version the document claims', () => {
  test('SCENARIO carries the methodology version', () => {
    assert.equal(SCENARIO.methodology_version, METHODOLOGY.version);
  });

  test('the scenario identifier is unchanged by a §3–§5 amendment', () => {
    assert.equal(SCENARIO.id, METHODOLOGY.scenario_id);
  });

  test('a calculated bill carries the version, so an observation can be dated', () => {
    const t = JSON.parse(readFileSync(
      join(ROOT, `data/tariffs/${FIXTURES.dubai.tariff}.json`), 'utf8'));
    assert.equal(calculateBill(t).methodology_version, METHODOLOGY.version);
  });
});

describe('each fixture recomputes to the figure the document prints (§10)', () => {
  for (const [city, f] of Object.entries(FIXTURES)) {
    test(`${city}`, () => {
      const d = declared();
      /* the document, the constants and the stored tariff, in that order */
      assert.equal(d[`fixture.${city}.grade`], f.grade, 'document vs constants: grade');
      assert.equal(num(d[`fixture.${city}.supply`]), f.supply, 'document vs constants: supply');
      assert.equal(num(d[`fixture.${city}.services`]), f.services, 'document vs constants: services');
      assert.equal(num(d[`fixture.${city}.per_m3`]), f.per_m3, 'document vs constants: per m³');

      const path = join(ROOT, `data/tariffs/${f.tariff}.json`);
      assert.ok(existsSync(path), `${f.tariff} is declared but not stored`);
      const t = JSON.parse(readFileSync(path, 'utf8'));
      assert.equal(t.grade, f.grade, 'constants vs tariff: grade');

      if (f.grade === 'C') {
        assert.equal(f.supply, null, 'a grade C city carries no comparative bill');
        return;
      }
      /* The fixture checks arithmetic. A publication blocker — an unresolved
         component under §7.6 — is not an arithmetic disagreement, so it is set
         aside here and asserted where it belongs, in the acceptance suite. */
      const bill = calculateBill({ ...t, component_states: undefined });
      assert.equal(bill.water_supply.monthly, f.supply, 'the engine disagrees on water supply');
      assert.equal(bill.total_services.monthly, f.services, 'the engine disagrees on total services');
      assert.equal(tariffCurve({ ...t, component_states: undefined })
        .points.find(p => p.m3 === 15).supply_per_m3, f.per_m3,
        'the engine disagrees on the standardized price');
    });
  }
});

describe('the amended rules are the ones in force', () => {
  test('Rule 3.2 permits one metric to ship while the other is held', () => {
    const text = readFileSync(DOC, 'utf8');
    assert.match(text, /Rule 3\.2 \(v1\.1\)/);
    assert.match(text, /wherever both are publishable/);
  });

  test('Rule 5.1 grades on uncertainty alone', () => {
    assert.match(readFileSync(DOC, 'utf8'), /grade follows uncertainty alone/i);
  });

  test('§7.5 records the precedence ladder that decided two figures', () => {
    const text = readFileSync(DOC, 'utf8');
    for (const step of METHODOLOGY.source_precedence) {
      assert.match(text, new RegExp(step.replace(/ /g, '\\s+'), 'i'),
        `the ladder step "${step}" is not in the document`);
    }
  });
});
