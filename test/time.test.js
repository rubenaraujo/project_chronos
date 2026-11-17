import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delayedTime, etaLabel, timeFrames, isPast, formatDay, parseDay } from '../src/time.js';
import { titleCase } from '../src/text.js';

test('delayedTime uses explicit HH:MM', () => {
    assert.equal(delayedTime('10:00', 'Atrasado 10:12'), '10:12');
});

test('delayedTime adds minutes and wraps midnight', () => {
    assert.equal(delayedTime('10:00', 'ATRASADO 15 min'), '10:15');
    assert.equal(delayedTime('23:50', 'Atrasado 20 min'), '00:10');
});

test('delayedTime ignores non-delays and unparseable delays', () => {
    assert.equal(delayedTime('10:00', 'Suprimido'), null);
    assert.equal(delayedTime('10:00', 'Atrasado'), null);
    assert.equal(delayedTime('10:00', 'Atrasado 10:00'), null);
});

test('etaLabel', () => {
    assert.equal(etaLabel(0), 'agora');
    assert.equal(etaLabel(7), 'em 7 min');
    assert.equal(etaLabel(65), 'em 1h 05');
});

test('timeFrames covers the day in 6h windows ending at 23:59', () => {
    const frames = timeFrames('2025-03-30');
    assert.equal(frames.length, 4);
    const last = frames.at(-1).to;
    assert.equal(formatDay(last), '2025-03-30');
    assert.equal(last.getHours() * 60 + last.getMinutes(), 1439);
});

test('timeFrames starts at the given time', () => {
    const [first] = timeFrames('2025-06-01', '14:30');
    assert.equal(first.from.getHours(), 14);
    assert.equal(first.from.getMinutes(), 30);
});

test('isPast respects the selected day', () => {
    const now = parseDay('2025-06-10');
    now.setHours(12, 0);
    assert.equal(isPast('2025-06-09', '23:00', now), true);
    assert.equal(isPast('2025-06-11', '00:10', now), false);
    assert.equal(isPast('2025-06-10', '11:59', now), true);
    assert.equal(isPast('2025-06-10', '12:00', now), false);
});

test('titleCase keeps small words lowercase', () => {
    assert.equal(titleCase('PORTO CAMPANHÃ'), 'Porto Campanhã');
    assert.equal(titleCase('SANTA APOLÓNIA DE LISBOA'), 'Santa Apolónia de Lisboa');
});
