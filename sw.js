// --- SERVICE WORKER (v9 - Solución Offline Completa) ---

// Se incrementa la versión para forzar la actualización del Service Worker
const CACHE_NAME = 'mi-app-offline-v9-full';

// Archivos esenciales para el shell de la aplicación.
// AHORA INCLUYE TAILWIND CSS PARA QUE LA INTERFAZ CARGUE OFFLINE.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json',
    './indexedDB.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://static.vecteezy.com/system/resources/previews/002/564/296/non_2x/location-pointer-water-drop-nature-liquid-blue-silhouette-style-icon-free-vector.jpg',
    // --- LIBRERÍAS AÑADIDAS AL CACHÉ PARA FUNCIONAR OFFLINE ---
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.7.5/proj4.js',
    'https://cdn.tailwindcss.com', // <-- ¡LA CORRECCIÓN CLAVE!
    // --- Imágenes de Leaflet que también deben estar en caché ---
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

// Evento 'install': Guarda el App Shell y las librerías.
self.addEventListener('install', event => {
    console.log(`Service Worker ${CACHE_NAME}: Instalando...`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(`Cache ${CACHE_NAME} abierto. Guardando App Shell...`);
                return cache.addAll(APP_SHELL_URLS);
            })
            .then(() => self.skipWaiting()) // Activa el nuevo SW inmediatamente
    );
});

// Evento 'activate': Limpia cachés antiguos.
self.addEventListener('activate', event => {
    console.log(`Service Worker ${CACHE_NAME}: Activando...`);
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

// Evento 'fetch': Sirve contenido desde el caché o la red.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    // Estrategia para las teselas del mapa (Stale-While-Revalidate)
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
        return;
    }

    // Estrategia para todo lo demás (App Shell): Cache First, con fallback a la red.
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en caché, lo devuelve.
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Si no, lo busca en la red.
                return fetch(event.request).catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return null;
                });
            })
    );
});
