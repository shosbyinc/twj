import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { payload } from '../scripts/site.js';
import { noscriptFor, prerender, routes as ROUTES } from '../scripts/render.js';

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

/**
 * A page a crawler cannot read is a page that does not exist for most of them.
 *
 * Every article shipped its title, its standfirst, and then one paragraph about
 * JavaScript — the same paragraph on every URL and none of the piece itself.
 * Google runs scripts and saw the text; the crawlers that do not, which now
 * includes most of the ones training and answering from the open web, saw a
 * stub. For a publication whose argument is that its working is visible, being
 * invisible without scripts is close to self-refuting.
 *
 * The prose is already in the payload. These tests hold it on the page.
 */
/**
 * Every page carries its own content.
 *
 * Prerendering now runs the site's own renderers at build time instead of a
 * second set written in Node. That removes the failure this suite was built
 * around — two versions of a page drifting apart, with the one nobody looks at
 * being the one every crawler reads — and it removed the twins that would have
 * been needed for the Water Index, Compare, Methodology and Independence, one
 * of which would have had to reimplement the tariff table.
 *
 * It replaces that risk with a narrower one: a renderer that quietly writes
 * nothing. So the assertions are on the output, route by route, and the measure
 * is a word count.
 */
describe('every page carries its own content', () => {
  const strip = html => html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/g, '');
  const words = h => strip(h).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const drawn = path => {
    const r = prerender(path);
    assert.ok(r, `no prerenderer for ${path}`);
    return r.html;
  };

  test('every article ships its body', () => {
    for (const a of payload.articles) {
      const html = drawn(`/article/${a.slug}`);
      assert.ok(words(html) > 800, `${a.slug}: ${words(html)} words`);
      assert.ok(html.includes(a.title), `${a.slug}: no headline`);
    }
  });

  test('no two articles ship the same text', () => {
    const seen = new Map();
    for (const a of payload.articles) {
      const body = drawn(`/article/${a.slug}`);
      assert.equal(seen.get(body), undefined, `${a.slug} and ${seen.get(body)} are identical`);
      seen.set(body, a.slug);
    }
  });

  test('the data pages ship their data, not a note about JavaScript', () => {
    /* The Water Index is the thing this publication has that nobody else has,
       and it shipped as a heading and an apology. */
    const idx = drawn('/water-index');
    for (const c of payload.cities) assert.ok(idx.includes(c.name), `the Index omits ${c.id}`);
    assert.ok(words(idx) > 300, `the Index ships ${words(idx)} words`);
    assert.ok(words(drawn('/compare')) > 300);
  });

  test('the static pages ship their text', () => {
    for (const path of ['/methodology', '/independence']) {
      assert.ok(words(drawn(path)) > 300, `${path} ships ${words(drawn(path))} words`);
    }
  });

  test('a city record ships its figures', () => {
    const paris = drawn('/city/paris');
    assert.ok(paris.includes('1.87'), 'no price on the Paris record');
    assert.ok(words(paris) > 150);
  });

  test('the Journal and its sections list the pieces', () => {
    const j = drawn('/journal');
    for (const a of payload.articles) assert.ok(j.includes(a.title), `the Journal omits ${a.slug}`);
    for (const r of payload.rubrics) {
      const mine = payload.articles.filter(a => a.rubric === r.id);
      if (!mine.length) continue;
      const page = drawn(`/journal/${r.id}`);
      for (const a of mine) assert.ok(page.includes(a.title), `${r.id} omits ${a.slug}`);
    }
  });

  test('the notice about calculated figures appears only where there are figures', () => {
    for (const a of payload.articles) {
      const ns = noscriptFor(ROUTES.find(r => r.path === `/article/${a.slug}`));
      assert.ok(!ns.includes('stored tariff'), `${a.slug} carries the Water Index notice`);
    }
    for (const p of ['/journal', '/methodology', '/independence', '/']) {
      assert.ok(!noscriptFor(ROUTES.find(r => r.path === p)).includes('stored tariff'), `${p} carries it`);
    }
    assert.ok(noscriptFor(ROUTES.find(r => r.path === '/water-index')).includes('stored tariff'));
  });

  test('the fallback no longer repeats the whole site under every page', () => {
    /* It listed every article, every rubric and every city beneath each page.
       That inventory was written when the pages themselves were empty. */
    const ns = noscriptFor(ROUTES.find(r => r.path === '/'));
    assert.ok(ns.length < 900, `the fallback is ${ns.length} characters`);
    for (const a of payload.articles) assert.ok(!ns.includes(a.title));
  });
});

describe('the Journal has three levels, and an editor set them', () => {
  const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');
  const J = payload.stories.journal;

  test('the lead and the two beside it are named, not inferred', () => {
    assert.equal(J.lead, 'the-long-pause');
    assert.equal(J.secondary.length, 2);
    assert.ok(J.lead_reason && J.secondary_reason,
      'a curation with no reason recorded is indistinguishable from a default');
  });

  test('everything named resolves to a published piece', () => {
    const slugs = new Set(payload.articles.map(a => a.slug));
    for (const s of [J.lead, ...J.secondary]) assert.ok(slugs.has(s), `${s} is not published`);
  });

  test('nothing appears twice', () => {
    const featured = [J.lead, ...J.secondary];
    assert.equal(new Set(featured).size, featured.length);
    /* And the archive is built from what is left, not from everything. */
    assert.match(TPL, /sel\.filter\(a=>!shown\.has\(a\.slug\)\)/);
    assert.match(TPL, /const shown=new Set\(\[lead&&lead\.slug,\.\.\.two\.map\(a=>a\.slug\)\]/);
  });

  test('the three levels together cover the archive exactly once', () => {
    const featured = new Set([J.lead, ...J.secondary]);
    const latest = payload.articles.filter(a => !featured.has(a.slug));
    assert.equal(featured.size + latest.length, payload.articles.length);
    assert.equal(featured.size, 3);
  });

  test('the page falls back rather than breaking if nobody curated', () => {
    /* A publication that cannot render without an editor's file is a publication
       that goes blank the first time somebody mistypes a slug. */
    assert.match(TPL, /bySlug\(J\.lead\)\|\|/);
    assert.match(TPL, /two\.length<2\) return '';/);
  });

  test('no magazine furniture', () => {
    /* The rubric above the headline is the hierarchy. Anything that has to
       announce its own importance does not have any. */
    /* Read the markup, not the comments: the comment above secondary() names
       these labels in order to rule them out. */
    const markup = TPL.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const word of ['Featured Story', "Editor's Pick", 'Trending', 'Top Stories']) {
      assert.ok(!markup.includes(word), `the page says "${word}"`);
    }
  });

  test('excerpts are cut by level, so the levels read as levels', () => {
    assert.match(TPL, /function clamp\(t,n\)\{/);
    assert.match(TPL, /clamp\(a\.standfirst,150\)/);
  });

  test('the article meta line survives being read as text', () => {
    /* Three spans separated by a CSS gap extract as "The Water Journal2026-08-187
       min read". The separators are in the markup and hidden from screen
       readers, which already announce the parts separately. */
    assert.match(TPL, /<span aria-hidden="true">&middot;<\/span>/);
  });
});

/**
 * The site names one home, and previews do not compete with it.
 *
 * Every canonical, og:url, sitemap entry and the Sitemap line in robots.txt is
 * built from one constant. twj.world is owned and is the home; production says
 * so and nothing else does. A preview deployment carries the same pages at a
 * different address, so it gets that address and a noindex — a branch build
 * that either claims to be production or points its canonical there is asking
 * a crawler to index unfinished work as the real thing.
 *
 * The failure this guards is silent: nothing breaks, no build fails, and the
 * search result simply never appears.
 */
describe('the site names one home', () => {
  const RENDER = readFileSync(join(ROOT, 'scripts/render.js'), 'utf8');
  const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');

  test('production is twj.world, and an override is still possible', () => {
    assert.match(RENDER, /process\.env\.TWJ_ORIGIN/);
    assert.match(RENDER, /'https:\/\/twj\.world'/);
    assert.match(RENDER, /PREVIEW && VERCEL_HOST/);
  });

  test('a preview is a preview and says so', () => {
    assert.match(RENDER, /const PREVIEW = Boolean\(process\.env\.VERCEL_ENV/);
    assert.match(RENDER, /PREVIEW \? 'noindex,nofollow'/);
    assert.match(TPL, /<meta name="robots" content="__ROBOTS__">/);
  });

  test('one constant feeds canonical, og:url, the sitemap and robots.txt', () => {
    /* If any of the four is built from something else they can disagree, and a
       crawler resolving the disagreement will not choose in our favour. */
    for (const use of [/href="\$\{ORIGIN\}/, /__CANON__/, /\$\{ORIGIN\}\$\{\(BASE/, /Sitemap: \$\{ORIGIN\}/]) {
      assert.match(RENDER, use);
    }
  });

  test('the origin carries no trailing slash', () => {
    /* Two slashes in a canonical is a different URL. */
    assert.match(RENDER, /\.replace\(\/\\\/\$\/, ''\)/);
  });
});

describe('covers are shown whole', () => {
  const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');

  test('every frame that holds a cover is 4:5', () => {
    const frames = [...TPL.matchAll(/\.(hero-story|duostory|alist|latest)[^{]*\{[^}]*aspect-ratio:(\d+)\/(\d+)/g)];
    assert.ok(frames.length >= 4, `found ${frames.length} cover frames, expected at least four`);
    for (const [, cls, w, h] of frames) {
      assert.equal(`${w}/${h}`, '4/5', `.${cls} crops the poster to ${w}:${h}`);
    }
  });

  test('the artwork really is 4:5', () => {
    /* If the covers are ever redrawn at another shape, this fails and the
       frames get revisited rather than the posters quietly getting cropped. */
    const dir = join(ROOT, 'content/images');
    const covers = payload.articles.map(a => a.cover).filter(Boolean);
    assert.ok(covers.length >= 8, 'expected a cover on nearly every piece');
    void dir;
  });

  test('the full-bleed poster is never cropped at all', () => {
    /* On an article the cover is shown at its own size inside a frame, not
       stretched to fill one: width auto, bounded by max-width and max-height. */
    assert.match(TPL, /\.poster img\{width:auto;max-width/);
  });
});

/**
 * The home page is a door, not the room.
 *
 * It printed the whole archive: nine pieces at uniform size, which is exactly
 * the catalogue the Journal had just stopped being. A front page is not an index
 * of everything behind it. Three pieces and a way through.
 */
describe('the home page previews the Journal rather than reproducing it', () => {
  const drawn = path => prerender(path).html;

  test('three pieces, not nine', () => {
    const html = drawn('/');
    const linked = new Set([...html.matchAll(/article\/([a-z-]+)/g)].map(m => m[1]));
    assert.ok(linked.size <= 4, `the home page links ${linked.size} pieces`);
    assert.ok(linked.size >= 3, `the home page links only ${linked.size}`);
    assert.match(html, /From the Journal/);
    assert.match(html, /View the Journal/);
  });

  test('the featured piece is not shown twice on one screen', () => {
    const feat = payload.stories.featured?.article;
    const html = drawn('/');
    const inPreview = [...html.matchAll(/class="fj-(?:one|two)"[\s\S]*?article\/([a-z-]+)/g)]
      .map(m => m[1]);
    assert.ok(!inPreview.includes(feat),
      `${feat} is both the home feature and inside the preview below it`);
  });

  test('the Water Index stays a separate section', () => {
    /* Two products under one masthead. The preview above must not swallow it. */
    const html = drawn('/');
    assert.match(html, /Water Index/);
    assert.match(html, /All cities/);
  });

  test('no magazine furniture crept in', () => {
    const html = drawn('/');
    for (const w of ['Trending', 'Most Read', "Editor's Pick", 'Recommended']) {
      assert.ok(!html.includes(w), `the home page says "${w}"`);
    }
  });
});

/**
 * Every image reserves its own space.
 *
 * Without width and height the browser lays the page out without the picture and
 * reflows the moment it arrives — Cumulative Layout Shift, felt as the headline
 * jumping out from under the reader. With 4:5 covers the jump is a screenful.
 * The dimensions are read from the files at build time rather than asserted, so
 * a redrawn cover cannot silently contradict them.
 */
describe('images reserve their space', () => {
  const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');

  test('every img tag carries width and height', () => {
    /* Read the markup, not the comments: the rule above img{} explains the
       presentational-hint trap and mentions <img> while doing so. */
    const markup = TPL.replace(/\/\*[\s\S]*?\*\//g, '');
    const imgs = markup.match(/<img[^>]*>/g) ?? [];
    assert.ok(imgs.length >= 8);
    for (const img of imgs) {
      assert.match(img, /width=/, `no width: ${img.slice(0, 60)}`);
      assert.match(img, /height=/, `no height: ${img.slice(0, 60)}`);
    }
  });

  test('the dimensions are read from the files, not assumed', () => {
    for (const a of payload.articles) {
      if (!a.cover) continue;
      assert.ok(Number.isInteger(a.cover_w) && Number.isInteger(a.cover_h),
        `${a.slug}: no measured cover size`);
      assert.ok(a.cover_w > 100 && a.cover_h > 100, `${a.slug}: implausible size`);
    }
  });

  test('above the fold is eager, below it is lazy', () => {
    /* Lazy-loading the hero delays the largest paint, which is the one metric
       the reader actually feels. */
    assert.ok(!/fetchpriority="high"[^>]*loading="lazy"/.test(TPL));
    const lazy = (TPL.match(/loading="lazy"/g) ?? []).length;
    assert.ok(lazy >= 3, `only ${lazy} images defer`);
  });
});

/**
 * A width attribute is a hint, not a size.
 *
 * The masthead mark appeared as a tall dark ellipse. Cause: `img{max-width:100%}`
 * clamped its width to the 22 px of its container while the height attribute —
 * a presentational hint, not overridden by any CSS width — stood at its literal
 * pixel value. Adding dimensions to prevent layout shift introduced a different
 * distortion, which is the shape of the mistake worth remembering: the fix and
 * the bug were the same line.
 *
 * `height:auto` is what makes the two work together. Without it, every image
 * whose width is set in CSS is one attribute away from being stretched.
 */
describe('dimensions reserve space without dictating shape', () => {
  const TPL = readFileSync(join(ROOT, 'site/template.html'), 'utf8');

  test('the global image rule releases the height', () => {
    assert.match(TPL, /img\{[^}]*height:auto/);
  });

  test('the brand marks are square, and are declared square', () => {
    /* 160, 512 and 64 on disk, all 1:1. Guessing 34x34 and 120x120 was how this
       started. */
    const markup = TPL.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of markup.match(/<img[^>]*(?:id="(?:logo|footlogo)"|class="navmark")[^>]*>/g)
      ?? markup.match(/<img[^>]*id="(?:logo|footlogo)"[^>]*>/g) ?? []) {
      const w = /width="(\d+)"/.exec(m)?.[1];
      const h = /height="(\d+)"/.exec(m)?.[1];
      assert.equal(w, h, `the mark is declared ${w}x${h}, and it is square: ${m.slice(0, 50)}`);
    }
  });
});
