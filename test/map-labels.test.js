import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CITIES = readdirSync(join(ROOT, 'data/cities')).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(join(ROOT, `data/cities/${f}`), 'utf8')))
  .filter(c => c.coordinates && c.publication_status !== 'research_pending');

/**
 * The map has to show every city it claims to show.
 *
 * Abu Dhabi sat one pixel from Dubai and was invisible on the map while being
 * present in the table, in the payload and on its own page. It was reported as
 * "the city is not displayed", and that was accurate about the map and wrong
 * about everything else — the kind of bug that only a reader finds.
 *
 * The fix moves labels and never dots: a dot in the wrong place is a false claim
 * about geography. This test reproduces the label placement and asserts that no
 * two collide.
 */
const LH = 7;
const place = cities => {
  const placed = [];
  return cities.map(c => ({ c, x: c.coordinates[1] + 180, y: 90 - c.coordinates[0] }))
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .map(({ c, x, y }) => {
      let ly = y + 1.5, side = 1, tries = 0;
      while (placed.some(p => Math.abs(p.x - x) < 30 && Math.abs(p.ly - ly) < LH * 0.85) && tries < 8) {
        ly += LH * side; side = -side; tries++;
      }
      placed.push({ x, ly });
      return { name: c.name, x, y, ly };
    });
};

describe('every public city gets a legible label', () => {
  const laid = place(CITIES);

  test('no two labels collide', () => {
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i], b = laid[j];
        if (Math.abs(a.x - b.x) >= 30) continue;
        assert.ok(Math.abs(a.ly - b.ly) >= LH * 0.85,
          `${a.name} and ${b.name} labels overlap`);
      }
    }
  });

  test('Dubai and Abu Dhabi are the case that found this', () => {
    /* Less than one degree apart: under one pixel on a world map. */
    const d = laid.find(l => l.name === 'Dubai'), a = laid.find(l => l.name === 'Abu Dhabi');
    assert.ok(d && a);
    assert.ok(Math.abs(d.x - a.x) < 1, 'the dots really are that close');
    assert.ok(Math.abs(d.ly - a.ly) >= LH * 0.85, 'and the labels must not be');
  });

  test('dots stay exactly where the coordinates put them', () => {
    /* Only labels move. Moving a dot to make a map tidier is a false claim. */
    for (const l of laid) {
      const c = CITIES.find(x => x.name === l.name);
      assert.equal(l.x, c.coordinates[1] + 180);
      assert.equal(l.y, 90 - c.coordinates[0]);
    }
  });

  test('the layout is deterministic, so the same set always renders alike', () => {
    const a = place(CITIES).map(l => [l.name, l.ly]);
    const b = place([...CITIES].reverse()).map(l => [l.name, l.ly]);
    assert.deepEqual(a, b, 'the input order must not change the output');
  });
});
