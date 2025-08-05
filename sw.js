// --- SERVICE WORKER (Versión Mejorada) ---
// Este archivo es el corazón de la funcionalidad offline.

// 1. Definimos un nombre y versión para nuestro caché. Al cambiar la versión,
// el Service Worker se actualizará y descargará los archivos de nuevo.
const CACHE_NAME = 'mi-app-offline-v2';

// 2. Listamos los archivos que queremos guardar en el caché.
// Usamos rutas relativas para que funcione en cualquier servidor.
const URLS_TO_CACHE = [
    './', // La ruta raíz relativa (la página principal)
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com'
];

// 3. Evento 'install': Se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
    console.log('Service Worker v2: Instalando...');
    // Esperamos hasta que el caché se abra y todos nuestros archivos se guarden
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v2 abierto. Guardando archivos...');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => {
                console.log('¡Archivos v2 guardados en caché con éxito!');
                // Forzamos al nuevo Service Worker a activarse inmediatamente
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('Falló el guardado en caché v2:', err);
            })
    );
});

// 4. Evento 'activate': Se dispara cuando el Service Worker se activa.
// Es el lugar ideal para limpiar cachés antiguos.
self.addEventListener('activate', event => {
    console.log('Service Worker v2: Activando...');
    const cacheWhitelist = [CACHE_NAME]; // Lista de cachés que queremos mantener

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Si el caché no está en nuestra lista blanca, lo borramos
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Borrando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Le dice al Service Worker que tome el control de la página inmediatamente
            return self.clients.claim();
        })
    );
});

// 5. Evento 'fetch': Se dispara cada vez que la página pide un recurso.
self.addEventListener('fetch', event => {
    // Solo nos interesan las peticiones GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Estrategia "Cache First" con fallback inteligente para navegación
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si la respuesta está en el caché, la devolvemos inmediatamente.
                if (cachedResponse) {
                    console.log('Respondiendo desde caché:', event.request.url);
                    return cachedResponse;
                }

                // Si no está en caché, la pedimos a la red.
                return fetch(event.request).catch(() => {
                    // Si la petición a la red falla (estamos offline),
                    // y es una petición de navegación (el usuario refresca o va a una página),
                    // devolvemos el index.html cacheado como página de fallback.
                    if (event.request.mode === 'navigate') {
                        console.log('Fallback de navegación: devolviendo index.html desde caché');
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
