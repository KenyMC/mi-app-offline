// --- SERVICE WORKER (v7 - Final con Mapa Satelital) ---

const CACHE_NAME = 'mi-app-offline-v7-satelital';

// Archivos esenciales para el shell de la aplicación.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json',
    './indexedDB.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://static.vecteezy.com/system/resources/previews/002/564/296/non_2x/location-pointer-water-drop-nature-liquid-blue-silhouette-style-icon-free-vector.jpg'
];

// Evento 'install': Guarda el App Shell.
self.addEventListener('install', event => {
    console.log('Service Worker v7: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v7 abierto. Guardando App Shell...');
                // Cacheamos los íconos por defecto y el rojo para la selección
                return Promise.all([
                    cache.addAll(APP_SHELL_URLS),
                    cache.addAll([
                        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-red.png'
                    ])
                ]);
            })
            .then(() => self.skipWaiting())
    );
});

// Evento 'activate': Limpia cachés antiguos.
self.addEventListener('activate', event => {
    console.log('Service Worker v7: Activando...');
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

// Evento 'fetch': Lógica de caché robusta.
self.addEventListener('fetch', event => {
    // Ignoramos peticiones que no sean GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Estrategia para las teselas del mapa satelital (Stale-While-Revalidate)
    if (event.request.url.includes('server.arcgisonline.com')) {
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

    // Estrategia para todo lo demás (App Shell): Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en caché, lo devuelve.
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si no está en caché, lo busca en la red.
                return fetch(event.request).catch(() => {
                    // Si la red falla y es una petición de navegación (actualizar)...
                    if (event.request.mode === 'navigate') {
                        // ...devuelve la página principal desde el caché.
                        return caches.match('./index.html');
                    }
                    return null;
                });
            })
    );
});
