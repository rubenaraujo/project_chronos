import { PROXY, CACHE_TTL_MS, REQUEST_TIMEOUT_MS } from './config.js';
import { formatDateTime, formatDay } from './time.js';
import { normalize } from './departures.js';

export class ApiError extends Error {}

const SERVICE_LIST =
    'INTERNACIONAL%2C%2520ALFA%2C%2520IC%2C%2520IR%2C%2520REGIONAL%2C%2520URB%7CSUBUR%2C%2520ESPECIAL';
const DEPARTURES =
    'https%3A%2F%2Fwww.infraestruturasdeportugal.pt%2Fnegocios-e-servicos%2Fpartidas-chegadas%2F';
const TRAIN = 'https://servicos.infraestruturasdeportugal.pt/negocios-e-servicos/horarios-ncombio/';

export function departuresUrl(code, from, to) {
    const enc = (date) => encodeURIComponent(formatDateTime(date));
    return `${PROXY}${DEPARTURES}${code}%2F${enc(from)}%2F${enc(to)}%2F${SERVICE_LIST}`;
}

export function trainUrl(train, day) {
    return `${PROXY}${TRAIN}${train}/${day}`;
}

function readCache(key) {
    try {
        const entry = JSON.parse(sessionStorage.getItem(key));
        if (entry && Date.now() - entry.timestamp <= CACHE_TTL_MS) return entry.data;
        sessionStorage.removeItem(key);
    } catch {
        // cache is only an optimisation
    }
    return null;
}

function writeCache(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {
        // storage unavailable or full
    }
}

async function getJson(url, signal) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined = signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : (signal ?? timeout);
    let response;
    try {
        response = await fetch(url, { signal: combined });
    } catch (error) {
        if (signal?.aborted) throw error;
        throw new ApiError('Sem ligação', { cause: error });
    }
    if (!response.ok) throw new ApiError(`HTTP ${response.status}`);
    try {
        return await response.json();
    } catch (error) {
        throw new ApiError('Resposta inválida', { cause: error });
    }
}

export function parseDepartures(json) {
    if (!json || !Array.isArray(json.response)) throw new ApiError('Resposta inesperada');
    const nodes = json.response[0]?.NodesComboioTabelsPartidasChegadas;
    if (nodes === undefined) return [];
    if (!Array.isArray(nodes)) throw new ApiError('Resposta inesperada');
    return nodes.map(normalize);
}

export async function fetchDepartures(code, from, to, signal) {
    const url = departuresUrl(code, from, to);
    const cached = readCache(url);
    if (cached) return cached;
    const items = parseDepartures(await getJson(url, signal));
    writeCache(url, items);
    return items;
}

export function parseTrip(json) {
    const data = json?.response;
    if (!data || !Array.isArray(data.NodesPassagemComboio)) throw new ApiError('Resposta inesperada');
    return {
        origin: data.Origem,
        destination: data.Destino,
        departure: data.DataHoraOrigem,
        arrival: data.DataHoraDestino,
        duration: data.DuracaoViagem,
        operator: data.Operador,
        status: data.SituacaoComboio,
        service: data.TipoServico,
        stops: data.NodesPassagemComboio.map((node) => ({
            passed: Boolean(node.ComboioPassou),
            time: node.HoraProgramada,
            name: node.NomeEstacao,
            obs: node.Observacoes,
        })),
    };
}

export async function fetchTrip(train, signal) {
    return parseTrip(await getJson(trainUrl(train, formatDay(new Date())), signal));
}
