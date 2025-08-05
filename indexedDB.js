// --- AYUDANTE PARA INDEXEDDB ---
// Simplifica la interacción con la base de datos del navegador.

let db;
const DB_NAME = 'GeoPuntosDB';
const STORE_NAME = 'puntos';

// Función para inicializar la base de datos
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos', event);
            reject('Error al abrir DB');
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Crea el "almacén de objetos" (como una tabla en SQL) si no existe.
            // Usamos 'id' como clave autoincremental.
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos abierta con éxito');
            resolve();
        };
    });
}

// Función para guardar un punto
async function savePoint(point) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('La base de datos no está inicializada.');
            return;
        }
        // Creamos una transacción de "lectura y escritura"
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Agregamos el punto. IndexedDB se encarga del 'id'.
        const request = store.add({ ...point, timestamp: new Date().getTime() });

        request.onsuccess = () => {
            console.log('Punto guardado con éxito', request.result);
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Error al guardar el punto', event);
            reject('Error al guardar el punto');
        };
    });
}

// Función para obtener todos los puntos guardados
async function getPoints() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('La base de datos no está inicializada.');
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        // getAll() obtiene todos los objetos del almacén
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Error al obtener los puntos', event);
            reject('Error al obtener los puntos');
        };
    });
}
