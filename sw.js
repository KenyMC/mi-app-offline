// --- SERVICE WORKER (v4 - con Cache de Mapas) ---

const CACHE_NAME = 'mi-app-offline-v4-mapas';

// Archivos esenciales para el shell de la aplicación.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json',
    './indexedDB.js', // ¡Importante añadir nuestro nuevo archivo!
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Evento 'install': Guarda el App Shell.
self.addEventListener('install', event => {
    console.log('Service Worker v4: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v4 abierto. Guardando App Shell...');
                // Agregamos también las imágenes de los marcadores de Leaflet
                cache.addAll(APP_SHELL_URLS);
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
    console.log('Service Worker v4: Activando...');
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

// Evento 'fetch': Estrategia "Stale-While-Revalidate" para mapas, y "Cache First" para lo demás.
self.addEventListener('fetch', event => {
    // Si la URL es de una tesela de OpenStreetMap...
    if (event.request.url.includes('tile.openstreetmap.org')) {
        // Usamos una estrategia "Stale-While-Revalidate":
        // 1. Respondemos rápido con el caché si existe.
        // 2. Mientras tanto, pedimos una versión nueva a la red y actualizamos el caché.
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } else {
        // Para todos los demás recursos, usamos "Cache falling back to Network"
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});
