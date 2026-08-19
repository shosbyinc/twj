import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { acceptCity } from '../src/acceptance.js';
import { readableArchives, archiveFiles } from '../src/publication.js';
import { METHODOLOGY } from '../src/methodology.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const SOURCES = Object.fromEntries(readdirSync(join(ROOT, 'data/sources'))
  .filter(f => f.endsWith('.json'))
  .map(f => { const s = read(`data/sources/${f}`); return [s.id, s]; }));
const CITIES = readdirSync(join(ROOT, 'data/cities'))
  .filter(f => f.endsWith('.json')).map(f => read(`data/cities/${f}`));
const tariffOf = c => c.tariff_id ? read(`data/tariffs/${c.tariff_id}.json`) : null;
const passes = c => acceptCity(c, SOURCES, tariffOf(c)).problems.length === 0;

/**
 * The publication checklist — what replaced the two-person review in v1.3.
 *
 * The review was withdrawn because it had one reviewer in the whole system and
 * held three fully evidenced cities indefinitely while catching nothing. What
 * replaces it is weaker in one respect and stronger in another, and both halves
 * are asserted here.
 *
 * Weaker: no check below can notice that a document was misread. That is what a
 * second human is for and the loss is real.
 *
 * Stronger: the last suite is a second independent pass a careful re-reading
 * could not perform. It goes back to the archived capture and looks for the
 * stored rate verbatim, which catches transcription between document and record
 * — the error a single reviewer reading their own work is least likely to see.
 */
describe('the checklist is declared, not improvised', () => {
  test('seven conditions, each one checkable', () => {
    assert.equal(METHODOLOGY.publication_checklist.length, 7);
  });

  test('and the honest note about what it cannot do is part of it', () => {
    assert.match(METHODOLOGY.review_note, /A single reader checking twice is not two readers/);
  });
});

describe('a published city satisfies every condition', () => {
  for (const c of CITIES.filter(passes)) {
    const t = tariffOf(c);
    describe(c.id, () => {
      test('every rate-bearing component names a source', () => {
        for (const comp of t.components.filter(x => x.kind !== 'rebate')) {
          assert.ok(comp.source_id ?? t.source_id, `${comp.id} has no source`);
        }
      });

      test('every source behind a published metric is archived under a real hash', () => {
        /* Per metric, not per city — the same distinction §7.2a draws. Dubai
           cites an unobtained decree that bears only on the sewerage rate, and
           that withholds the services figure rather than the whole record. */
        const map = c.sources_by_metric;
        const ids = map
          ? [...new Set([...(map.shared ?? []), ...(map.water_supply ?? [])])]
          : c.sources;
        for (const id of ids) {
          const s = SOURCES[id];
          assert.ok(s, `unknown source ${id}`);
          assert.ok(s.archive_sha256 && !String(s.archive_sha256).startsWith('PENDING'),
            `${id} is not archived`);
          /* A hash_only source is held privately and has no file here by design;
             the hash is the record (§7.3). */
          if (s.archive_kind !== 'hash_only') {
            assert.ok(typeof s.archive_path === 'string' && existsSync(join(ROOT, s.archive_path)),
              `${id} archive file is missing`);
          }
        }
      });

      test('nothing holding the published metric is unresolved', () => {
        /* Per metric, since a blocker holds the metric it names. Seoul's open
           sewerage tax question withholds its total water services figure and
           leaves the supply figure published. */
        for (const s of t.component_states ?? []) {
          if (s.status !== 'unresolved') continue;
          if (s.blocker_class === 'validation_gap') continue;
          assert.ok(s.affects_metric && s.affects_metric !== 'water_supply',
            `${s.component} is unresolved and holds the published metric`);
          assert.equal(t.metric_eligibility?.[s.affects_metric]?.publishable, false,
            `${s.component} withholds ${s.affects_metric}, which must be marked unpublishable`);
        }
        if (t.grade === 'A') for (const comp of t.components) assert.ok(!comp.assumed, comp.id);
      });

      test('any reconciliation present passes; its absence is a reported gap (v1.5)', () => {
        /* No longer a gate condition. A utility publishes a tariff, not a worked
           example of this benchmark. Where one exists it must reconcile exactly. */
        for (const k of t.public_reconciliation?.cases ?? []) {
          assert.equal(k.engine, k.published, `${k.label} does not reconcile`);
        }
        if (!t.public_reconciliation) {
          assert.ok(t.no_reconciliation_available || t.validation_note,
            'an absent reconciliation must still be stated, not left silent');
        }
      });

      test('the reference connection is declared with a source', () => {
        const rc = t.reference_connection;
        assert.ok(rc?.size, 'no reference connection');
        assert.ok(rc.source_id, `${rc.size} has no source`);
      });
    });
  }
});

describe('the second pass: each stored rate appears in its own archive', () => {
  /* Not a re-reading. This goes back to the captured document and looks for the
     figure as text. It is the one check a single reviewer could not do better by
     being more careful, because the failure it catches — a rate mistyped between
     document and record — looks correct in the record. */
  for (const c of CITIES.filter(passes)) {
    const t = tariffOf(c);
    test(`${c.id}`, () => {
      /* The check reads text. A page image is a stronger capture and an
         unreadable one here, so a rate resting on one cannot be verified this way
         and the record has to say so — the limitation is declared rather than
         passed over in silence.

         A print-to-PDF is the case in between: opaque to a reader of bytes and
         carrying a text layer all the same. Where the source stores that layer
         beside the document, it is read here. See readableArchives(). */
      const cited = c.sources.map(id => SOURCES[id]).filter(Boolean);
      const readable = cited.flatMap(readableArchives)
        .filter(p => existsSync(join(ROOT, p)));
      const opaque = cited.filter(s => readableArchives(s).length === 0
        && archiveFiles(s).some(p => existsSync(join(ROOT, p))));
      const archives = readable.map(p => readFileSync(join(ROOT, p), 'utf8')).join('\n');
      if (opaque.length) {
        assert.ok(t.verbatim_check_note,
          `${c.id} cites a capture the verbatim pass cannot read `
          + `(${opaque.map(s => s.id).join(', ')}) and must declare which rates it cannot reach`);
      }
      assert.ok(archives.length > 0, `${c.id} cites no readable archive`);

      const rates = [];
      for (const comp of t.components ?? []) {
        if (comp.kind === 'rebate') continue;
        for (const b of comp.blocks ?? []) if (b.rate) rates.push(b.rate);
        if (comp.rate) rates.push(comp.rate);
        if (comp.amount) rates.push(comp.amount);
      }
      assert.ok(rates.length > 0, `${c.id} stores no rates`);

      for (const r of rates) {
        /* Accept the figure as written, with or without a thousands separator,
           and trailing zeros trimmed — a document may print 1,170 or 4.6872. */
        /* A document may print the same rate several ways: 1,170 or 1170,
           4.6872, or a sub-unit — DEWA's statute gives 4.0 fils per gallon where
           the record stores AED 0.04. All of these are the figure appearing
           verbatim; a different number is not. The check accepts the forms and
           not the arithmetic: nothing here converts units for the record's
           benefit, it only recognises how publishers write them. */
        /* And a publisher may not write the decimal point at all. Eau de Paris
           prints 1,1942 for the rate this record stores as 1.1942, which under
           an anglophone reading is a different number by four orders of
           magnitude. The check recognises the comma as a decimal separator
           because the document does; it still refuses to accept a figure that
           is not there. */
        const forms = [
          String(r),
          Number(r).toLocaleString('en-US', { maximumFractionDigits: 6 }),
          String(r).replace('.', ','),
          Number(r).toLocaleString('fr-FR', { maximumFractionDigits: 6 }),
          String(Number((r * 100).toPrecision(12))),
          (r * 100).toFixed(1)
        ];
        const found = forms.some(f => archives.includes(f));
        if (!found && (t.verbatim_check_unreachable ?? []).includes(r)) continue;
        assert.ok(found,
          `${c.id}: stored rate ${r} appears in no archived capture, in any of ${forms.join(' / ')}`);
      }
    });
  }
});
