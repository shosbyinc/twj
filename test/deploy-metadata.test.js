import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = join(ROOT, 'dist/site');

/**
 * What a crawler receives, checked on the files a crawler receives.
 *
 * Two audits in a row read `twj-preview.html` — the single-file artifact, where
 * every image is a data URI and og:image is empty because a relative path in a
 * social card means nothing — and reported the site as missing per-route
 * metadata, social images and Article schema. All three exist, in the deploy
 * tree, which is the thing that ships. The preview is a convenience for reading
 * the site offline in one file and has never been the release artifact.
 *
 * Two conclusions, and only one of them is about the reviewers. The build
 * produces two outputs and only one is publishable, and nothing in the
 * repository said which. That is a real defect in how the work is handed over,
 * and it cost two review cycles. This test is the missing statement: the deploy
 * tree carries its own head per address, and if it stops doing so the build
 * fails rather than a reader discovering it in a link preview.
 */
/* This test reads the build, so it makes the build. It never assumes one is
   already there — that is the property test/build-bootstrap.test.js protects,
   and this file is held to it like any other. */
if (!existsSync(SITE) || !existsSync(join(ROOT, 'dist/index.html'))) {
  const run = (script, env) => execFileSync('node', [script],
    { cwd: ROOT, stdio: 'pipe', env: { ...process.env, ...env } });
  run('scripts/site.js');
  run('scripts/render.js');
  run('scripts/render.js', { TWJ_INLINE_IMAGES: 'false' });
}

const payload = JSON.parse(readFileSync(join(ROOT, 'dist/site.json'), 'utf8'));
const page = f => readFileSync(join(SITE, f), 'utf8');
const meta = (html, re) => (html.match(re) || [])[1] ?? null;

const ROUTES = [
  ['index.html', '/'],
  ['journal/index.html', '/journal'],
  ['water-index/index.html', '/water-index'],
  ['methodology/index.html', '/methodology'],
  ...payload.articles.map(a => [`article/${a.slug}/index.html`, `/article/${a.slug}`]),
  ...payload.cities.map(c => [`city/${c.id}/index.html`, `/city/${c.id}`])
];

describe('every address ships its own head, without running any script', () => {
  for (const [file, path] of ROUTES) {
    describe(path, () => {
      const html = page(file);

      test('has a title of its own', () => {
        const t = meta(html, /<title>([^<]*)<\/title>/);
        assert.ok(t && t.length > 8, 'no title');
        assert.ok(!/\$\{/.test(t), 'the title contains an unexpanded template');
      });

      test('has a description and a canonical URL', () => {
        assert.ok(meta(html, /<meta name="description" content="([^"]+)"/));
        assert.equal(meta(html, /<link rel="canonical" href="([^"]+)"/), 'https://twj.world' + path);
      });

      test('has an absolute og:url and og:image', () => {
        assert.equal(meta(html, /property="og:url" content="([^"]+)"/), 'https://twj.world' + path);
        const img = meta(html, /property="og:image" content="([^"]*)"/);
        assert.ok(img && img.startsWith('https://'),
          'og:image must be an absolute URL; a relative path is ignored by every social crawler');
      });
    });
  }

  test('an article carries its own cover, not the house mark', () => {
    for (const a of payload.articles) {
      if (!a.cover) continue;
      const img = meta(page(`article/${a.slug}/index.html`), /property="og:image" content="([^"]*)"/);
      assert.match(img, new RegExp(a.slug),
        `${a.slug} shares as something other than its own cover`);
    }
  });

  test('an article carries Article structured data with its dates', () => {
    for (const a of payload.articles) {
      const html = page(`article/${a.slug}/index.html`);
      const raw = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
      assert.ok(raw, `${a.slug} has no structured data`);
      const node = JSON.parse(raw.replace(/\\u003c/g, '<'))['@graph']
        .find(x => x['@type'] === 'Article');
      assert.ok(node, `${a.slug} has no Article node`);
      for (const k of ['headline', 'description', 'datePublished', 'dateModified',
                       'author', 'publisher', 'mainEntityOfPage']) {
        assert.ok(node[k], `${a.slug} Article node is missing ${k}`);
      }
    }
  });

  /* The preview is not the release. Stated here so the distinction is somewhere
     a person will read before the next review. */
  test('the preview is a single file and is not the release artifact', () => {
    const preview = readFileSync(join(ROOT, 'dist/index.html'), 'utf8');
    assert.ok(preview.includes('data:image'), 'the preview inlines its images by design');
    assert.ok(preview.length > 500000, 'the preview is one large file by design');
  });
});
