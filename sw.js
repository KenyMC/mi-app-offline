// --- SERVICE WORKER (v6 - Final Robusta) ---

const CACHE_NAME = 'mi-app-offline-v6-mapas';

// Archivos esenciales para el shell de la aplicación.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json',
    './indexedDB.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://i.imgur.com/K1fE1zX.png', // Icono 192x192
    'https://i.imgur.com/O7bB24v.png'  // Icono 512x512
];

// Evento 'install': Guarda el App Shell.
self.addEventListener('install', event => {
    console.log('Service Worker v6: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v6 abierto. Guardando App Shell...');
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
    console.log('Service Worker v6: Activando...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                    console.log('Borrando caché antiguo:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// Evento 'fetch': Aplica la estrategia de caché correcta según el recurso.
self.addEventListener('fetch', event => {
    // Ignoramos peticiones que no sean GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Estrategia para las teselas del mapa: Stale-While-Revalidate
    if (event.request.url.includes('tile.openstreetmap.org')) {
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
        return; // Termina aquí para las teselas
    }

    // Estrategia para todo lo demás (App Shell): Network falling back to Cache, con fallback a index.html
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                // Si la red falla, busca en el caché
                return caches.match(event.request)
                    .then(cachedResponse => {
                        // Si está en el caché, lo devuelve
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Si no está en caché y es una navegación (actualizar), devuelve la página principal
                        if (event.request.mode === 'navigate') {
                            console.log('Fallback de navegación: devolviendo index.html desde caché');
                            return caches.match('./index.html');
                        }
                        // Si no es nada de lo anterior, la petición falla
                        return null;
                    });
            })
    );
});
