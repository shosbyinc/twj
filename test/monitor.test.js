import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkSource, changeLog, hashContent, hashText, observationState, CADENCE } from '../src/monitor.js';

const SRC = [
  { id: 'thames-charges-scheme-2026-27', publisher: 'Thames Water',
    title: 'Household Charges Scheme 2026-27', class: 'tariff_schedule',
    last_checked_at: '2026-08-14', content_hash: hashContent('water 273.46 wastewater 147.21'),
    affects: ['london'] },
  { id: 'dewa-slab-tariff', publisher: 'DEWA', title: 'Slab tariff, fuel surcharge',
    class: 'monthly_surcharge', last_checked_at: '2026-08-15',
    content_hash: hashContent('fuel surcharge 0.005 AED/IG August 2026'),
    affects: ['dubai'] },
  { id: 'pub-water-price', publisher: 'PUB', title: 'Water price schedule',
    class: 'tariff_schedule', last_checked_at: '2026-08-14',
    content_hash: hashContent('tariff 1.43 wct 50% wbt 1.09'), affects: ['singapore'] }
];

describe('hashing', () => {
  test('the monitor hashes exactly as the archiver does', () => {
    /* If these two disagree, every source reports as changed and the warning
       stops meaning anything. */
    assert.equal(hashContent('water 273.46'), hashContent(Buffer.from('water 273.46')));
  });
  test('a rate change does raise one', () => {
    assert.notEqual(hashContent('water 273.46'), hashContent('water 289.10'));
  });

  test('the text variant survives markup churn, for live pages', () => {
    assert.equal(hashText('water  273.46\n wastewater 147.21'),
                 hashText('water 273.46 wastewater 147.21'));
  });
});

describe('checking one source', () => {
  test('unchanged and inside its window is current', () => {
    const c = checkSource(SRC[0], 'water 273.46 wastewater 147.21', '2026-08-20');
    assert.equal(c.state, 'current');
  });

  test('unchanged but past its window is verification due, not stale', () => {
    const c = checkSource(SRC[0], 'water 273.46 wastewater 147.21', '2026-10-20');
    assert.equal(c.state, 'verification_due');
    assert.ok(c.age > c.window);
  });

  test('a changed source is stale and carries both hashes', () => {
    const c = checkSource(SRC[0], 'water 289.10 wastewater 155.00', '2026-08-20');
    assert.equal(c.state, 'stale');
    assert.equal(c.changed, true);
    assert.notEqual(c.old_hash, c.new_hash);
    assert.deepEqual(c.affects, ['london']);
  });

  test('an unreachable source is stale, not silently passed', () => {
    const c = checkSource(SRC[0], null, '2026-08-20');
    assert.equal(c.state, 'stale');
    assert.equal(c.changed, null);
    assert.match(c.reason, /could not be reached/);
  });

  test("DEWA's monthly surcharge has a tighter window than a tariff schedule", () => {
    assert.ok(CADENCE.monthly_surcharge < CADENCE.tariff_schedule);
    const c = checkSource(SRC[1], 'fuel surcharge 0.005 AED/IG August 2026', '2026-09-14');
    assert.equal(c.state, 'verification_due');
  });
});

describe('the monthly change log', () => {
  test('a quiet month says so, and that is the stronger claim', () => {
    const checks = SRC.map(s => checkSource(s, {
      'thames-charges-scheme-2026-27': 'water 273.46 wastewater 147.21',
      'dewa-slab-tariff': 'fuel surcharge 0.005 AED/IG August 2026',
      'pub-water-price': 'tariff 1.43 wct 50% wbt 1.09'
    }[s.id], '2026-08-20'));
    const log = changeLog(checks, SRC);
    assert.equal(log.stale, 0);
    assert.match(log.headline, /No published tariff changed/);
  });

  test('a changed tariff names the city it affects', () => {
    const checks = SRC.map(s => checkSource(s, s.id === 'thames-charges-scheme-2026-27'
      ? 'water 289.10 wastewater 155.00'
      : { 'dewa-slab-tariff': 'fuel surcharge 0.005 AED/IG August 2026',
          'pub-water-price': 'tariff 1.43 wct 50% wbt 1.09' }[s.id], '2026-08-20'));
    const log = changeLog(checks, SRC);
    assert.equal(log.changed.length, 1);
    assert.deepEqual(log.cities_affected, ['london']);
    assert.match(log.headline, /1 source changed, affecting 1 city/);
  });

  test('detection never republishes a figure by itself', () => {
    const checks = [checkSource(SRC[2], 'tariff 1.55 wct 50% wbt 1.19', '2026-09-01')];
    const log = changeLog(checks, SRC);
    assert.match(log.changed[0].action, /no figure republished automatically/);
    assert.match(log.changed[0].action, /review opened/);
  });

  test('an unreachable source still moves its city', () => {
    const checks = [checkSource(SRC[1], null, '2026-09-01')];
    const log = changeLog(checks, SRC);
    assert.equal(log.unreachable.length, 1);
    assert.deepEqual(log.cities_affected, ['dubai']);
  });
});

describe('observation state follows its worst source', () => {
  test('one stale source makes the observation stale', () => {
    assert.equal(observationState(['current', 'current', 'stale']), 'stale');
  });
  test('otherwise the oldest window wins', () => {
    assert.equal(observationState(['current', 'verification_due']), 'verification_due');
  });
  test('all current is current', () => {
    assert.equal(observationState(['current', 'current']), 'current');
  });
});
