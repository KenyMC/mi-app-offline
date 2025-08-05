// --- SERVICE WORKER (Versión Final y Robusta) ---

const CACHE_NAME = 'mi-app-offline-v3';

// Archivos esenciales para el shell de la aplicación.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json'
];

// 3. Evento 'install': Se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
    console.log('Service Worker v3: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v3 abierto. Guardando App Shell...');
                // Guardamos el App Shell. No incluimos el CDN aquí para mayor flexibilidad.
                return cache.addAll(APP_SHELL_URLS);
            })
            .then(() => {
                console.log('¡App Shell v3 guardado en caché con éxito!');
                return self.skipWaiting(); // Forzar activación inmediata
            })
    );
});

// 4. Evento 'activate': Se dispara cuando el Service Worker se activa.
self.addEventListener('activate', event => {
    console.log('Service Worker v3: Activando...');
    const cacheWhitelist = [CACHE_NAME]; // Lista de cachés que queremos mantener

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Borrando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Tomar control inmediato de los clientes
    );
});

// 5. Evento 'fetch': Estrategia "Network falling back to cache"
self.addEventListener('fetch', event => {
    // Solo nos interesan las peticiones GET
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        // Intentamos obtener el recurso de la red primero
        fetch(event.request)
            .then(networkResponse => {
                // Si tenemos éxito, lo guardamos en el caché para futuras peticiones offline
                return caches.open(CACHE_NAME).then(cache => {
                    // Solo cacheamos respuestas válidas (ej. status 200 OK)
                    if (event.request.url.startsWith('http')) {
                       cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // Si la petición a la red falla (estamos offline), buscamos en el caché
                console.log('Fetch falló. Buscando en caché:', event.request.url);
                return caches.match(event.request)
                    .then(cachedResponse => {
                        // Si encontramos una respuesta en caché, la devolvemos
                        // Si no, la petición falla (lo cual es esperado para recursos no cacheados)
                        return cachedResponse || Promise.reject('resource-not-found');
                    });
            })
    );
});
