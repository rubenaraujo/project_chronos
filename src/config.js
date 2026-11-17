export const PROXY = 'https://corsproxy.ruben-araujo.workers.dev/corsproxy/?apiurl=';

export const STATIONS = [
    { id: 'porto_s_bento', code: '9401008', label: 'Porto S. Bento' },
    { id: 'porto_campanha', code: '9402006', label: 'Porto Campanhã' },
    { id: 'trofa', code: '9404630', label: 'Trofa' },
    { id: 'ermesinde', code: '9404002', label: 'Ermesinde' },
    { id: 'vizela', code: '9428233', label: 'Vizela' },
    { id: 'braga', code: '9429157', label: 'Braga' },
];

export const DEFAULT_STATION = 'porto_s_bento';

export const SERVICES = [
    { key: 'IC', color: '#e74c3c' },
    { key: 'IR', color: '#f39c12' },
    { key: 'ALFA', color: '#2980b9' },
    { key: 'REGIONAL', color: '#8e44ad' },
    { key: 'URB|SUBUR', color: '#27ae60' },
    { key: 'INTERNACIONAL', color: '#c1c1c1' },
    { key: 'ESPECIAL', color: '#fed1b3' },
];

export const FALLBACK_COLOR = '#ffffff';
export const FRAME_HOURS = 6;
export const CACHE_TTL_MS = 30 * 1000;
export const REQUEST_TIMEOUT_MS = 15 * 1000;
export const REFRESH_MS = 60 * 1000;
export const TICK_MS = 30 * 1000;
