import { h } from './dom.js';
import { titleCase } from './text.js';
import { SERVICES } from './config.js';
import { isPast, etaLabel, formatDay } from './time.js';
import { findNext, matchesFilter } from './departures.js';

function buildRow(item, index, { day, showPast, onSelect }) {
    const timeCell = item.eta
        ? h(
              'span',
              { class: 'time-stack' },
              h('span', { class: 'late' }, item.eta),
              h('s', { class: 'was' }, item.time),
          )
        : item.time;
    const cells = [
        h('td', { class: 'time-cell' }, timeCell),
        h('td', { class: 'to-cell' }, titleCase(item.to)),
        h('td', { class: 'from-cell' }, titleCase(item.from)),
        h(
            'td',
            { class: 'obs-cell' },
            item.obs && h('span', { class: `pill ${item.obsKind}`.trim() }, titleCase(item.obs)),
        ),
        h('td', { class: 'eta-cell' }),
    ];
    const clickable = item.train !== null;
    const row = h(
        'tr',
        {
            class: [
                item.cancelled && 'cancelled',
                showPast && isPast(day, item.time) && 'past',
                clickable && 'clickable',
            ]
                .filter(Boolean)
                .join(' '),
            style: { '--svc': item.color, '--d': `${Math.min(index, 10) * 30}ms` },
            tabindex: clickable ? '0' : false,
        },
        cells,
    );
    if (clickable) {
        const open = () => onSelect(item.train, row);
        row.addEventListener('click', open);
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });
    }
    return row;
}

// Returns the view model: one entry per row, with hour headers as separate entries.
export function renderList(tbody, items, options) {
    const fragment = document.createDocumentFragment();
    const entries = [];
    let lastHour = null;
    items.forEach((item, index) => {
        const hour = item.time.slice(0, 2);
        if (hour !== lastHour) {
            lastHour = hour;
            const header = h('tr', { class: 'hour-row' }, h('th', { scope: 'rowgroup' }, `${hour}h`));
            fragment.append(header);
            entries.push({ header: true, row: header });
        }
        const row = buildRow(item, index, options);
        fragment.append(row);
        entries.push({ header: false, item, row });
    });
    tbody.replaceChildren(fragment);
    tbody.classList.toggle('enter', Boolean(options.animate));
    return entries;
}

// Hides rows of deselected services and hour headers left empty; returns how many rows stay visible.
export function applyFilter(entries, active) {
    let header = null;
    let count = 0;
    let total = 0;
    let first = true;
    const closeGroup = () => header?.classList.toggle('is-filtered', count === 0);
    for (const entry of entries) {
        if (entry.header) {
            closeGroup();
            header = entry.row;
            count = 0;
            continue;
        }
        const visible = matchesFilter(entry.item, active);
        entry.row.classList.toggle('is-filtered', !visible);
        entry.row.classList.toggle('first', visible && first);
        if (visible) {
            first = false;
            count++;
            total++;
        }
    }
    closeGroup();
    return total;
}

// Highlights today's next departure with a live countdown.
export function markNext(entries, active, day, now = new Date()) {
    for (const entry of entries) {
        if (entry.header) continue;
        entry.row.classList.remove('next');
        entry.row.querySelector('.eta-cell').textContent = '';
    }
    if (day !== formatDay(now)) return;
    const items = entries.filter((e) => !e.header).map((e) => e.item);
    const next = findNext(items, active, now.getHours() * 60 + now.getMinutes());
    if (!next) return;
    const entry = entries.find((e) => e.item === next.item);
    entry.row.classList.add('next');
    entry.row.querySelector('.eta-cell').textContent = etaLabel(next.diff);
}

export function renderLegend(container, active, onToggle) {
    container.replaceChildren(
        ...SERVICES.map((service) =>
            h(
                'button',
                {
                    type: 'button',
                    class: 'chip',
                    'aria-pressed': String(active.has(service.key)),
                    style: { '--svc': service.color },
                    onclick: (event) => onToggle(service.key, event.currentTarget),
                },
                service.key,
            ),
        ),
    );
}
