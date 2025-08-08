// --- AYUDANTE PARA INDEXEDDB (v2) ---
// Simplifica la interacción con la base de datos del navegador.
// AHORA INCLUYE SOPORTE PARA CONEXIONES Y EDICIÓN/ELIMINACIÓN DE PUNTOS.

let db;
const DB_NAME = 'GeoPuntosDB';
const PUNTOS_STORE_NAME = 'puntos';
const CONEXIONES_STORE_NAME = 'conexiones';

// Función para inicializar la base de datos
async function initDB() {
    return new Promise((resolve, reject) => {
        // Incrementamos la versión a 2 para disparar onupgradeneeded
        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos', event);
            reject('Error al abrir DB');
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Crea el almacén de puntos si no existe
            if (!db.objectStoreNames.contains(PUNTOS_STORE_NAME)) {
                db.createObjectStore(PUNTOS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            // Crea el almacén de conexiones si no existe
            if (!db.objectStoreNames.contains(CONEXIONES_STORE_NAME)) {
                db.createObjectStore(CONEXIONES_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos abierta con éxito');
            resolve();
        };
    });
}

// --- FUNCIONES PARA PUNTOS ---

// Guardar un nuevo punto
async function savePoint(point) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([PUNTOS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PUNTOS_STORE_NAME);
        const request = store.add({ ...point, name: point.name || '', timestamp: new Date().getTime() });

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al guardar el punto: ' + event.target.errorCode);
    });
}

// Obtener todos los puntos
async function getPoints() {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([PUNTOS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PUNTOS_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al obtener los puntos: ' + event.target.errorCode);
    });
}

// Actualizar un punto (para añadir/cambiar nombre)
async function updatePoint(id, dataToUpdate) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([PUNTOS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PUNTOS_STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const point = getRequest.result;
            if (point) {
                const updatedPoint = { ...point, ...dataToUpdate };
                const putRequest = store.put(updatedPoint);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = (event) => reject('Error al actualizar: ' + event.target.errorCode);
            } else {
                reject('Punto no encontrado');
            }
        };
        getRequest.onerror = (event) => reject('Error al obtener para actualizar: ' + event.target.errorCode);
    });
}

// Eliminar un punto
async function deletePoint(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([PUNTOS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PUNTOS_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject('Error al eliminar el punto: ' + event.target.errorCode);
    });
}


// --- FUNCIONES PARA CONEXIONES ---

// Guardar una nueva conexión
async function saveConnection(connection) {
     return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([CONEXIONES_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONEXIONES_STORE_NAME);
        const request = store.add({ ...connection, timestamp: new Date().getTime() });

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al guardar conexión: ' + event.target.errorCode);
    });
}

// Obtener todas las conexiones
async function getConnections() {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([CONEXIONES_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CONEXIONES_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al obtener conexiones: ' + event.target.errorCode);
    });
}

// Eliminar una conexión
async function deleteConnection(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const transaction = db.transaction([CONEXIONES_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONEXIONES_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject('Error al eliminar conexión: ' + event.target.errorCode);
    });
}
