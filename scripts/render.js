#!/usr/bin/env node
/**
 * Turns the payload into a site.
 *
 * Two outputs, because they answer two different questions.
 *
 *   preview  (default)  dist/index.html — one file, images inlined, opens from
 *                       disk, survives being sent to a phone. A page that only
 *                       works when its folder is intact is a page nobody checks.
 *
 *   deploy   TWJ_INLINE_IMAGES=false — a real static tree: assets on disk, one
 *                       HTML file per address, per-page title, description,
 *                       canonical and Open Graph tags, a noscript index, a
 *                       sitemap and a robots file.
 *
 * The second exists because a reference layer that cannot be linked to cannot
 * be cited. Every view in the site has an address; this is what makes the
 * address real to a server, a crawler and a reader pasting a URL.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const INLINE = process.env.TWJ_INLINE_IMAGES !== 'false';
/* Two outputs, two directories. They must not share a filename: the deploy
   tree's own index.html would otherwise overwrite the self-contained preview,
   and the preview would silently start pointing at assets it does not carry. */
const OUT = INLINE ? 'dist' : 'dist/site';
/* Every canonical, every og:url, every entry in the sitemap and the line in
   robots.txt is built from this, so it has to name the address the publication
   actually lives at. twj.world is owned and is the intended home: production
   canonicals point there and nowhere else, whatever host happens to serve the
   build.
   Preview deployments are the exception. A preview carries the same pages at a
   different address, and pointing its canonical at production would invite a
   crawler to index a half-finished branch as the real thing; claiming to *be*
   production would be worse. A preview gets its own address and is told not to
   be indexed at all — see PREVIEW below.
   One consequence worth stating plainly: until twj.world is attached to the
   project, production canonicals name a domain that does not resolve, and a
   page that says its real self lives at an address nobody can reach is indexed
   as nothing. The code cannot fix that. Attaching the domain can. */
const VERCEL_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const PREVIEW = Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production');
const ORIGIN = (process.env.TWJ_ORIGIN
  || (PREVIEW && VERCEL_HOST ? `https://${VERCEL_HOST}` : 'https://twj.world')).replace(/\/$/, '');
const ROBOTS = PREVIEW ? 'noindex,nofollow' : 'index,follow,max-image-preview:large';

/* Every asset and address is written from this. It is '/' for a site that owns
   its domain, and something like '/twj/' for a project page on a host that
   serves the tree from a subdirectory — where an absolute '/assets/...' would
   resolve above the site and 404. Set TWJ_BASE to move the whole tree. */
const BASE = ('/' + (process.env.TWJ_BASE || '/')).replace(/\/+/g, '/').replace(/\/?$/, '/');

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
               '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const payload = JSON.parse(readFileSync(join(ROOT, 'dist/site.json'), 'utf8'));
const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* A meta description is a sentence, not a paragraph. Cut on a word. */
const clip = (t, n = 300) => {
  const s = String(t ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n)) + '…';
};

/* ── assets ──────────────────────────────────────────────────────────────── */
let inlined = 0, copied = 0;
const missing = [];

function resolve(rel) {
  const web = rel.replace(/\.(jpg|jpeg|png)$/i, '.web.$1');
  const file = [join(ROOT, 'content', web), join(ROOT, 'content', rel)].find(existsSync);
  if (!file) { missing.push(rel); return null; }
  return file;
}

function dataUri(rel) {
  const file = resolve(rel); if (!file) return null;
  const mime = MIME[extname(file).toLowerCase()]; if (!mime) return null;
  inlined++;
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

/** Copy content/<rel> to dist/assets/<rel> and return the URL the page uses. */
function assetUrl(rel) {
  const file = resolve(rel); if (!file) return null;
  const out = join(ROOT, OUT, 'assets', rel);
  mkdirSync(dirname(out), { recursive: true });
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(file).mtimeMs) {
    copyFileSync(file, out); copied++;
  }
  return BASE + 'assets/' + rel;
}

const place = INLINE ? dataUri : assetUrl;

for (const key of ['mark', 'mark_large', 'favicon']) {
  const u = place(payload.brand[key]);
  if (u) payload.brand[key] = u;
}
for (const a of payload.articles) {
  /* Absolute, for the social card — a relative path in an og:image is ignored.
     Every platform crops a shared image to about 1.91:1, so a portrait cover
     loses its hook line. scripts/og.js writes a 1200x630 card beside the
     cover; it is used when it exists and the cover stands in when it does not. */
  if (a.cover && !INLINE) {
    a.cover_absolute = ORIGIN + BASE + 'assets/' + a.cover;
    const card = a.cover.replace(/\.jpg$/i, '.og.jpg');
    if (existsSync(join(ROOT, 'content', card))) {
      assetUrl(card);
      a.og_card = ORIGIN + BASE + 'assets/' + card;
    }
  }
  for (const key of ['cover', 'cover_story']) {
    if (!a[key]) continue;
    const u = place(a[key]);
    if (u) a[key] = u; else delete a[key];
  }
  a.html = a.html.replace(/src="(images\/[^"]+)"/g, (m, rel) => {
    const u = place(rel); return u ? `src="${u}"` : m;
  });
}
payload.site = { origin: ORIGIN, base_path: BASE, mode: INLINE ? 'preview' : 'deploy' };

/* ── routes ──────────────────────────────────────────────────────────────── */
const OG = payload.brand.mark_large.startsWith('data:')
  ? '' : ORIGIN + payload.brand.mark_large;

/* The home and section cards carried the TWJ mark, which is a logo on a white
   square wherever a link is shared. The covers are the strongest thing the
   publication makes; the featured story's is the one the front door shows. */
const featured = payload.articles.find(a => a.slug === payload.stories?.featured?.article)
  ?? payload.articles.find(a => a.cover_absolute);
const featuredCover = featured?.og_card ?? featured?.cover_absolute;

const routes = [
  { path: '/', file: 'index.html', type: 'website', priority: '1.0',
    title: 'The Water Journal — Water, explained differently',
    desc: 'An editorial and data publication exploring the world through water — science, cities, Earth, human performance, myth, and the systems that shape how we live.',
    image: featuredCover },
  { path: '/journal', file: 'journal/index.html', type: 'website', priority: '0.8',
    title: 'The Journal — The Water Journal',
    desc: 'Stories about the systems, science and ideas hidden inside water.',
    image: featuredCover },
  { path: '/water-index', file: 'water-index/index.html', type: 'website', priority: '0.9',
    title: 'Water Index — what a standardized household pays',
    desc: `What 15,000 litres a month costs in ${payload.cities.length} cities, each calculated from that city’s own published tariff and shown with its arithmetic, its sources and its comparability grade.` },
  { path: '/compare', file: 'compare/index.html', type: 'website', priority: '0.7',
    title: 'Compare — one household, every city in the Index',
    desc: 'The same standardized household across every city in the Index. The prices sit in their own currencies and are not ranked; the proportions compare directly.' },
  { path: '/methodology', file: 'methodology/index.html', type: 'website', priority: '0.7',
    title: 'Methodology — how The Water Journal measures water',
    desc: `Scenario ${payload.scenario}: what one household pays for 15,000 litres a month, calculated the same way in every city, in local currency, with the comparability grade printed beside it.` },
  { path: '/independence', file: 'independence/index.html', type: 'website', priority: '0.5',
    title: 'Editorial independence — who publishes The Water Journal',
    desc: 'The Water Journal is an editorial and data initiative established by Prana Spring. It publishes no bottled water index and no ranking of brands, and corrects itself in a public log.' }
];

for (const r of payload.rubrics) {
  if (!payload.articles.some(a => a.rubric === r.id)) continue;
  routes.push({ path: `/journal/${r.id}`, file: `journal/${r.id}/index.html`,
    type: 'website', priority: '0.6',
    title: `${r.name} — The Water Journal`, desc: clip(r.line),
    image: (a => a?.og_card ?? a?.cover_absolute)(payload.articles.find(a => a.rubric === r.id)) });
}
for (const a of payload.articles) {
  routes.push({ path: `/article/${a.slug}`, file: `article/${a.slug}/index.html`,
    type: 'article', priority: '0.8', lastmod: a.published,
    image: a.og_card ?? a.cover_absolute, title: `${a.title} — The Water Journal`,
    desc: clip(a.standfirst || a.title), article: a });
}
for (const c of payload.cities) {
  routes.push({ path: `/city/${c.id}`, file: `city/${c.id}/index.html`,
    type: 'website', priority: '0.8',
    title: `${c.name} — what water costs · The Water Journal`,
    desc: c.not_priced
      ? clip(c.withheld_by_gate
          ? `${c.name} is calculated but withheld. ${c.blocked_by}`
          : `${c.name} is described but not priced. ${c.blocked_by}`)
      : cityDesc(c) });
}

/* One sentence, and under live relief it has to carry two numbers.
   The description is what a search result and a shared link show, and it is
   the one place the page's own headline cannot correct: a summary reading
   "pays JPY 140.80" beside a page reading JPY 55.00 is the citation trap the
   Tokyo record was built to avoid, printed by us rather than by somebody
   quoting us. §5.4 in the metadata, not only in the markup. */
function cityDesc(c) {
  if (!c.relief) {
    return `A standardized household in ${c.name} pays ${c.symbol} ${c.price_m3.toFixed(2)} per 1,000 litres `
      + `on the ${c.utility} tariff. Grade ${c.grade}, with the arithmetic and sources shown.`;
  }
  return `A standardized household in ${c.name} pays ${c.symbol} ${c.relief.payable_m3.toFixed(2)} per 1,000 `
    + `litres while temporary relief runs, against ${c.symbol} ${c.relief.structural_m3.toFixed(2)} on the `
    + `standing ${c.utility} tariff. Grade ${c.grade}, with both figures, the arithmetic and the sources shown.`;
}

/* ── structured data ─────────────────────────────────────────────────────── */
function jsonld(route) {
  const graph = [{
    '@type': 'NewsMediaOrganization', '@id': ORIGIN + '/#publisher',
    name: 'The Water Journal', url: ORIGIN + '/',
    parentOrganization: { '@type': 'Organization', name: 'Prana Spring' },
    publishingPrinciples: ORIGIN + '/methodology',
    actionableFeedbackPolicy: ORIGIN + '/independence',
    correctionsPolicy: ORIGIN + '/methodology',
    email: 'editorial@twj.world',
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'editorial',
        email: 'editorial@twj.world', availableLanguage: ['en'] }
    ]
  }, {
    '@type': 'WebSite', '@id': ORIGIN + '/#site', url: ORIGIN + '/',
    name: 'The Water Journal', publisher: { '@id': ORIGIN + '/#publisher' }
  }];

  const art = payload.articles.find(a => route.path === '/article/' + a.slug);
  if (art) graph.push({
    '@type': 'Article', headline: art.title, description: clip(art.standfirst || art.title),
    datePublished: art.published, dateModified: art.revised || art.published,
    author: { '@type': 'Organization', name: art.author || 'The Water Journal' },
    publisher: { '@id': ORIGIN + '/#publisher' },
    mainEntityOfPage: ORIGIN + route.path,
    ...(art.cover_absolute ? { image: art.cover_absolute } : {})
  });

  const city = payload.cities.find(c => route.path === '/city/' + c.id);
  if (city && !city.not_priced) graph.push({
    '@type': 'Dataset', name: `${city.name} — standardized residential water cost`,
    description: clip(route.desc), url: ORIGIN + route.path,
    creator: { '@id': ORIGIN + '/#publisher' }, isAccessibleForFree: true,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Cost per 1,000 litres',
        value: city.price_m3, unitText: city.currency },
      { '@type': 'PropertyValue', name: 'Comparability grade', value: city.grade }
    ]
  });

  return '<script type="application/ld+json">'
    + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
    + '</' + 'script>';
}

/* ── noscript ────────────────────────────────────────────────────────────── */
/* Not a courtesy. Without it the address exists and its content does not, and
   a page whose figures are invisible without JavaScript cannot be read by
   anything that does not run it. */
const rubricName = id => payload.rubrics.find(r => r.id === id)?.name ?? 'The Water Journal';


/* Prerendering an article into the page it belongs on.
 *
 * The first attempt put the prose in <noscript>, which passes the "turn
 * JavaScript off and read the page" test and is still the wrong place for it.
 * A crawler that does not run scripts is not a browser with scripts disabled:
 * some read noscript, some skip it, and Google has spent years treating it as a
 * cloaking surface. The text belongs in the document, once, where every reader
 * finds it in the same place.
 *
 * So the article is written into #articleBody in the shipped HTML, and the
 * section carrying it is marked visible. When the router boots it repaints the
 * same container from the payload, which is a no-op a reader never sees. The
 * markup below is the same shape article() builds client-side; if the two drift
 * apart, the page changes under a reader on load, so they are kept together. */
/* Putting the document's own content into the document.
 *
 * Everything below is prerendered into the shell's containers and the section
 * holding it is marked visible, so a reader — human or machine — who never runs
 * a script still gets the page rather than a list of links. The router repaints
 * the same containers on boot from the payload, which is a no-op nobody sees.
 *
 * These renderers are deliberately plainer than their client-side twins: they
 * carry the words, the links and the dates, not the animation. Two renderers
 * for one page is a real cost and the reason it is paid here is that the
 * alternative was a publication invisible to anything that does not execute
 * JavaScript — which now includes most of what reads the open web. */
function mount(html, sectionId, containerOpen, content) {
  return html
    .replace('<section class="page on" id="p-home">', '<section class="page" id="p-home">')
    .replace(containerOpen, containerOpen.replace(/>$/, '>') + content)
    .replace(`<section class="page" id="${sectionId}">`,
             `<section class="page on" id="${sectionId}">`);
}

const artCard = a =>
  `<article class="nscard">
     <p class="r">${esc(rubricName(a.rubric))}</p>
     <h3><a href="${BASE}article/${esc(a.slug)}">${esc(a.title)}</a></h3>
     ${a.standfirst ? `<p>${esc(a.standfirst)}</p>` : ''}
     <p class="m">${esc(a.author || 'The Water Journal')} &middot;
       <time datetime="${esc(a.published || '')}">${esc(a.published || '')}</time>
       &middot; ${a.minutes} min read</p>
   </article>`;

function prerenderHome(html) {
  const [lead, ...rest] = payload.articles;
  const content = `
    <h1>The world, explained through water.</h1>
    <p>A publication about a single molecule and everything it touches &mdash; and a
       dataset that measures what it costs, where it comes from, and what it takes
       to keep it flowing.</p>
    <h2>Latest</h2>
    ${lead ? artCard(lead) : ''}
    <h2>More from the Journal</h2>
    ${rest.map(artCard).join('')}
    <h2>The Water Index</h2>
    <p>What 15,000 litres a month costs in ${payload.cities.length} cities, each
       calculated from that city&rsquo;s own published tariff.</p>
    <ul>${payload.cities.map(c => `<li><a href="${BASE}city/${esc(c.id)}">${esc(c.name)}</a>`
      + (c.not_priced ? ' &mdash; not priced' : ` &mdash; ${esc(c.symbol)} ${c.price_m3.toFixed(2)} per 1,000 litres`)
      + `</li>`).join('')}</ul>`;
  return mount(html, 'p-home', '<div id="homeBody">', content)
    .replace('<section class="page" id="p-home">', '<section class="page on" id="p-home">');
}

function prerenderJournal(html, rubric) {
  /* Same order the reader sees. A crawler served a different sequence from the
     one the page presents is being told the editor chose nothing. */
  const J = payload.stories?.journal ?? {};
  const bySlug = k => payload.articles.find(a => a.slug === k);
  const curated = [J.lead, ...(J.secondary ?? [])].map(bySlug).filter(Boolean);
  const list = rubric
    ? payload.articles.filter(a => a.rubric === rubric.id)
    : [...curated, ...payload.articles.filter(a => !curated.includes(a))];
  const content = `
    <h1>${rubric ? esc(rubric.name) : 'Stories about the systems, science and ideas hidden inside water.'}</h1>
    ${rubric ? `<p>${esc(rubric.line)}</p>` : ''}
    ${list.map(artCard).join('')}
    <h2>Sections</h2>
    <ul>${payload.rubrics.filter(r => payload.articles.some(a => a.rubric === r.id))
      .map(r => `<li><a href="${BASE}journal/${esc(r.id)}">${esc(r.name)}</a> &mdash; ${esc(r.line)}</li>`)
      .join('')}</ul>`;
  return mount(html, 'p-journal', '<div class="wrap" id="journalBody">', content);
}

function prerenderArticle(html, a) {
  /* cover_credit and formula are authored as markup and are rendered as markup
     client-side; escaping them here would print the tags at a reader. */
  const fig = (a.cover_story || a.cover)
    ? `<figure class="bleed poster"><img src="${esc(a.cover_story || a.cover)}" alt="${esc(a.cover_alt || '')}">`
      + (a.cover_credit ? `<figcaption>${a.cover_credit}</figcaption>` : '') + '</figure>'
    : '';
  const body = `${fig}
  <a class="back link" href="${BASE}journal/${esc(a.rubric)}">&larr; ${esc(rubricName(a.rubric))}</a>
  <h1>${esc(a.title)}</h1>
  ${a.standfirst ? `<p class="stand">${esc(a.standfirst)}</p>` : ''}
  ${a.formula ? `<div class="formula">${a.formula}</div>` : ''}
  <div class="meta"><span>${esc(a.author || 'The Water Journal')}</span>`
    + `<span><time datetime="${esc(a.published || '')}">${esc(a.published || '')}</time></span>`
    + `<span>${a.minutes} min read</span></div>
  <div class="body">${a.html}</div>
  <div class="artend">
    <a class="link" href="${BASE}journal/${esc(a.rubric)}">More in ${esc(rubricName(a.rubric))}</a>
    <a class="link" href="${BASE}journal">All sections</a></div>`;

  return mount(html, 'p-article', '<div class="col art" id="articleBody">', body);
}

function noscriptFor(route) {
  const link = (label, path) => `<li><a href="${BASE + path.replace(/^\//, '')}">${esc(label)}</a></li>`;
  let lead = `<h2>${esc(route.title)}</h2><p>${esc(route.desc)}</p>`;

  /* An article page shipped its title, its standfirst and then a paragraph about
     JavaScript — the same paragraph on every URL, and none of the piece itself.
     Google executes JS and saw the text; the crawlers that do not — GPTBot,
     ClaudeBot, PerplexityBot, CCBot, and Bing on a bad day — saw a stub. A
     publication whose whole claim is that its working is visible should not be
     invisible to the readers who never run its scripts.
     The prose is already rendered into the payload, so it costs nothing to
     ship it. */
  /* The body of an article is in the document itself now, so this block is
     only the way back out of it. */
  if (route.article) {
    return `<div class="wrap ns"><p>Sections of The Water Journal</p>
      <ul>${routes.filter(r => !r.article).map(r => link(r.title.split(' — ')[0], r.path)).join('')}</ul></div>`;
  }

  /* The Journal and the rubric pages listed nothing at all: a crawler that does
     not run scripts could not discover one article from either. */
  const listing = route.path === '/journal'
    ? payload.articles
    : payload.rubrics.some(r => route.path === '/journal/' + r.id)
      ? payload.articles.filter(a => '/journal/' + a.rubric === route.path)
      : null;
  if (listing && listing.length) {
    lead += '<ul>' + listing.map(a =>
      `<li><a href="${BASE}article/${a.slug}">${esc(a.title)}</a>`
      + (a.standfirst ? ` &mdash; ${esc(clip(a.standfirst))}` : '') + '</li>').join('') + '</ul>';
  }

  const city = payload.cities.find(c => route.path === '/city/' + c.id);
  if (city && !city.not_priced) {
    /* §5.4 — where relief is live the headline is what the household pays, and
       the standing tariff is what a comparison uses. A summary that printed one
       of them would be a lie whichever it printed, and this summary is the only
       version of the page a reader without JavaScript ever sees. */
    const price = city.relief
      ? `<b>${esc(city.symbol)} ${city.relief.payable_m3.toFixed(2)}</b> per 1,000 litres paid today,`
        + ` against <b>${esc(city.symbol)} ${city.relief.structural_m3.toFixed(2)}</b> on the standing tariff`
        + ` — temporary relief is live and the comparable figure is the standing one`
      : `<b>${esc(city.symbol)} ${city.price_m3.toFixed(2)}</b> per 1,000 litres`;
    lead += `<p>${price} · ${esc(city.utility)} · tariff effective ${esc(city.tariff_effective)}`
      + ` · Grade ${esc(city.grade)}</p>`;
  }

  return `<div class="wrap ns">${lead}
    ${city || route.path === '/water-index' || route.path === '/compare'
      ? `<p>This page renders its figures with JavaScript. Every one of them is
         calculated from a stored tariff by the engine in this project’s
         repository, and the whole dataset is published as JSON.</p>` : ''}
    <ul>${routes.map(r => link(r.title.split(' — ')[0], r.path)).join('')}</ul>
    <ul>${link('The full dataset as JSON', 'site.json')}</ul></div>`;
}

/* ── fonts ───────────────────────────────────────────────────────────────── */
/* Outfit came from Google Fonts, which is a third-party request on every page
   load: it is blocked in mainland China, where the reader gets a hang and then
   the fallback stack, and it hands a European reader's IP to a US server
   before they have chosen to talk to one.
   Drop the five weights into content/fonts/ as outfit-200.woff2 … and this
   serves them from the site's own origin instead. Nothing else changes; if the
   files are absent the Google block is written exactly as before, so the
   build never breaks over a font. */
const FONT_WEIGHTS = [200, 300, 400, 500, 600];
function fontBlock() {
  const local = FONT_WEIGHTS
    .map(w => ({ w, rel: `fonts/outfit-${w}.woff2` }))
    .filter(f => existsSync(join(ROOT, 'content', f.rel)));

  if (local.length !== FONT_WEIGHTS.length) {
    if (local.length) console.log(`  fonts: ${local.length}/${FONT_WEIGHTS.length} weights present — using Google until all five are`);
    return '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
      + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      + '<link rel="stylesheet" media="print" onload="this.media=\'all\'"\n'
      + '      href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap">\n'
      + '<noscript><link rel="stylesheet"\n'
      + '  href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap"></noscript>';
  }
  const faces = local.map(f => {
    const url = INLINE
      ? `data:font/woff2;base64,${readFileSync(join(ROOT, 'content', f.rel)).toString('base64')}`
      : assetUrl(f.rel);
    return `@font-face{font-family:Outfit;font-style:normal;font-weight:${f.w};`
      + `font-display:swap;src:url(${url}) format('woff2')}`;
  }).join('');
  console.log('  fonts: self-hosted, no third-party request');
  return `<style>${faces}</style>`;
}
const FONTS = fontBlock();

/* ── write ───────────────────────────────────────────────────────────────── */
const tpl = readFileSync(join(ROOT, 'site/template.html'), 'utf8');
const json = JSON.stringify(payload).replace(/<\/script>/gi, '<\\/script>');

function build(route) {
  const canon = ORIGIN + (route.path === '/' ? '/' : route.path);
  const rubric = payload.rubrics.find(r => route.path === '/journal/' + r.id);
  const shell = route.article ? prerenderArticle(tpl, route.article)
    : route.path === '/' ? prerenderHome(tpl)
    : route.path === '/journal' ? prerenderJournal(tpl, null)
    : rubric ? prerenderJournal(tpl, rubric)
    : tpl;
  return shell
    .replaceAll('__ROOT__', BASE)
    .replace('__FONTS__', FONTS)
    .replace('__JSONLD__', jsonld(route))
    .replace('__NOSCRIPT__', noscriptFor(route))
    .replaceAll('__TITLE__', esc(route.title))
    .replaceAll('__DESC__', esc(route.desc))
    .replaceAll('__CANON__', esc(canon))
    .replaceAll('__OGTYPE__', route.type)
    .replaceAll('__OGIMAGE__', esc(route.image || OG))
    .replaceAll('__FAVICON__', esc(payload.brand.favicon))
    .replace('__ROBOTS__', ROBOTS)
    .replace('__PAYLOAD__', json);
}

/* dist/site.json stays exactly as scripts/site.js wrote it. The copy held in
   memory here has had its image paths rewritten; writing it back would make
   the payload unreadable to the next run and unusable to a reader. */
mkdirSync(join(ROOT, OUT), { recursive: true });

if (INLINE) {
  const html = build(routes[0]);
  writeFileSync(join(ROOT, 'dist/index.html'), html);
  console.log(`preview · dist/index.html · ${payload.cities.length} cities · ${(html.length / 1048576).toFixed(2)} MB`);
  console.log(`  ${inlined} images inlined · one file`);
  console.log(`  the router tests its transport at load: a server gets real paths,`);
  console.log(`  a filesystem gets the hash, a sandboxed frame keeps the route in memory`);
  console.log(`  for a deployable tree with real addresses: npm run deploy`);
} else {
  /* Clear the generated route tree first. Without this a city that leaves the
     public catalogue keeps its old page live — London stayed reachable for a
     build after v1.4 removed it, which is the opposite of what §5.3 asks for.
     Only generated directories are cleared; assets and the dataset are not. */
  for (const dir of ['city', 'article', 'journal', 'water-index', 'compare',
                     'methodology', 'independence']) {
    rmSync(join(ROOT, OUT, dir), { recursive: true, force: true });
  }
  for (const r of routes) {
    const out = join(ROOT, OUT, r.file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, build(r));
  }
  /* Some hosts want an explicit 404 document. It is the same shell, and the
     router resolves whatever address the reader was actually asking for. */
  writeFileSync(join(ROOT, OUT, '404.html'), build({
    path: '/404', type: 'website', title: 'Not found — The Water Journal',
    desc: 'This address does not resolve.' }));

  const lastmod = payload.generated_at.slice(0, 10);
  writeFileSync(join(ROOT, OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + routes.map(r => `  <url><loc>${ORIGIN}${(BASE + r.path.replace(/^\//, '')).replace(/\/$/, '') || '/'}</loc>`
        + `<lastmod>${r.lastmod || lastmod}</lastmod>`
        + `<priority>${r.priority}</priority></url>`).join('\n')
    + '\n</urlset>\n');
  writeFileSync(join(ROOT, OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`);

  /* A publication that comes out on no fixed day needs a feed, or the only way
     to find out that something was published is to visit and look. The feed
     carries the standfirst, not the article: it is an announcement, and the
     piece is read at its own address with its sources under it. */
  const rfc822 = d => new Date(`${d}T09:00:00Z`).toUTCString();
  const feedItems = payload.articles.slice(0, 30).map(a => `  <item>
    <title>${esc(a.title)}</title>
    <link>${ORIGIN}${BASE}article/${a.slug}</link>
    <guid isPermaLink="true">${ORIGIN}${BASE}article/${a.slug}</guid>
    <pubDate>${rfc822(a.revised || a.published)}</pubDate>
    <category>${esc(payload.rubrics.find(r => r.id === a.rubric)?.name ?? a.rubric)}</category>
    <description>${esc(clip(a.standfirst || a.title))}</description>
  </item>`).join('\n');
  writeFileSync(join(ROOT, OUT, 'feed.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>The Water Journal</title>
  <link>${ORIGIN}${BASE}</link>
  <atom:link href="${ORIGIN}${BASE}feed.xml" rel="self" type="application/rss+xml"/>
  <description>Water, explained differently — science, cities, Earth, human performance and myth, with the arithmetic shown.</description>
  <language>en</language>
  <lastBuildDate>${new Date(payload.generated_at).toUTCString()}</lastBuildDate>
${feedItems}
</channel>
</rss>
`);

  /* The dataset ships beside the pages: the noscript block links to it and
     the methodology invites a reader to check the arithmetic themselves. */
  copyFileSync(join(ROOT, 'dist/site.json'), join(ROOT, OUT, 'site.json'));
  console.log(`deploy · ${OUT}/ · ${routes.length} addresses · ${copied} assets copied`);
  for (const r of routes) console.log('  ' + (ORIGIN + r.path).padEnd(48) + r.file);
  console.log('  + 404.html · sitemap.xml · feed.xml · robots.txt · site.json');
}
if (missing.length) console.log(`  missing: ${[...new Set(missing)].join(', ')}`);

/* Exported for the tests: the crawler-facing text is a published surface and is
   checked from the source that produces it, not from a build artifact. */
export { noscriptFor, prerenderArticle, prerenderHome, prerenderJournal, routes, ORIGIN, ROBOTS };
