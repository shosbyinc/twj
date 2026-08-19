import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { METHODOLOGY } from '../src/methodology.js';
import { payload } from '../scripts/site.js';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Rule 13.1 — no comparative predicate takes a city as its subject.
 *
 * Rule 13 forbade calling a city cheap, efficient or best on the strength of a
 * small bill. It covered half the exposure. v1.8 shipped a methodology section
 * headed "The weakest instance is named" — Abu Dhabi — and a correction-log
 * entry describing Hong Kong as the best-evidenced record in the Index while
 * the least stable cities stayed in place.
 *
 * Every one of those statements was true and every one was about TWJ's own
 * capture rather than about anybody's water system. They were still wrong to
 * publish, and the reason is grammatical rather than factual: the subject was a
 * city name, and the city name is the part that gets quoted. "Abu Dhabi is the
 * weakest" survives the trip out of this repository; "our page capture is dated
 * later than the page's last update" does not travel at all.
 *
 * The replacement is not silence. It is the three dates, which are shorter,
 * checkable, cannot age into a falsehood, and leave the reader to conclude.
 *
 * What this does not touch: grades. A grade is a rule applied to a record,
 * computed identically everywhere. The line is between a rule applied to a
 * record and an adjective applied to a place.
 */

/* Superlatives and comparatives that carry a verdict. Deliberately short: a
   long list invites matching on words that are doing arithmetic. */
const VERDICT = new RegExp(
  '\\b('
  + 'weakest|thinnest|flimsiest|strongest|sturdiest'
  + '|best[- ](?:evidenced|sourced|documented|run)|worst|poorest'
  + '|least (?:stable|volatile|reliable|transparent|rigorous|serious|trustworthy)'
  + '|most (?:opaque|obscure|unreliable|careless|transparent|rigorous)'
  + '|cheapest|dearest|priciest'
  + '|flattering|shabby|sloppy|lazy|impressive|admirable|embarrassing'
  + ')\\b', 'i');

/** Every string the site publishes about a record, with where it came from. */
function publishedProse() {
  const out = [];
  for (const c of [...payload.cities, ...(payload.research_pending ?? [])]) {
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === 'string' && v.length > 40) out.push([`cities.${c.id}.${k}`, v]);
    }
  }
  for (const e of payload.corrections ?? []) {
    for (const k of ['reason', 'affected', 'prevention', 'note']) {
      if (typeof e[k] === 'string') out.push([`corrections.${e.id ?? '?'}.${k}`, e[k]]);
    }
  }
  return out;
}

describe('the Index states evidence and does not rank places', () => {
  test('there is prose to check, or this proves nothing', () => {
    assert.ok(publishedProse().length > 10);
  });

  for (const [where, text] of publishedProse()) {
    /* The register rule may be quoted in order to state it — Riyadh's record
       says the figure would be the cheapest in the Index and that Rule 13
       forbids calling it cheap. Stating a rule is not breaking it. */
    const statesTheRule = /Rule 13|forbids|may not be called|never called/i.test(text);
    test(`${where} carries no verdict on a place`, () => {
      const hit = text.match(VERDICT);
      if (hit && statesTheRule) return;
      assert.equal(hit, null,
        `"${hit?.[0]}" is a verdict, and the subject of the sentence is a place. `
        + 'Rule 13.1: publish the evidence instead — a date is shorter, checkable, and '
        + `cannot age into a falsehood. Context: …${text.slice(Math.max(0, (hit?.index ?? 0) - 70),
          (hit?.index ?? 0) + 90)}…`);
    });
  }

  test('the rule is declared once, in the constants', () => {
    assert.equal(METHODOLOGY.register.comparative_predicates_forbidden, true);
    assert.match(METHODOLOGY.register.rule_13_1, /subject/i);
  });

  /**
   * A guard that cannot fail is decoration. These are the three sentences v1.8
   * actually shipped, kept as specimens.
   */
  test('the check catches what was actually published', () => {
    const shipped = [
      'The weakest instance is named. Abu Dhabi.',
      'a rule demanding one would remove the best-evidenced record in the Index',
      'while leaving the least stable cities in place',
      'this is the thinnest continuity evidence in the Index'
    ];
    for (const s of shipped) assert.ok(VERDICT.test(s), `the check would have missed: ${s}`);
  });

  test('and does not fire on a grade, which is a rule applied to a record', () => {
    for (const s of [
      'Grade C, and not for a missing document.',
      'U = 4.878%, which is nearly five times the ceiling separating Grade B from Grade C.',
      'captured 17 August 2026, titled 2025, last updated 26 May 2025'
    ]) assert.equal(VERDICT.test(s), false, `the check fires on a legitimate statement: ${s}`);
  });

  /**
   * The methodology document is where the original violation was, and it is not
   * in the payload, so the payload scan above would never have found it. It is
   * scanned here directly rather than left as a stated limitation.
   */
  describe('the frozen document is held to the same rule', () => {
    const DOC = readFileSync(join(ROOT, METHODOLOGY.document), 'utf8');

    /* The rule is about the subject of the sentence, so the check is too: a
       verdict word only offends when it sits beside a place. Without this,
       "the cheapest moment they will ever change" and "shop for the cheapest
       meter" both failed — neither is about anywhere. Places come from the
       payload rather than a hand-list, so a new city is covered on arrival. */
    const PLACES = [...new Set([
      ...payload.cities.map(c => c.name),
      ...payload.cities.map(c => c.country),
      ...(payload.research_pending ?? []).map(c => c.name),
      'Saudi Arabia', 'Japan', 'Korea', 'France', 'Canada', 'Australia'
    ].filter(Boolean))];
    const nearAPlace = t => {
      const m = t.match(VERDICT);
      if (!m) return false;
      const from = Math.max(0, m.index - 80), to = m.index + m[0].length + 80;
      const window = t.slice(from, to);
      return PLACES.some(p => window.includes(p));
    };

    /* The rule has to name the words it bans, so the section stating it is
       exempt by heading rather than by guessing at phrasing. */
    const ruleSection = (() => {
      const start = DOC.indexOf('## Rule 13 — Register');
      const end = DOC.indexOf('\n## ', start + 10);
      return [start, end === -1 ? DOC.length : end];
    })();
    const offsetOf = n => DOC.split('\n').slice(0, n - 1).join('\n').length;

    const lines = DOC.split('\n').map((t, i) => [i + 1, t])
      .filter(([n, t]) => nearAPlace(t)
        && !(offsetOf(n) >= ruleSection[0] && offsetOf(n) < ruleSection[1]));

    test('no line carries a verdict on a place', () => {
      assert.deepEqual(lines.map(([n, t]) => `${n}: ${t.trim().slice(0, 90)}`), []);
    });

    test('the exemption is a section and not a blanket', () => {
      assert.ok(ruleSection[0] > 0 && ruleSection[1] > ruleSection[0]);
      const body = DOC.slice(...ruleSection);
      assert.ok(VERDICT.test(body), 'the rule must quote the words it bans, or it cannot state them');
      assert.ok(body.length < DOC.length / 8, 'the exempt section must stay small');
    });

    test('the scan is reading the document at all', () => {
      assert.ok(DOC.length > 10000 && DOC.includes('Rule 13.1'));
    });
  });
});
