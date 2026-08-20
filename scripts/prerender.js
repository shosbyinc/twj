/**
 * Prerendering by running the site's own renderers.
 *
 * The first attempt at server-rendering wrote a second, plainer version of each
 * page in Node: a home renderer, a journal renderer, an article renderer. It
 * worked, and it was wrong in a way that only shows up later. Two renderers for
 * one page means two things to keep in step, and the one nobody looks at is the
 * one every crawler reads. It also does not scale: the Water Index, Compare,
 * Methodology and Editorial Independence would each need a twin, and the Index
 * twin would have to reimplement the tariff table.
 *
 * The page already knows how to draw itself. This module runs that code at build
 * time against a stub DOM, takes what it wrote into the container, and puts it
 * in the document. One renderer, no drift, and every page — including the data
 * pages — ships its content in the initial HTML.
 *
 * What the stub has to provide is small: a few elements by id, a classList that
 * does nothing, and a location whose protocol is https so the router builds real
 * paths rather than hash fragments. Anything the page needs beyond that is a
 * sign it is doing something at render time that belongs to interaction.
 */
import vm from 'node:vm';

/** Every route the site can draw, and how it draws it. */
const PAGES = [
  { test: p => p === '/',              section: 'p-home',    body: 'homeBody',    call: s => s.home() },
  { test: p => p === '/journal',       section: 'p-journal', body: 'journalBody', call: s => s.journal('all') },
  { test: p => /^\/journal\/[^/]+$/.test(p), section: 'p-journal', body: 'journalBody',
    call: (s, p) => s.journal(p.split('/')[2]) },
  { test: p => /^\/article\/[^/]+$/.test(p), section: 'p-article', body: 'articleBody',
    call: (s, p) => s.article(p.split('/')[2]) },
  { test: p => p === '/water-index',   section: 'p-index',   body: 'indexBody',   call: s => s.indexPage() },
  { test: p => /^\/city\/[^/]+$/.test(p), section: 'p-city', body: 'cityBody',
    call: (s, p) => s.city(p.split('/')[2]) },
  { test: p => p === '/compare',       section: 'p-compare', body: 'compareBody', call: s => s.comparePage() },
  { test: p => p === '/methodology',   section: 'p-method',  body: 'methodBody',  call: s => s.methodPage() },
  { test: p => p === '/independence',  section: 'p-about',   body: 'aboutBody',   call: s => s.aboutPage() }
];

function stubDom(payloadJson) {
  const style = () => ({ setProperty(){}, removeProperty(){}, getPropertyValue: () => '' });
  const nodes = new Map();
  const make = id => ({
    id, innerHTML: '', textContent: '', className: '', style: style(), dataset: {}, children: [],
    classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    appendChild(){}, remove(){}, focus(){}, scrollTo(){}, closest: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener(){}, removeEventListener(){}, contains: () => false
  });
  const get = id => { if (!nodes.has(id)) nodes.set(id, make(id)); return nodes.get(id); };
  nodes.set('payload', { id: 'payload', textContent: payloadJson });
  const doc = {
    title: '', documentElement: make('html'), body: make('body'), head: make('head'),
    getElementById: get, createElement: make, createTextNode: () => make('t'),
    querySelector: () => make('q'), querySelectorAll: () => [],
    addEventListener(){}, removeEventListener(){}, activeElement: make('a')
  };
  return { doc, nodes };
}

/**
 * @param {string} template  site/template.html, with __ROOT__ already substituted
 * @param {string} payloadJson  the payload as the page will receive it
 * @returns {(path: string) => { section: string, body: string, html: string } | null}
 */
export function makePrerenderer(template, payloadJson) {
  const blocks = [...template.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)];
  if (!blocks.length) throw new Error('prerender: no application script found in the template');
  const src = blocks[blocks.length - 1][1];

  const { doc, nodes } = stubDom(payloadJson);
  /* https, so the router chooses real paths over hash fragments — the same
     decision it makes in a browser served over HTTP. */
  const loc = { protocol: 'https:', pathname: '/', hash: '', search: '', href: 'https://localhost/' };
  const sandbox = {
    document: doc, console, location: loc,
    history: { pushState(){}, replaceState(){}, state: null },
    navigator: { userAgent: 'twj-prerender' },
    setTimeout, clearTimeout, requestAnimationFrame: fn => fn(),
    addEventListener(){}, removeEventListener(){}, scrollTo(){}, scrollY: 0,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener(){} }),
    IntersectionObserver: class { observe(){} unobserve(){} disconnect(){} },
    localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    fetch: () => Promise.reject(new Error('prerender: no network'))
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.document = doc;
  vm.createContext(sandbox);
  new vm.Script(src, { filename: 'site/template.html' }).runInContext(sandbox);

  return function prerender(path) {
    const page = PAGES.find(p => p.test(path));
    if (!page) return null;
    const node = nodes.get(page.body) ?? (nodes.set(page.body, { innerHTML: '' }), nodes.get(page.body));
    node.innerHTML = '';
    try {
      page.call(sandbox, path);
    } catch (err) {
      throw new Error(`prerender ${path}: ${err.message}`);
    }
    const html = nodes.get(page.body)?.innerHTML ?? '';
    if (!html) throw new Error(`prerender ${path}: the renderer wrote nothing into #${page.body}`);
    return { section: page.section, body: page.body, html };
  };
}

/**
 * Put the drawn page into the shell and make its section the visible one.
 * A section filled but left hidden is a correct document nobody can read.
 */
export function mount(html, { section, body, html: content }) {
  const opened = new RegExp(`(<div[^>]*id="${body}"[^>]*>)`);
  if (!opened.test(html)) throw new Error(`prerender: no container #${body} in the template`);
  /* The replacement is a function, and that is not a style choice.
     A replacement *string* is a small language: $1 is a capture group, $& the
     match, $` and $' the text around it. Passing a page through it means any
     article that happens to contain those two characters is silently rewritten
     — and one did. "A prize of $1,000,000" shipped to crawlers as ",000,000",
     because $1 was read as the first capture group and expanded to the div tag.
     Visible in the browser, wrong in the HTML, and invisible to anyone reading
     the page rather than the source.
     A function replacer switches that language off. Nothing that carries
     content should ever be a replacement string. */
  return html
    .replace('<section class="page on" id="p-home">', '<section class="page" id="p-home">')
    .replace(opened, m => m + content)
    .replace(`<section class="page" id="${section}">`, `<section class="page on" id="${section}">`);
}
