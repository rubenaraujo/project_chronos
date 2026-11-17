import { $, h } from './dom.js';
import { fetchTrip } from './api.js';
import { titleCase } from './text.js';

let controller = null;
let opener = null;

function tripView(trip) {
    const nextIndex = trip.stops.findIndex((stop) => !stop.passed);
    const tags = [
        trip.service && titleCase(trip.service),
        trip.operator,
        trip.status && titleCase(trip.status),
    ].filter(Boolean);
    const meta = [`${trip.departure} → ${trip.arrival}`, trip.duration].filter(Boolean).join(' · ');
    return [
        h(
            'div',
            { class: 'trip-head' },
            h('h2', { id: 'popup-title' }, `${titleCase(trip.origin)} → ${titleCase(trip.destination)}`),
            h('p', {}, meta),
        ),
        h(
            'div',
            { class: 'trip-tags' },
            tags.map((tag) => h('span', { class: 'pill' }, tag)),
        ),
        h(
            'ol',
            { class: 'timeline' },
            trip.stops.map((stop, index) =>
                h(
                    'li',
                    {
                        class: ['stop', stop.passed && 'done', index === nextIndex && 'next']
                            .filter(Boolean)
                            .join(' '),
                    },
                    h('span', {}, titleCase(stop.name)),
                    h('time', {}, stop.time),
                ),
            ),
        ),
    ];
}

export function openSheet(train, trigger) {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    opener = trigger ?? null;
    const content = $('popup-content');
    content.replaceChildren();
    $('popup').classList.add('loading');
    document.body.classList.add('sheet-open', 'no-scroll');
    $('table').inert = true;
    $('popup').focus();

    fetchTrip(train, signal)
        .then((trip) => content.replaceChildren(...tripView(trip)))
        .catch((error) => {
            if (signal.aborted) return;
            console.error('Trip fetch failed:', error);
            content.replaceChildren(h('p', { class: 'empty' }, 'Não foi possível carregar o percurso.'));
        })
        .finally(() => {
            if (!signal.aborted) $('popup').classList.remove('loading');
        });
}

export function closeSheet() {
    if (!document.body.classList.contains('sheet-open')) return;
    controller?.abort();
    document.body.classList.remove('sheet-open', 'no-scroll');
    $('table').inert = false;
    opener?.focus?.();
    opener = null;
}

export function initSheet() {
    $('backdrop').addEventListener('click', closeSheet);
    $('popup-close').addEventListener('click', closeSheet);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeSheet();
    });
}
