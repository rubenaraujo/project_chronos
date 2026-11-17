import { $, h } from './dom.js';
import { STATIONS, DEFAULT_STATION, REFRESH_MS, TICK_MS } from './config.js';
import { formatDay, timeFrames } from './time.js';
import { fetchDepartures } from './api.js';
import { mergeDepartures } from './departures.js';
import { renderList, applyFilter, markNext, renderLegend } from './render.js';
import { initSheet, openSheet } from './sheet.js';
import { initPullToRefresh } from './ptr.js';

const state = {
    showPast: false,
    active: new Set(),
    entries: [],
    day: '',
    lastUpdated: 0,
    stale: false,
    controller: null,
};

const tbody = () => $('data-table').tBodies[0];

function setLoading(on) {
    document.body.classList.toggle('is-loading', on);
    $('fetch-button').disabled = on;
}

function setEmpty(message, retry = false) {
    const empty = $('empty');
    empty.replaceChildren(message || '');
    if (message && retry) {
        empty.append(
            h('button', { type: 'button', class: 'retry', onclick: () => load() }, 'Tentar de novo'),
        );
    }
    empty.hidden = !message;
}

function updateStamp() {
    const el = $('updated');
    if (!state.lastUpdated) return;
    const minutes = Math.floor((Date.now() - state.lastUpdated) / 60000);
    const age = minutes < 1 ? 'agora' : `há ${minutes} min`;
    el.textContent = state.stale ? `Sem ligação · dados de ${age}` : `Atualizado ${age}`;
    el.classList.toggle('offline', state.stale);
    el.hidden = false;
}

function refreshView() {
    const visible = applyFilter(state.entries, state.active);
    if (state.entries.length > 0) setEmpty(visible > 0 ? '' : 'Sem comboios para este filtro.');
    markNext(state.entries, state.active, state.day);
}

function toggleService(key, chip) {
    state.active.has(key) ? state.active.delete(key) : state.active.add(key);
    chip.setAttribute('aria-pressed', String(state.active.has(key)));
    const update = () => refreshView();
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(update);
    } else {
        update();
    }
}

// silent=true refreshes in the background: no skeleton, no error message,
// and the current list stays until the new data arrives.
async function load(silent = false) {
    state.controller?.abort();
    const controller = (state.controller = new AbortController());
    const now = new Date();
    const day = $('start-date').value || formatDay(now);
    const isToday = day === formatDay(now);
    const fromTime = isToday && !state.showPast ? now.toTimeString().slice(0, 5) : '00:00';
    const station = STATIONS.find((s) => s.id === $('where-am-i').value) ?? STATIONS[0];

    if (!silent) {
        setLoading(true);
        setEmpty('');
        state.entries = [];
        tbody().replaceChildren();
    }

    try {
        const frames = timeFrames(day, fromTime);
        const lists = await Promise.all(
            frames.map((frame) => fetchDepartures(station.code, frame.from, frame.to, controller.signal)),
        );
        const items = mergeDepartures(lists);
        state.day = day;
        state.entries = renderList(tbody(), items, {
            day,
            showPast: state.showPast,
            animate: !silent,
            onSelect: openSheet,
        });
        setEmpty(items.length === 0 ? 'Sem comboios para esta seleção.' : '');
        refreshView();
        state.lastUpdated = Date.now();
        state.stale = false;
        updateStamp();
        setLoading(false);
    } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error fetching data:', error);
        if (silent) {
            state.stale = true;
            updateStamp();
            return;
        }
        setEmpty('Não foi possível carregar os comboios. Verifique a ligação.', true);
        $('updated').hidden = true;
        state.lastUpdated = 0;
        setLoading(false);
    }
}

function init() {
    const select = $('where-am-i');
    select.replaceChildren(...STATIONS.map((s) => h('option', { value: s.id }, s.label)));
    select.value = DEFAULT_STATION;
    $('start-date').value = formatDay(new Date());

    select.addEventListener('change', () => load());
    $('start-date').addEventListener('change', () => load());
    $('fetch-button').addEventListener('click', () => load());
    $('toggle-past-button').addEventListener('click', (event) => {
        state.showPast = !state.showPast;
        event.currentTarget.setAttribute('aria-pressed', String(state.showPast));
        load();
    });

    renderLegend($('subtitle'), state.active, toggleService);
    initSheet();
    initPullToRefresh(() => load(true));
    load();

    setInterval(() => {
        markNext(state.entries, state.active, state.day);
        updateStamp();
    }, TICK_MS);
    setInterval(() => {
        if (!document.hidden) load(true);
    }, REFRESH_MS);
    window.addEventListener('online', () => load(true));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - state.lastUpdated > REFRESH_MS) load(true);
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch((error) => {
                console.error('Service worker registration failed:', error);
            });
        });
    }
}

init();
