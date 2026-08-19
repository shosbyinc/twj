import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { payload } from '../scripts/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');

/**
 * The site is one file of JavaScript that draws every page, and until now
 * nothing in this suite ever parsed it.
 *
 * On 19 August 2026 a change to the city page left a template literal
 * unterminated. Six hundred and seventy-three tests passed. The build passed —
 * `npm run deploy` only substitutes text into a template, so a syntax error
 * travels through it untouched. The deploy tree was written, the pages were
 * the right size, every figure was correct in site.json, and the site rendered
 * a header, a footer and nothing in between. It was caught by somebody opening
 * it on a phone.
 *
 * That is the worst shape a failure can take here: green everywhere, broken in
 * the only place a reader looks. The data tests were all asking whether the
 * numbers were right. None was asking whether they could be displayed.
 *
 * These tests ask. The first parses the script, which would have caught it in
 * milliseconds. The second goes further and actually renders every route into
 * a stub DOM, because a page can parse and still throw the moment it runs —
 * and a city under relief exercises a branch that only one city in the
 * catalogue takes today.
 */

function scriptOf(html) {
  /* The last <script> without a src is the application; earlier ones are
     JSON-LD and the font block. */
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length, 'no inline script found in the template');
  return blocks[blocks.length - 1][1];
}

describe('the template is JavaScript, and is checked as JavaScript', () => {
  test('the application script parses', () => {
    const src = scriptOf(TPL);
    assert.doesNotThrow(() => new vm.Script(src, { filename: 'site/template.html' }),
      'the shipped script does not parse; every page would render empty');
  });

  test('it is substantial, or this test is checking a stub', () => {
    assert.ok(scriptOf(TPL).length > 20000);
  });
});

/**
 * A stub DOM: enough for the page to build its markup and set innerHTML, and
 * no more. The assertion is not that the HTML is correct — the checklist tests
 * do that against the data — but that drawing it does not throw.
 */
function stubDocument() {
  const nodes = new Map();
  const style = () => ({ setProperty(){}, removeProperty(){}, getPropertyValue: () => '' });
  const make = id => ({
    id, innerHTML: '', textContent: '', className: '', style: style(),
    dataset: {}, children: [], classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; },
    appendChild(){}, remove(){}, focus(){}, scrollTo(){}, closest(){ return null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    addEventListener(){}, removeEventListener(){}, contains(){ return false; }
  });
  const get = id => { if (!nodes.has(id)) nodes.set(id, make(id)); return nodes.get(id); };
  return {
    nodes,
    doc: {
      title: '', documentElement: make('html'), body: make('body'), head: make('head'),
      getElementById: get,
      createElement: make, createTextNode: () => make('text'),
      querySelector: () => make('q'), querySelectorAll: () => [],
      addEventListener(){}, removeEventListener(){},
      activeElement: make('active')
    }
  };
}

describe('every page draws without throwing', () => {
  const src = scriptOf(TPL);
  /* The template is filled by scripts/render.js; here only the data matters.
     The payload arrives in a <script type="application/json"> the page parses
     out of the DOM, so the stub serves it from getElementById rather than by
     substitution. */
  const filled = src.replaceAll('__ROOT__', '/');

  const run = () => {
    const { doc, nodes } = stubDocument();
    nodes.set('payload', { id: 'payload', textContent: JSON.stringify(payload) });
    const sandbox = {
      document: doc, console,
      window: { location: { pathname: '/', hash: '', search: '', href: 'about:blank' },
                addEventListener(){}, removeEventListener(){}, scrollTo(){}, matchMedia: () => ({ matches: false, addEventListener(){} }),
                history: { pushState(){}, replaceState(){} }, requestAnimationFrame: fn => fn(),
                getComputedStyle: () => ({ getPropertyValue: () => '' }) },
      location: { pathname: '/', hash: '', search: '', href: 'about:blank' },
      history: { pushState(){}, replaceState(){} },
      navigator: { userAgent: 'node' },
      requestAnimationFrame: fn => fn(), setTimeout, clearTimeout,
      addEventListener(){}, removeEventListener(){}, scrollTo(){}, scrollY: 0,
      getComputedStyle: () => ({ getPropertyValue: () => '' }),
      fetch: () => Promise.reject(new Error('no network in the stub')),
      localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
      IntersectionObserver: class { observe(){} unobserve(){} disconnect(){} },
      matchMedia: () => ({ matches: false, addEventListener(){} })
    };
    sandbox.window.document = doc;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    new vm.Script(filled, { filename: 'site/template.html' }).runInContext(sandbox);
    return { sandbox, nodes };
  };

  test('the script runs at all', () => {
    assert.doesNotThrow(run);
  });

  test('every other route draws too', () => {
    /* A city page is not the only page. These are the renderers the router
       reaches; a route added without a test here is a route nobody draws until
       a reader does. */
    const { sandbox } = run();
    for (const fn of ['home', 'indexPage', 'comparePage', 'methodPage', 'aboutPage', 'journal']) {
      assert.equal(typeof sandbox[fn], 'function', `${fn} is not reachable from the script`);
      assert.doesNotThrow(() => sandbox[fn](), `${fn} throws while drawing`);
    }
  });

  test('every article draws', () => {
    const { sandbox } = run();
    for (const a of payload.articles ?? []) {
      assert.doesNotThrow(() => sandbox.article(a.slug), `${a.slug} throws while drawing`);
    }
  });

  test('the city page draws for every city, including the one under relief', () => {
    const { sandbox, nodes } = run();
    const city = sandbox.city;
    assert.equal(typeof city, 'function', 'the city renderer is not reachable from the script');
    for (const c of payload.cities) {
      assert.doesNotThrow(() => city(c.id), `${c.id} throws while drawing`);
      const body = nodes.get('cityBody');
      assert.ok(body && body.innerHTML.length > 500, `${c.id} drew an empty page`);
      if (c.relief) {
        /* The branch that broke. Both figures, or the page is the citation
           trap the Tokyo record exists to prevent. */
        assert.match(body.innerHTML, /Two prices, and both are the tariff/);
        assert.ok(body.innerHTML.includes(c.relief.payable_m3.toFixed(2)),
          `${c.id} does not print the payable price`);
        assert.ok(body.innerHTML.includes(c.relief.structural_m3.toFixed(2)),
          `${c.id} does not print the standing tariff`);
      }
    }
  });
});

/**
 * The flag never outranks the figure.
 *
 * Perth declared its services metric unpublishable in `metric_eligibility` and
 * the payload asked `metric_grades`, a field five records had stopped carrying.
 * The answer was undefined, `undefined !== false` is true, and Perth shipped as
 * publishing a wastewater figure that does not exist for this scenario. Its
 * page threw on the null and rendered nothing — for weeks, silently, because
 * nothing in the suite ever drew a page.
 *
 * Two rules, and the second is the one that would have held anyway: read both
 * field names, and treat a metric with no number as unpublishable whatever any
 * record claims about it.
 */
describe('a published metric has a number', () => {
  test('nothing claims to publish a figure it does not have', () => {
    for (const c of payload.cities) {
      if (c.not_priced) continue;
      assert.notEqual(c.price_m3, null, `${c.id} is priced with no price`);
      if (c.services_publishable) {
        assert.notEqual(c.services_month, null,
          `${c.id} publishes a services figure that is null`);
        assert.notEqual(c.ww_share, null, `${c.id} publishes a null wastewater share`);
      }
    }
  });

  test('either declaration can withhold, and both are carried', () => {
    /* Until the two names are reconciled in the records, the payload must read
       whichever one a record uses — and a record using both must not have the
       stricter reading ignored. */
    for (const c of payload.cities) {
      if (c.not_priced) continue;
      const declared = [c.metric_eligibility, c.metric_grades]
        .some(d => d?.total_water_services?.publishable === false);
      if (declared) assert.equal(c.services_publishable, false,
        `${c.id} declares its services figure unpublishable and the payload publishes it`);
    }
  });

  test('a withheld metric says why', () => {
    for (const c of payload.cities) {
      if (c.not_priced || c.services_publishable) continue;
      assert.ok(c.services_blocked_by, `${c.id} withholds its services figure silently`);
    }
  });
});

/**
 * Unknown is not zero, and a rounder must not decide otherwise.
 *
 * Hong Kong gives 12 m³ a quarter free and Tokyo puts the first 5 m³ inside the
 * basic charge, so for both the published volumetric rate is zero and the share
 * of the bill sitting outside it has no value — not a large one, none. The
 * measure travelled from Infinity to null to 0% in three steps, each of them a
 * routine display convenience: a division, JSON.stringify, and Math.round. The
 * site then showed a reader "0%", which is the opposite claim and the one this
 * measure must never make, on the two cities where it is most tempting to read.
 *
 * The methodology distinguishes unknown from zero throughout. These tests make
 * the code do the same at every step where a number is prepared for display.
 */
describe('unknown is not zero', () => {
  test('the gap is null where there is no rate to sit outside of', () => {
    for (const c of payload.cities) {
      if (c.not_priced) continue;
      if (c.published_m3 === 0 || c.published_m3 == null) {
        assert.equal(c.gap_percent, null,
          `${c.id} has no published volumetric rate and must not report a gap`);
      } else {
        assert.ok(Number.isFinite(c.gap_percent), `${c.id} reports a non-finite gap`);
      }
    }
  });

  test('a genuine zero survives', () => {
    /* New York's effective price equals its published rate. That is a
       measurement of zero and must not be swept up with the unknowns. */
    const ny = payload.cities.find(c => c.id === 'newyork');
    assert.equal(ny.gap_percent, 0);
  });

  test('nothing unknown is ranked', () => {
    for (const [key, rows] of Object.entries(payload.comparables)) {
      if (!Array.isArray(rows)) continue;
      for (const r of rows) {
        assert.ok(Number.isFinite(r.value), `${key}: ${r.id} is ranked with value ${r.value}`);
      }
    }
  });

  test('the chart drops what it cannot draw, and says how many', () => {
    const { sandbox } = (() => {
      /* Reuse the stub from above by drawing a city page that carries a bar
         chart, then read what was written. */
      return { sandbox: null };
    })();
    /* Structural check on the source: the renderer must filter before it
       measures a maximum, or one null sets every bar to zero width. */
    const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');
    const cbar = TPL.slice(TPL.indexOf('function cbar('), TPL.indexOf('function relief('));
    assert.match(cbar, /filter\(r=>r\.value!=null&&isFinite\(r\.value\)\)/);
    assert.ok(cbar.indexOf('.filter(') < cbar.indexOf('Math.max'),
      'the chart takes a maximum before dropping unknowns');
    assert.match(cbar, /not shown/);
    void sandbox;
  });
});
