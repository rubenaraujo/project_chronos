import { FRAME_HOURS } from './config.js';

const pad = (n) => String(n).padStart(2, '0');

// All helpers work in local time; dates travel as 'YYYY-MM-DD' strings.
export function formatDay(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(date) {
    return `${formatDay(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDay(day) {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function toMinutes(hhmm) {
    const match = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function fromMinutes(total) {
    const minutes = ((total % 1440) + 1440) % 1440;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// The observation text format isn't documented, so this is defensive:
// an explicit HH:MM wins, else "N min" is added to the scheduled time.
export function delayedTime(scheduled, obs) {
    if (!/ATRASAD/i.test(obs)) return null;
    const explicit = obs.match(/(\d{1,2}):(\d{2})/);
    let minutes;
    if (explicit) {
        minutes = Number(explicit[1]) * 60 + Number(explicit[2]);
    } else {
        const delay = obs.match(/(\d+)\s*min/i);
        const base = toMinutes(scheduled);
        if (!delay || base === null) return null;
        minutes = base + Number(delay[1]);
    }
    const text = fromMinutes(minutes);
    return text === scheduled ? null : text;
}

export function etaLabel(diff) {
    if (diff === 0) return 'agora';
    if (diff < 60) return `em ${diff} min`;
    return `em ${Math.floor(diff / 60)}h ${pad(diff % 60)}`;
}

// Splits the visible part of the day into windows of FRAME_HOURS, never past 23:59.
export function timeFrames(day, fromTime = '00:00') {
    const start = toMinutes(fromTime) ?? 0;
    const end = 24 * 60 - 1;
    const base = parseDay(day);
    const at = (minutes) => new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minutes);
    const frames = [];
    for (let from = start; from < end; from += FRAME_HOURS * 60) {
        frames.push({ from: at(from), to: at(Math.min(from + FRAME_HOURS * 60, end)) });
    }
    return frames;
}

// A row is past only when its day is before today, or today and its time already went by.
export function isPast(day, time, now = new Date()) {
    const today = formatDay(now);
    if (day < today) return true;
    if (day > today) return false;
    const minutes = toMinutes(time);
    return minutes !== null && minutes < now.getHours() * 60 + now.getMinutes();
}
