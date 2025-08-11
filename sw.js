// --- SERVICE WORKER (v12 - Arquitectura Robusta y Universal) ---

const CACHE_NAME = 'mi-app-offline-v12-robust';

// Archivos esenciales que componen el "cascarón" de la aplicación.
const APP_SHELL_URLS = [
    './', // Esencial para que la raíz del sitio funcione offline.
    './index.html',
    './manifest.json',
    './indexedDB.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://static.vecteezy.com/system/resources/previews/002/564/296/non_2x/location-pointer-water-drop-nature-liquid-blue-silhouette-style-icon-free-vector.jpg',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.7.5/proj4.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

// Evento 'install': Se dispara cuando el navegador instala el SW.
// Aquí guardamos en caché el cascarón de la aplicación.
self.addEventListener('install', event => {
    console.log(`[SW v12] Instalando...`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(`[SW v12] Guardando en caché el App Shell...`);
                return cache.addAll(APP_SHELL_URLS);
            })
            .then(() => {
                // Forzamos al nuevo Service Worker a activarse inmediatamente.
                // Esto es crucial para que las actualizaciones se apliquen rápido.
                console.log('[SW v12] Instalación completa. Activando inmediatamente...');
                return self.skipWaiting();
            })
    );
});

// Evento 'activate': Se dispara después de la instalación.
// Aquí limpiamos cachés antiguos y tomamos control de la página.
self.addEventListener('activate', event => {
    console.log(`[SW v12] Activando...`);
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Si el caché no está en nuestra "lista blanca", lo borramos.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[SW v12] Borrando caché antiguo: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Le decimos al SW que tome control inmediato de todas las pestañas abiertas.
            // Esto asegura que el SW funcione desde el primer momento.
            console.log('[SW v12] Activado y tomando control de los clientes.');
            return self.clients.claim();
        })
    );
});

// Evento 'fetch': Se dispara cada vez que la página pide un recurso (una imagen, un script, etc.).
// Aquí interceptamos la petición y decidimos si servirla desde el caché o desde la red.
self.addEventListener('fetch', event => {
    // Solo nos interesan las peticiones GET.
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

    // Estrategia para todos los demás recursos (Cache First, then Network)
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si encontramos el recurso en el caché, lo devolvemos inmediatamente.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Si no está en el caché, lo buscamos en la red.
                return fetch(event.request).catch(() => {
                    // Si la petición de red falla (porque no hay conexión)...
                    // Y si es una navegación a una página (como un refresh)...
                    if (event.request.mode === 'navigate') {
                        // ...devolvemos el index.html principal desde el caché.
                        console.log('[SW v12] Fallback de navegación: sirviendo index.html desde caché.');
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
