import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAll, scoreSession } from './score.ts';

const base = { id: 'a', startedAt: '2026-10-01T20:00:00Z', rating: null, hisOrgasms: null, herOrgasms: null, tags: [], place: null, city: null };

test('duration dominates with diminishing returns', () => {
  const s5 = scoreSession({ ...base, durationSec: 300 }, { newPlace: false, roundOfDay: 1 }).total;
  const s30 = scoreSession({ ...base, durationSec: 1800 }, { newPlace: false, roundOfDay: 1 }).total;
  const s120 = scoreSession({ ...base, durationSec: 7200 }, { newPlace: false, roundOfDay: 1 }).total;
  assert.ok(s5 < s30 && s30 < s120);
  assert.equal(s120, 40);
});

test('perfect session caps at 100', () => {
  const s = scoreSession(
    { ...base, durationSec: 3 * 3600, rating: 5, hisOrgasms: 2, herOrgasms: 3, tags: ['Car', 'Doggy', '69', 'Toys'] },
    { newPlace: true, roundOfDay: 2 },
  );
  assert.equal(s.total, 100);
  assert.equal(s.grade, 'Legendary');
});

test('history bonuses: new place and second round', () => {
  const scores = scoreAll(
    [
      { ...base, id: '1', durationSec: 600, place: 'Home', startedAt: '2026-10-01T08:00:00Z' },
      { ...base, id: '2', durationSec: 600, place: 'Hotel', startedAt: '2026-10-01T22:00:00Z' },
    ],
    (iso) => iso.slice(0, 10),
  );
  const adv = (id: string) => scores.get(id)!.parts.find((p) => p.key === 'adventure')!.points;
  assert.equal(adv('1'), 0);
  assert.equal(adv('2'), 6);
});
