import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, mergeDepartures, findNext, resolveService } from '../src/departures.js';
import { parseDepartures, parseTrip, ApiError } from '../src/api.js';

const raw = (time, extra = {}) => ({
    TipoServico: 'IC',
    DataHoraPartidaChegada: time,
    NomeEstacaoOrigem: 'A',
    NomeEstacaoDestino: 'B',
    Observacoes: '',
    NComboio1: 100,
    ...extra,
});

test('resolveService handles unknown types without throwing', () => {
    assert.equal(resolveService('IC').key, 'IC');
    assert.equal(resolveService('???').key, '');
    assert.equal(resolveService(undefined).key, '');
});

test('normalize flags cancelled and delayed trains', () => {
    const cancelled = normalize(raw('10:00', { Observacoes: 'SUPRIMIDO' }));
    assert.equal(cancelled.cancelled, true);
    const late = normalize(raw('10:00', { Observacoes: 'ATRASADO 5 min' }));
    assert.equal(late.eta, '10:05');
    assert.equal(late.obsKind, 'warn');
});

test('mergeDepartures removes overlaps and sorts', () => {
    const a = normalize(raw('10:00'));
    const b = normalize(raw('09:00', { NComboio1: 200 }));
    const merged = mergeDepartures([[a], [b, { ...a }]]);
    assert.deepEqual(
        merged.map((i) => i.time),
        ['09:00', '10:00'],
    );
});

test('findNext skips past, cancelled and filtered trains and uses delayed time', () => {
    const items = [
        normalize(raw('09:00')),
        normalize(raw('10:00', { Observacoes: 'SUPRIMIDO' })),
        normalize(raw('10:30', { TipoServico: 'IR', NComboio1: 2 })),
        normalize(raw('10:40', { Observacoes: 'ATRASADO 30 min', NComboio1: 3 })),
    ];
    assert.equal(findNext(items, new Set(), 9 * 60 + 30).item.time, '10:30');
    assert.equal(findNext(items, new Set(['IC']), 10 * 60 + 41).item.time, '10:40');
    assert.equal(findNext(items, new Set(), 23 * 60), null);
});

test('parseDepartures validates the response shape', () => {
    assert.deepEqual(parseDepartures({ response: [] }), []);
    assert.equal(
        parseDepartures({ response: [{ NodesComboioTabelsPartidasChegadas: [raw('10:00')] }] }).length,
        1,
    );
    assert.throws(() => parseDepartures({}), ApiError);
    assert.throws(() => parseDepartures({ response: [{ NodesComboioTabelsPartidasChegadas: 5 }] }), ApiError);
});

test('parseTrip validates the response shape', () => {
    assert.throws(() => parseTrip({ response: {} }), ApiError);
    const trip = parseTrip({
        response: {
            Origem: 'A',
            NodesPassagemComboio: [{ ComboioPassou: true, HoraProgramada: '10:00', NomeEstacao: 'X' }],
        },
    });
    assert.equal(trip.stops[0].passed, true);
});
