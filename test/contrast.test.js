import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CSS = readFileSync(join(ROOT, 'site/template.html'), 'utf8');

/**
 * Text contrast, checked rather than eyeballed.
 *
 * The brand palette publishes two turquoises, and both are rule colours wearing
 * text colours' clothes: on white #19B7C4 measures 2.44:1 and #00B1AE 2.66:1,
 * where AA asks 4.5 for small text and 3.0 for large. Applying the published
 * accent to the sub-rubric labels, the figures and the links — which is what a
 * faithful reading of the brand book produces — put unreadable type on the page
 * while looking correct in a screenshot at full brightness.
 *
 * The palette is not wrong; it was written for rules, bars, dots and mastheads.
 * What was missing is the distinction between a colour that carries a shape and
 * a colour that carries words. --edit-text is the same hue taken down until it
 * passes, and this test stops the published values from drifting back into type.
 */
const hex = h => {
  const v = h.replace('#', '');
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255);
};
const lum = h => {
  const [r, g, b] = hex(h).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Read a custom property out of the :root block. */
const token = name => {
  const m = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  assert.ok(m, `--${name} is not declared`);
  return m[1];
};

const PAPER = '#FFFFFF';
const SNOW = '#F2F4F2';

describe('every colour that carries words is readable', () => {
  const cases = [
    ['body copy', '#3A4045', PAPER, 4.5],
    ['headings and standfirst', token('ink'), PAPER, 4.5],
    ['secondary metadata', token('quiet'), PAPER, 4.5],
    ['the accent, where it carries text', token('edit-text'), PAPER, 4.5],
    ['the accent on the notes panel', token('edit-text'), SNOW, 4.5],
    ['apparatus copy on the notes panel', '#616870', SNOW, 4.5]
  ];
  for (const [what, fg, bg, min] of cases) {
    test(`${what}: ${fg} on ${bg}`, () => {
      const r = ratio(fg, bg);
      assert.ok(r >= min,
        `${fg} on ${bg} is ${r.toFixed(2)}:1, below the ${min}:1 this text size needs`);
    });
  }

  test('the published accents are known to fail as text, which is why they are not used as text', () => {
    /* Stated as an assertion so the reason survives: if a future palette makes
       these readable, this test fails and the workaround can be removed. */
    assert.ok(ratio(token('edit'), PAPER) < 4.5);
    assert.ok(ratio(token('prana'), PAPER) < 4.5);
  });

  test('no published accent is set as a text colour in the article', () => {
    const article = CSS.slice(CSS.indexOf('.art{background:var(--paper)}'), CSS.indexOf('.artend{'));
    const offenders = article.split('\n')
      .filter(l => /color:var\(--(edit|prana)\)/.test(l) && !/background|border|--edit-text/.test(l));
    assert.deepEqual(offenders.map(l => l.trim().slice(0, 80)), [],
      'a rule colour is being used as a text colour; use --edit-text');
  });
});
