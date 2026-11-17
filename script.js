const stations = {
    "porto_s_bento": {
        "key": "9401008",
        "name": "PORTO S. BENTO"
    },
    "porto_campanha": {
        "key": "9402006",
        "name": "PORTO CAMPANHÃ"
    },
    "trofa": {
        "key": "9404630",
        "name": "TROFA"
    },
    "ermesinde": {
        "key": "9404002",
        "name": "ERMESINDE"
    },
    "vizela": {
        "key": "9428233",
        "name": "VIZELA"
    },
    "braga": {
        "key": "9429157",
        "name": "BRAGA"
    }
}

const services = {
    "IC": {
        "color": "&#128993"
    },
    "IR": {
        "color": "&#128992"
    },
    "ALFA": {
        "color": "&#128309"
    },
    "REGIONAL": {
        "color": "&#128996"
    },
    "URB|SUBUR": {
        "color": "&#128994"
    },
    "INTERNACIONAL": {
        "color": "&#128995"
    },
    "ESPECIAL": {
        "color": "&#128997"
    }
}

// Single source of truth for service hex colors (previously duplicated in
// addSubtitle() and addDataToTable()).
const serviceColors = {
    IC: '#e74c3c',
    IR: '#f39c12',
    ALFA: '#2980b9',
    REGIONAL: '#8e44ad',
    'URB|SUBUR': '#27ae60',
    INTERNACIONAL: '#c1c1c1ff',
    ESPECIAL: '#fed1b3ff'
};

class DataObject {
    constructor(data = []) {
        this.data = data;
    }

    add(tipoServico, dataHoraPartidaChegada, nomeEstacaoOrigem, nomeEstacaoDestino, operador, observacoes, nComboio) {
        this.data.push({
            tipoServico: tipoServico,
            dataHoraPartidaChegada: dataHoraPartidaChegada,
            nomeEstacaoOrigem: nomeEstacaoOrigem,
            nomeEstacaoDestino: nomeEstacaoDestino,
            operador: operador,
            observacoes: observacoes,
            nComboio: nComboio
        });
    }
}

// Set default values
let now = new Date();
document.getElementById('start-date').value = formatDate(now).slice(0, 10);
document.getElementById('where-am-i').value = "porto_s_bento";
let showPast = false;

function loader(show, isPopup = false) {
    if (isPopup) {
        document.getElementById('popup').classList.toggle('loading', show);
    } else {
        document.body.classList.toggle('is-loading', show);
        document.getElementById('fetch-button').disabled = show;
    }
}

function setEmpty(message, retry = false) {
    const empty = document.getElementById('empty');
    empty.textContent = message || '';
    if (message && retry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'retry';
        button.textContent = 'Tentar de novo';
        button.addEventListener('click', () => fetchData());
        empty.append(button);
    }
    empty.hidden = !message;
}

const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

function titleCase(text) {
    return String(text || '').toLowerCase().replace(/\S+/g, (word, offset) =>
        offset > 0 && lowerWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    );
}

function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(date) {
    let year = date.getFullYear();
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hour = ("0" + date.getHours()).slice(-2);
    let minute = ("0" + date.getMinutes()).slice(-2);
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function clearData() {
    let table = document.getElementById('data-table');
    let tbody = table.tBodies[0];
    if (tbody) {
        // Single DOM mutation instead of deleting rows one by one (avoids N reflows).
        tbody.innerHTML = '';
    }
}

const activeServices = new Set();

function addSubtitle() {
    let legend = document.getElementById('subtitle');
    legend.innerHTML = Object.keys(services).map(key =>
        `<button type="button" class="chip" data-svc="${key}" aria-pressed="false" style="--svc: ${serviceColors[key] || '#fff'}">${key}</button>`
    ).join('');
    legend.addEventListener('click', event => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        const key = chip.dataset.svc;
        activeServices.has(key) ? activeServices.delete(key) : activeServices.add(key);
        chip.setAttribute('aria-pressed', activeServices.has(key));
        if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.startViewTransition(applyFilter);
        } else {
            applyFilter();
        }
    });
}

function dataRows() {
    return Array.from(document.getElementById('data-table').tBodies[0].rows).filter(row => !row.classList.contains('hour-row'));
}

// Hides rows of deselected services, and hour headers left without rows.
function applyFilter() {
    const rows = Array.from(document.getElementById('data-table').tBodies[0].rows);
    let header = null, count = 0, any = false;
    const closeGroup = () => { if (header) header.classList.toggle('is-filtered', count === 0); };
    rows.forEach(row => {
        row.classList.remove('first');
        if (row.classList.contains('hour-row')) {
            closeGroup();
            header = row;
            count = 0;
            return;
        }
        const hidden = activeServices.size > 0 && !activeServices.has(row.dataset.svc);
        row.classList.toggle('is-filtered', hidden);
        if (!hidden) { count++; any = true; }
    });
    closeGroup();
    const firstVisible = rows.find(row => !row.classList.contains('is-filtered'));
    if (firstVisible) firstVisible.classList.add('first');
    if (rows.length > 0) setEmpty(any ? '' : 'Sem comboios para este filtro.');
    updateNext();
}

// Highlights the next departure of today with a live countdown.
function updateNext() {
    document.querySelectorAll('#data-table tr.next').forEach(row => {
        row.classList.remove('next');
        row.querySelector('.eta-cell').textContent = '';
    });
    const today = new Date();
    if (document.getElementById('start-date').value !== formatDate(today).slice(0, 10)) return;
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const next = dataRows().find(row => {
        if (row.classList.contains('is-filtered') || row.classList.contains('cancelled')) return false;
        const [h, m] = (row.dataset.eta || row.dataset.time).split(':').map(Number);
        return h * 60 + m >= nowMinutes;
    });
    if (!next) return;
    const [h, m] = (next.dataset.eta || next.dataset.time).split(':').map(Number);
    const diff = h * 60 + m - nowMinutes;
    next.classList.add('next');
    next.querySelector('.eta-cell').textContent = diff === 0 ? 'agora' : diff < 60 ? `em ${diff} min` : `em ${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}`;
}

let lastUpdated = 0;
let fetchSeq = 0;
let stale = false;

function updateStamp() {
    const el = document.getElementById('updated');
    if (!lastUpdated) return;
    const minutes = Math.floor((Date.now() - lastUpdated) / 60000);
    const age = minutes < 1 ? 'agora' : `há ${minutes} min`;
    el.textContent = stale ? `Sem ligação · dados de ${age}` : `Atualizado ${age}`;
    el.classList.toggle('offline', stale);
    el.hidden = false;
}

// silent=true refreshes in the background: no skeleton, no error message,
// and the current list stays until the new data arrives.
function fetchData(silent = false) {
    const seq = ++fetchSeq;
    now = new Date();
    if (!silent) {
        loader(true);
        setEmpty('');
        clearData();
    }

    let startDateInput = document.getElementById('start-date');
    let startDate = startDateInput.value ? new Date(startDateInput.value) : new Date();
    let startTime = startDate.toDateString() == now.toDateString() && !showPast ? now.toTimeString().substring(0, 5) : "00:00";

    let endDate = startDate;
    let endTime = "23:59";

    let startDateTime = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
    let endDateTime = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);

    let whereAmI = document.getElementById('where-am-i').value;
    let stationCode = stations[whereAmI].key;

    let duration = (endDateTime - startDateTime)

    // find out how many time frames we need, knowing that for each 6 hours we will get 1 timeframe
    let timeFrameDuration = 6 * 60 * 60 * 1000;
    let numberOfFrames = Math.ceil((duration / timeFrameDuration));
    let promises = [];
    for (var i = 0; i < numberOfFrames; i++) {
        promises.push(fetchDataForTimeFrame(
            new Date(startDateTime.getTime() + (i * timeFrameDuration)),
            new Date(startDateTime.getTime() + ((i + 1) * timeFrameDuration)),
            stationCode
        ));
    }

    return Promise.all(promises)
        .then(values => {
            if (seq !== fetchSeq) return;
            const dataToShow = [].concat(...values);
            clearData();
            document.getElementById('data-table').tBodies[0].classList.toggle('enter', !silent);
            addDataToTable(startDate, new DataObject(replaceServices(dataToShow)));
            setEmpty(dataToShow.length === 0 ? 'Sem comboios para esta seleção.' : '');
            applyFilter();
            lastUpdated = Date.now();
            stale = false;
            updateStamp();
            loader(false);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            if (seq !== fetchSeq) return;
            if (silent) {
                stale = true;
                updateStamp();
                return;
            }
            // A manual load already cleared the list, so there is nothing stale to keep.
            setEmpty('Não foi possível carregar os comboios. Verifique a ligação.', true);
            document.getElementById('updated').hidden = true;
            lastUpdated = 0;
            loader(false);
        });
}

function replaceServices(dataToShow) {
    for (let i = 0; i < dataToShow.length; i++) {
        dataToShow[i].tipoServico = services[dataToShow[i].tipoServico].color;
    }
    return dataToShow;
}

// Simple sessionStorage cache so toggling UI controls (e.g. "show past") doesn't
// force a redundant network call for data we already fetched moments ago.
const CACHE_TTL_MS = 30 * 1000;

function getCachedResponse(cacheKey) {
    try {
        let raw = sessionStorage.getItem(cacheKey);
        if (!raw) return null;
        let entry = JSON.parse(raw);
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            sessionStorage.removeItem(cacheKey);
            return null;
        }
        return entry.data;
    } catch (e) {
        return null;
    }
}

function setCachedResponse(cacheKey, data) {
    try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: data }));
    } catch (e) {
        // sessionStorage may be unavailable/full; fail silently, caching is just an optimization.
    }
}

function fetchDataForTimeFrame(startDateTime, endDateTime, stationCode) {
    let url = `https://corsproxy.ruben-araujo.workers.dev/corsproxy/?apiurl=https%3A%2F%2Fwww.infraestruturasdeportugal.pt%2Fnegocios-e-servicos%2Fpartidas-chegadas%2F${stationCode}%2F${encodeURIComponent(formatDate(startDateTime))}%2F${encodeURIComponent(formatDate(endDateTime))}%2FINTERNACIONAL%2C%2520ALFA%2C%2520IC%2C%2520IR%2C%2520REGIONAL%2C%2520URB%7CSUBUR%2C%2520ESPECIAL`;

    let cached = getCachedResponse(url);
    if (cached) {
        return Promise.resolve(cached);
    }

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.response.length == 0) {
                setCachedResponse(url, []);
                return [];
            }
            let estacoes = data.response[0].NodesComboioTabelsPartidasChegadas;
            let dataObject = new DataObject();
            for (let i = 0; i < estacoes.length; i++) {
                dataObject.add(
                    estacoes[i].TipoServico,
                    estacoes[i].DataHoraPartidaChegada,
                    estacoes[i].NomeEstacaoOrigem,
                    estacoes[i].NomeEstacaoDestino,
                    estacoes[i].Operador,
                    estacoes[i].Observacoes,
                    estacoes[i].NComboio1
                );
            }
            setCachedResponse(url, dataObject.data);
            return dataObject.data;
        });
}

function toggleShowPast() {
    showPast = !showPast;
    fetchData();
    updateButtonColor();
}

function updateButtonColor() {
    document.getElementById('toggle-past-button').setAttribute('aria-pressed', showPast);
}

// The observation text format isn't documented, so this is defensive:
// an explicit HH:MM wins, else "N min" is added to the scheduled time.
function delayedTime(scheduled, obs) {
    if (!/ATRASAD/i.test(obs)) return null;
    const explicit = obs.match(/(\d{1,2}):(\d{2})/);
    let minutes;
    if (explicit) {
        minutes = Number(explicit[1]) * 60 + Number(explicit[2]);
    } else {
        const delay = obs.match(/(\d+)\s*min/i);
        const base = String(scheduled).match(/^(\d{1,2}):(\d{2})/);
        if (!delay || !base) return null;
        minutes = Number(base[1]) * 60 + Number(base[2]) + Number(delay[1]);
    }
    minutes %= 24 * 60;
    const text = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    return text === scheduled ? null : text;
}

function addDataToTable(startDate, dataObject) {
    let estacoes = dataObject.data;
    let table = document.getElementById('data-table');
    // Build rows in a detached DocumentFragment and attach them in one go,
    // instead of mutating the live table per row (avoids layout thrashing).
    let fragment = document.createDocumentFragment();
    let lastHour = null;
    for (let i = 0; i < estacoes.length; i++) {
        let item = estacoes[i];
        let row = document.createElement('tr');
        // Get the service key from the original data
        let originalServiceKey = Object.keys(services).find(key => item.tipoServico === services[key].color || item.tipoServico === key || item.tipoServico.includes(key));
        row.style.setProperty('--svc', serviceColors[originalServiceKey] || '#fff');
        row.dataset.svc = originalServiceKey || '';
        row.dataset.time = item.dataHoraPartidaChegada;
        let hour = String(item.dataHoraPartidaChegada).slice(0, 2);
        if (hour !== lastHour) {
            lastHour = hour;
            let header = document.createElement('tr');
            header.className = 'hour-row';
            header.innerHTML = `<th scope="rowgroup">${escapeHtml(hour)}h</th>`;
            fragment.appendChild(header);
        }

        let obs = String(item.observacoes || '').trim();
        let obsUpper = obs.toUpperCase();
        let pillClass = obsUpper.includes('SUPRIMIDO') ? ' bad' : obsUpper.includes('ATRASADO') ? ' warn' : '';
        if (pillClass === ' bad') row.classList.add('cancelled');

        let newTime = delayedTime(item.dataHoraPartidaChegada, obs);
        if (newTime) row.dataset.eta = newTime;
        row.style.setProperty('--d', `${Math.min(i, 10) * 30}ms`);

        row.innerHTML =
            `<td class="time-cell">${newTime
                ? `<span class="time-stack"><span class="late">${escapeHtml(newTime)}</span><s class="was">${escapeHtml(item.dataHoraPartidaChegada)}</s></span>`
                : escapeHtml(item.dataHoraPartidaChegada)}</td>` +
            `<td class="to-cell">${escapeHtml(titleCase(item.nomeEstacaoDestino))}</td>` +
            `<td class="from-cell">${escapeHtml(titleCase(item.nomeEstacaoOrigem))}</td>` +
            `<td class="obs-cell">${obs ? `<span class="pill${pillClass}">${escapeHtml(titleCase(obs))}</span>` : ''}</td>` +
            `<td class="eta-cell"></td>`;

        if (showPast) {
            let now = new Date();
            if (startDate < now) {
                let departure = new Date(`${now.toISOString().split('T')[0]}T${item.dataHoraPartidaChegada}`);
                if (now > departure) {
                    row.classList.add('past');
                }
            }
        }
        if (item.nComboio !== undefined) {
            row.classList.add('clickable');
            row.addEventListener('click', function () {
                showPopup(item.nComboio);
            });
        }
        fragment.appendChild(row);
    }
    table.tBodies[0].appendChild(fragment);
}

function parseTrainData(response) {
    const data = response.response;
    return {
        origem: data.Origem,
        destino: data.Destino,
        dataHoraOrigem: data.DataHoraOrigem,
        dataHoraDestino: data.DataHoraDestino,
        duracaoViagem: data.DuracaoViagem,
        operador: data.Operador,
        situacaoComboio: data.SituacaoComboio,
        tipoServico: data.TipoServico,
        nodesPassagem: data.NodesPassagemComboio.map(node => ({
            comboioPassou: node.ComboioPassou,
            horaProgramada: node.HoraProgramada,
            nomeEstacao: node.NomeEstacao,
            observacoes: node.Observacoes
        }))
    };
}

function showPopup(nComboio) {
    const content = document.getElementById('popup-content');
    content.innerHTML = '';
    loader(true, true);
    document.body.classList.add('sheet-open', 'no-scroll');

    fetchDataForTrain(nComboio).then(data => {
        const trip = parseTrainData(data);
        const nodes = trip.nodesPassagem;
        const nextIndex = nodes.findIndex(node => !node.comboioPassou);
        const tags = [trip.tipoServico, trip.operador, trip.situacaoComboio].filter(Boolean)
            .map(tag => `<span class="pill">${escapeHtml(tag === trip.operador ? tag : titleCase(tag))}</span>`).join('');
        const meta = [`${escapeHtml(trip.dataHoraOrigem)} → ${escapeHtml(trip.dataHoraDestino)}`, trip.duracaoViagem && escapeHtml(trip.duracaoViagem)]
            .filter(Boolean).join(' · ');

        content.innerHTML = `
            <div class="trip-head">
                <h2 id="popup-title">${escapeHtml(titleCase(trip.origem))} → ${escapeHtml(titleCase(trip.destino))}</h2>
                <p>${meta}</p>
            </div>
            <div class="trip-tags">${tags}</div>
            <ol class="timeline">
                ${nodes.map((node, index) => `
                    <li class="stop${node.comboioPassou ? ' done' : ''}${index === nextIndex ? ' next' : ''}">
                        <span>${escapeHtml(titleCase(node.nomeEstacao))}</span>
                        <time>${escapeHtml(node.horaProgramada)}</time>
                    </li>`).join('')}
            </ol>
        `;
        loader(false, true);
    }).catch(error => {
        loader(false, true);
        content.innerHTML = `<p class="empty">Não foi possível carregar o percurso.</p>`;
    });
}

function fetchDataForTrain(nComboio) {
    let url = `https://corsproxy.ruben-araujo.workers.dev/corsproxy/?apiurl=https://servicos.infraestruturasdeportugal.pt/negocios-e-servicos/horarios-ncombio/${nComboio}/${new Date().toISOString().split('T')[0]}`;
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
}

function closePopup() {
    document.body.classList.remove('sheet-open', 'no-scroll');
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePopup();
});

addSubtitle();
fetchData();

setInterval(() => {
    updateNext();
    updateStamp();
}, 30 * 1000);

setInterval(() => {
    if (!document.hidden) fetchData(true);
}, 60 * 1000);

window.addEventListener('online', () => fetchData(true));

// Pull-to-refresh: only from the top of the page, with no sheet open.
(function () {
    const ptr = document.getElementById('ptr');
    const THRESHOLD = 72;
    let startY = null, pull = 0, busy = false;

    const set = (distance) => {
        ptr.style.setProperty('--pull', `${distance}px`);
        ptr.style.opacity = Math.min(distance / THRESHOLD, 1);
        ptr.classList.toggle('ready', distance >= THRESHOLD);
    };

    document.addEventListener('touchstart', event => {
        const blocked = busy || window.scrollY > 0 || document.body.classList.contains('sheet-open');
        startY = blocked ? null : event.touches[0].clientY;
        pull = 0;
    }, { passive: true });

    document.addEventListener('touchmove', event => {
        if (startY === null) return;
        const dy = event.touches[0].clientY - startY;
        if (dy <= 0) { set(0); return; }
        pull = Math.min(dy * 0.5, THRESHOLD * 1.4);
        set(pull);
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (startY === null) return;
        startY = null;
        if (pull >= THRESHOLD) {
            busy = true;
            ptr.classList.add('loading');
            set(THRESHOLD * 0.7);
            Promise.all([fetchData(true), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => {
                busy = false;
                ptr.classList.remove('loading');
                set(0);
            });
        } else {
            set(0);
        }
        pull = 0;
    });
})();

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastUpdated > 60 * 1000) fetchData(true);
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(error => {
            console.error('Service worker registration failed:', error);
        });
    });
}