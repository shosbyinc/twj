import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { acceptCity, validThrough, VALIDITY_BASES } from '../src/acceptance.js';
import { METHODOLOGY } from '../src/methodology.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json')).map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));
const CITIES = readdirSync(join(ROOT, 'data/cities')).filter(f => f.endsWith('.json'))
  .map(f => read(`data/cities/${f}`));
const tariffOf = c => (c.tariff_id ? read(`data/tariffs/${c.tariff_id}.json`) : null);

/**
 * §3.10 — a tariff is in force until superseded, and shown to be in force only
 * through the day somebody looked.
 *
 * The rule was already the practice and had never been written down. Hong Kong
 * is Grade A on an instrument effective 16 February 1995 with no expiry, so a
 * rule requiring a document dated on the valuation date would have removed the
 * best-evidenced record in the Index while claiming to raise the standard. What
 * is new is not the leniency; it is that the claim now carries a date.
 */
describe('an open-ended tariff says how far its evidence reaches', () => {
  test('Hong Kong is the case the rule exists for', () => {
    const hk = read('data/tariffs/hongkong-wsd-1995-02-16.json');
    assert.equal(hk.effective_to ?? null, null, 'the instrument states no expiry');
    assert.equal(hk.grade, 'A');
    const v = validThrough(hk, SOURCES);
    assert.ok(v, 'a Grade A record on a 1995 instrument must say through what date it is evidenced');
    assert.ok(v.date > '2026-01-01', 'the evidence must reach the observation period');
    assert.ok(v.date > hk.effective_from);
  });

  test('a rule demanding a document dated on the valuation date would delete it', () => {
    /* Stated as arithmetic rather than as an opinion: thirty-one years. */
    const hk = read('data/tariffs/hongkong-wsd-1995-02-16.json');
    const years = (new Date('2026-08-18') - new Date(hk.effective_from)) / 31557600000;
    assert.ok(years > 30, 'the gap between instrument and observation is the whole point');
  });

  test('every open-ended tariff carries a continuity record', () => {
    for (const f of readdirSync(join(ROOT, 'data/tariffs')).filter(f => f.endsWith('.json'))) {
      const t = read(`data/tariffs/${f}`);
      if (t.effective_to || !t.effective_from) continue;
      assert.ok(t.continuity, `${t.id} is open-ended with no continuity record`);
      assert.ok(VALIDITY_BASES.includes(t.continuity.basis),
        `${t.id} has continuity basis "${t.continuity.basis}"`);
      const src = SOURCES[t.continuity.in_force_source_id];
      assert.ok(src, `${t.id} cites unknown continuity source`);
      assert.ok(src.accessed_at >= t.effective_from,
        `${t.id} is evidenced by a capture predating the tariff`);
    }
  });

  test('a recorded search states who looked, at what, and what they found', () => {
    for (const f of readdirSync(join(ROOT, 'data/tariffs')).filter(f => f.endsWith('.json'))) {
      const t = read(`data/tariffs/${f}`);
      if (t.continuity?.basis !== 'recorded_search') continue;
      const s = t.continuity.search;
      assert.ok(s?.performed_on && s?.scope && s?.finding,
        `${t.id} rests on a search that is not recorded, and an unrecorded search is silence`);
    }
  });

  test('every published city states a valid_through date', () => {
    for (const c of CITIES) {
      const t = tariffOf(c);
      if (!t || t.grade === 'C') continue;
      const gate = acceptCity(c, SOURCES, t);
      if (!gate.publishable) continue;
      const v = validThrough(t, SOURCES);
      assert.ok(v?.date, `${c.id} is published without saying through what date it is evidenced`);
    }
  });

  /**
   * The first draft of this check demanded a separately recorded search for
   * every open-ended tariff and withheld Hong Kong, Dubai and New York. That is
   * the v1.5 failure repeated: a gate that stalls fully evidenced records while
   * catching nothing. For a tariff evidenced by the publisher's own live
   * schedule, the schedule is the search — a superseding rate would appear
   * there. This test states the outcome so the stricter version cannot come
   * back without someone deciding to lose these cities.
   */
  test('the rule withholds no city that was publishable before it', () => {
    const held = [];
    for (const c of CITIES) {
      const t = tariffOf(c);
      if (!t) continue;
      for (const p of acceptCity(c, SOURCES, t).problems)
        if (/Rule 3\.10/.test(p)) held.push(`${c.id}: ${p}`);
    }
    assert.deepEqual(held, [], 'Rule 3.10 is holding records it was written to permit');
  });

  test('the rule is declared once, in the constants', () => {
    /* Pinned to the version that introduced it, this test failed on the next
       version bump and said nothing about tariff validity. What matters is that
       the rule exists and is declared once, not which document introduced it. */
    assert.equal(METHODOLOGY.tariff_validity.conditions.length, 4);
    assert.match(METHODOLOGY.tariff_validity.supersession_is_a_search, /not the same as having looked/);
  });
});
