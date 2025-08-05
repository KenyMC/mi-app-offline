// --- SERVICE WORKER (v5 - Final Corregida) ---

const CACHE_NAME = 'mi-app-offline-v5-mapas';

// Archivos esenciales para el shell de la aplicación.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json',
    './indexedDB.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Evento 'install': Guarda el App Shell.
self.addEventListener('install', event => {
    console.log('Service Worker v5: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v5 abierto. Guardando App Shell...');
                cache.addAll(APP_SHELL_URLS);
                // Agregamos también las imágenes de los marcadores de Leaflet
                return cache.addAll([
                    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
                ]);
            })
            .then(() => self.skipWaiting())
    );
});

// Evento 'activate': Limpia cachés antiguos.
self.addEventListener('activate', event => {
    console.log('Service Worker v5: Activando...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                    return caches.delete(cacheName);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// Evento 'fetch': Aplica la estrategia de caché correcta según el recurso.
self.addEventListener('fetch', event => {
    // Estrategia para las teselas del mapa: Stale-While-Revalidate
    // Responde rápido desde el caché, pero busca una actualización en segundo plano.
    if (event.request.url.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Devuelve la respuesta del caché si existe, si no, espera a la red.
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } else {
        // Estrategia para todo lo demás (App Shell): Cache First, con fallback a la red.
        // Esto soluciona el problema de la actualización sin conexión.
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Si está en el caché, lo devuelve.
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Si no, lo busca en la red.
                    return fetch(event.request).catch(() => {
                        // Si la red falla (offline) y es una navegación (actualizar página)...
                        if (event.request.mode === 'navigate') {
                            // ...devuelve la página principal desde el caché.
                            return caches.match('./index.html');
                        }
                    });
                })
        );
    }
});
