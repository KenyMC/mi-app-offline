// --- SERVICE WORKER ---
// Este archivo es el corazón de la funcionalidad offline.

// 1. Definimos un nombre y versión para nuestro caché
const CACHE_NAME = 'mi-app-offline-v1';

// 2. Listamos los archivos que queremos guardar en el caché
// Es importante incluir todos los archivos necesarios para que la app funcione.
const URLS_TO_CACHE = [
    '/', // La ruta raíz de la app
    'index.html', // El archivo HTML principal
    'manifest.json', // El manifiesto de la app
    'https://cdn.tailwindcss.com' // El CSS que usamos desde un CDN
];

// 3. Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    // Esperamos hasta que el caché se abra y todos nuestros archivos se guarden
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto. Guardando archivos...');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => {
                console.log('¡Archivos guardados en caché con éxito!');
                // Forzar al nuevo Service Worker a activarse inmediatamente
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('Falló el guardado en caché:', err);
            })
    );
});

// 4. Evento 'activate': Se dispara cuando el Service Worker se activa.
// Es un buen lugar para limpiar cachés antiguos si hemos creado una nueva versión.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
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

// 5. Evento 'fetch': Se dispara cada vez que la página pide un recurso (un archivo, una imagen, etc.).
self.addEventListener('fetch', event => {
    console.log('Service Worker: Interceptando fetch para', event.request.url);
    
    // Estrategia "Cache First":
    // Primero intentamos responder con el recurso desde el caché.
    // Si no está en el caché, lo pedimos a la red.
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    // ¡Encontrado en el caché! Lo devolvemos.
                    console.log('Respondiendo desde el caché:', event.request.url);
                    return response;
                }
                // No está en el caché, lo pedimos a la red.
                console.log('No está en caché. Pidiendo a la red:', event.request.url);
                return fetch(event.request);
            })
            .catch(error => {
                // Esto puede pasar si tanto el caché como la red fallan.
                console.error('Error en el fetch:', error);
                // Podrías devolver una página de fallback offline aquí.
            })
    );
});
