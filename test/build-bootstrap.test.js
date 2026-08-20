import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * `npm run build` is `node --test && node scripts/site.js && node scripts/render.js`.
 * The tests therefore run before anything is built, and dist/ is not checked in.
 *
 * Two tests read dist/site.json anyway. On a clean checkout they failed on a
 * missing file — so `npm test` could only pass on a machine where a build had
 * already succeeded, and CI, which checks out clean, could never be green. The
 * failure said nothing about the data and everything about the order, which is
 * the worst kind: a red that is always red stops being read.
 *
 * These two tests state the property that was violated. The first is cheap and
 * catches the mistake at the point it is made; the second proves the whole
 * chain runs from nothing, because a rule about imports can be satisfied by a
 * test that shells out instead.
 */
describe('the test suite does not depend on a prior build', () => {
  /* A second file needed the exclusion, and the note here said that if one ever
     did, the rule was wrong rather than the file. It was.
     
     The property worth protecting is that no test *depends on* a prior build.
     Naming the path was a cheap proxy for that, and it caught the wrong thing:
     test/deploy-metadata.test.js reads the deploy tree because the deploy tree
     is its subject, and it builds that tree itself before reading a byte of it.
     The rule is now what it always meant — read from dist/ only if you built
     dist/ — and the clean-checkout test below remains the real guarantee. */
  const files = readdirSync(join(ROOT, 'test'))
    .filter(f => f.endsWith('.js'))
    .filter(f => !/execFileSync\(\s*'node',\s*\[\s*(?:script|'scripts\/)/.test(
      readFileSync(join(ROOT, 'test', f), 'utf8')));

  test('the suite is not empty, or this proves nothing', () => {
    assert.ok(files.length > 10);
  });

  for (const f of files) {
    test(`${f} reads no build artifact`, () => {
      const src = readFileSync(join(ROOT, 'test', f), 'utf8');
      /* Mentions inside comments are how the reason gets recorded; what is
         forbidden is reading the path. */
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      assert.ok(!/['"`]dist\//.test(code),
        `${f} reads from dist/, which the build has not written when the tests run`);
    });
  }
});

describe('a clean checkout builds', () => {
  test('tests, payload and render run in order with no dist/ present', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'twj-bootstrap-'));
    /* Everything a checkout would carry — which is everything but dist/. */
    cpSync(ROOT, tmp, {
      recursive: true,
      filter: src => !src.includes('/dist') && !src.includes('/node_modules') && !src.includes('/.git')
    });
    assert.ok(!existsSync(join(tmp, 'dist')), 'the copy must start without a build');

    /* Not `npm test`: that would recurse into this test. The payload and the
       render are what the missing dist/ actually broke. */
    execFileSync('node', ['scripts/site.js'], { cwd: tmp, stdio: 'pipe' });
    execFileSync('node', ['scripts/render.js'], { cwd: tmp, stdio: 'pipe' });

    const built = JSON.parse(readFileSync(join(tmp, 'dist/site.json'), 'utf8'));
    assert.ok(built.cities.length > 0, 'the payload built from a clean tree is empty');
    rmSync(tmp, { recursive: true, force: true });
  });
});

describe('importing the payload writes nothing', () => {
  test('scripts/site.js only writes dist/ when it is run', async () => {
    const before = existsSync(join(ROOT, 'dist/site.json'))
      ? readFileSync(join(ROOT, 'dist/site.json'), 'utf8') : null;
    const { payload } = await import('../scripts/site.js');
    assert.ok(payload.cities.length > 0);
    const after = existsSync(join(ROOT, 'dist/site.json'))
      ? readFileSync(join(ROOT, 'dist/site.json'), 'utf8') : null;
    assert.equal(after, before, 'importing the payload changed dist/site.json');
  });
});
