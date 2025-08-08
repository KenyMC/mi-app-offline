// --- AYUDANTE PARA INDEXEDDB (v2) ---
// Gestiona puntos y conexiones.

let db;
const DB_NAME = 'GeoPuntosDB';
const DB_VERSION = 2; // Incrementar la versión por cambios en la estructura
const STORE_POINTS = 'puntos';
const STORE_CONNECTIONS = 'conexiones';

// Función para inicializar la base de datos
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos', event);
            reject('Error al abrir DB');
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Crea almacén de puntos si no existe
            if (!db.objectStoreNames.contains(STORE_POINTS)) {
                db.createObjectStore(STORE_POINTS, { keyPath: 'id', autoIncrement: true });
            }
            // Crea almacén de conexiones si no existe
            if (!db.objectStoreNames.contains(STORE_CONNECTIONS)) {
                const connectionStore = db.createObjectStore(STORE_CONNECTIONS, { keyPath: 'id', autoIncrement: true });
                // Índice para buscar conexiones por punto de origen
                connectionStore.createIndex('by_origin', 'originId', { unique: false });
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

async function savePoint(point) {
    return new Promise((resolve, reject) => {
        if (!db) reject('La base de datos no está inicializada.');
        const transaction = db.transaction([STORE_POINTS], 'readwrite');
        const store = transaction.objectStore(STORE_POINTS);
        const request = store.add({ ...point, timestamp: new Date().getTime() });

        request.onsuccess = (event) => {
            // Devolvemos el objeto completo, incluyendo el ID asignado
            const savedPoint = { ...point, id: event.target.result };
            resolve(savedPoint);
        };
        request.onerror = (event) => reject('Error al guardar el punto: ' + event.target.error);
    });
}

async function getPoints() {
    return new Promise((resolve, reject) => {
        if (!db) reject('La base de datos no está inicializada.');
        const transaction = db.transaction([STORE_POINTS], 'readonly');
        const store = transaction.objectStore(STORE_POINTS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al obtener los puntos: ' + event.target.error);
    });
}

async function savePointName(id, name) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_POINTS], 'readwrite');
        const store = transaction.objectStore(STORE_POINTS);
        const request = store.get(id);

        request.onsuccess = () => {
            const point = request.result;
            if (point) {
                point.name = name;
                const updateRequest = store.put(point);
                updateRequest.onsuccess = () => resolve(updateRequest.result);
                updateRequest.onerror = (event) => reject('Error al actualizar el punto: ' + event.target.error);
            } else {
                reject('Punto no encontrado');
            }
        };
        request.onerror = (event) => reject('Error al buscar el punto: ' + event.target.error);
    });
}

async function deletePoint(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_POINTS, STORE_CONNECTIONS], 'readwrite');
        const pointsStore = transaction.objectStore(STORE_POINTS);
        const connectionsStore = transaction.objectStore(STORE_CONNECTIONS);
        
        // 1. Eliminar el punto
        const deletePointRequest = pointsStore.delete(id);
        deletePointRequest.onerror = (event) => reject('Error al eliminar punto: ' + event.target.error);

        // 2. Eliminar conexiones asociadas
        const index = connectionsStore.index('by_origin');
        const cursorRequest = index.openCursor(IDBKeyRange.only(id));
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                connectionsStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        // También eliminar si es destino (requiere más lógica o un segundo índice)
        // Por simplicidad, este ejemplo solo borra si es origen.

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject('Error en la transacción de borrado: ' + event.target.error);
    });
}


// --- FUNCIONES PARA CONEXIONES ---

async function saveConnection(connection) {
    return new Promise((resolve, reject) => {
        if (!db) reject('La base de datos no está inicializada.');
        const transaction = db.transaction([STORE_CONNECTIONS], 'readwrite');
        const store = transaction.objectStore(STORE_CONNECTIONS);
        const request = store.add(connection);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al guardar la conexión: ' + event.target.error);
    });
}

async function getConnections() {
    return new Promise((resolve, reject) => {
        if (!db) reject('La base de datos no está inicializada.');
        const transaction = db.transaction([STORE_CONNECTIONS], 'readonly');
        const store = transaction.objectStore(STORE_CONNECTIONS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al obtener las conexiones: ' + event.target.error);
    });
}
