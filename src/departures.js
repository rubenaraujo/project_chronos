import { SERVICES, FALLBACK_COLOR } from './config.js';
import { delayedTime, toMinutes } from './time.js';

const serviceByKey = new Map(SERVICES.map((s) => [s.key, s]));

export function resolveService(tipo) {
    const key = String(tipo ?? '').trim();
    if (serviceByKey.has(key)) return serviceByKey.get(key);
    const partial = SERVICES.find((s) => key.includes(s.key));
    return partial ?? { key: '', color: FALLBACK_COLOR };
}

export function observationKind(obs) {
    const upper = obs.toUpperCase();
    if (upper.includes('SUPRIMIDO')) return 'bad';
    if (upper.includes('ATRASAD')) return 'warn';
    return '';
}

export function normalize(raw) {
    const time = String(raw.DataHoraPartidaChegada ?? '');
    const obs = String(raw.Observacoes ?? '').trim();
    const service = resolveService(raw.TipoServico);
    return {
        time,
        eta: delayedTime(time, obs),
        from: raw.NomeEstacaoOrigem ?? '',
        to: raw.NomeEstacaoDestino ?? '',
        service: service.key,
        color: service.color,
        operator: raw.Operador ?? '',
        obs,
        obsKind: observationKind(obs),
        cancelled: observationKind(obs) === 'bad',
        train: raw.NComboio1 ?? null,
    };
}

// Adjacent frames can overlap, so identical trains are dropped.
export function mergeDepartures(lists) {
    const seen = new Set();
    return lists
        .flat()
        .filter((item) => {
            const id = `${item.train}|${item.time}|${item.to}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        })
        .sort((a, b) => a.time.localeCompare(b.time));
}

export function matchesFilter(item, active) {
    return active.size === 0 || active.has(item.service);
}

// The next departure that is neither cancelled nor filtered out, with minutes until it leaves.
export function findNext(items, active, nowMinutes) {
    for (const item of items) {
        if (item.cancelled || !matchesFilter(item, active)) continue;
        const minutes = toMinutes(item.eta || item.time);
        if (minutes !== null && minutes >= nowMinutes) return { item, diff: minutes - nowMinutes };
    }
    return null;
}
