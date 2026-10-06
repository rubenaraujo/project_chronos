// Service worker: caches static app shell assets so repeat visits load
// instantly and the UI still renders while offline. API calls to the
// CORS proxy are intentionally left untouched (always go to the network),
// since train schedule data must stay fresh.
const CACHE_NAME = 'chronos-static-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './train.css',
    './script.js',
    './manifest.json',
    './favicon-16x16.png',
    './favicon-24x24.png',
    './apple-touch-icon.png',
    './android-chrome-128x128.png',
    './android-chrome-256x256.png',
    './website-icons/logo-with-text-no-bg.png',
    './website-icons/logo-with-text-no-bg-24.png',
    './passou-true.png',
    './passou-false.png',
    './passou-last-true.png',
    './passou-last-false.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Only handle same-origin GET requests for the static app shell;
    // let everything else (notably the external train data API) pass through.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                return cached;
            }
            return fetch(event.request).then(response => {
                if (response && response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return response;
            });
        })
    );
});
