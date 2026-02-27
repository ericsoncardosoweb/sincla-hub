/**
 * Sincla Hub - IndexedDB Storage Service
 * 
 * Adapter de armazenamento baseado em IndexedDB para substituir localStorage.
 * Implementa a interface SupportedStorage do Supabase para ser usado como
 * custom auth storage. Inclui fallback para localStorage se IndexedDB
 * não estiver disponível.
 */

const DB_NAME = 'sincla_hub_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_storage';

let dbInstance: IDBDatabase | null = null;
let dbReady: Promise<IDBDatabase> | null = null;

/**
 * Inicializa e retorna a instância do IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
    if (dbReady) return dbReady;

    dbReady = new Promise<IDBDatabase>((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => {
                dbInstance = request.result;

                // Reconectar se o DB for fechado inesperadamente
                dbInstance.onclose = () => {
                    dbInstance = null;
                    dbReady = null;
                };

                resolve(dbInstance);
            };

            request.onerror = () => {
                console.warn('[StorageService] IndexedDB open failed, falling back to localStorage');
                reject(request.error);
            };
        } catch (err) {
            console.warn('[StorageService] IndexedDB not available, falling back to localStorage');
            reject(err);
        }
    });

    return dbReady;
}

/**
 * Operação genérica no IndexedDB
 */
async function idbOperation<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    const db = await openDB();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Storage adapter compatível com a interface SupportedStorage do Supabase.
 * Usa IndexedDB como armazenamento primário com fallback para localStorage.
 */
export const indexedDBStorage = {
    /**
     * Recupera um valor do IndexedDB
     */
    async getItem(key: string): Promise<string | null> {
        try {
            const value = await idbOperation<string | undefined>(
                'readonly',
                (store) => store.get(key)
            );
            return value ?? null;
        } catch {
            // Fallback para localStorage
            return localStorage.getItem(key);
        }
    },

    /**
     * Armazena um valor no IndexedDB
     */
    async setItem(key: string, value: string): Promise<void> {
        try {
            await idbOperation<IDBValidKey>(
                'readwrite',
                (store) => store.put(value, key)
            );
        } catch {
            // Fallback para localStorage
            localStorage.setItem(key, value);
        }
    },

    /**
     * Remove um valor do IndexedDB
     */
    async removeItem(key: string): Promise<void> {
        try {
            await idbOperation<undefined>(
                'readwrite',
                (store) => store.delete(key)
            );
        } catch {
            // Fallback para localStorage
            localStorage.removeItem(key);
        }
    },
};

/**
 * Migra dados existentes do localStorage para IndexedDB.
 * Chamada uma vez durante a inicialização do app.
 */
export async function migrateFromLocalStorage(): Promise<void> {
    const migrationKey = '__sincla_idb_migrated';

    try {
        // Verifica se já foi migrado
        const alreadyMigrated = await indexedDBStorage.getItem(migrationKey);
        if (alreadyMigrated) return;

        // Migra dados relevantes
        const keysToMigrate = [
            'sincla_current_company',
        ];

        // Migra também qualquer key do Supabase auth
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-')) {
                keysToMigrate.push(key);
            }
        }

        for (const key of keysToMigrate) {
            const value = localStorage.getItem(key);
            if (value) {
                await indexedDBStorage.setItem(key, value);
                localStorage.removeItem(key);
            }
        }

        // Marca como migrado
        await indexedDBStorage.setItem(migrationKey, 'true');
        console.info('[StorageService] Migração localStorage → IndexedDB concluída');
    } catch (err) {
        console.warn('[StorageService] Migração falhou, continuando com localStorage:', err);
    }
}

// Inicializa o DB imediatamente ao importar
openDB().catch(() => {
    console.warn('[StorageService] IndexedDB initialization failed, localStorage will be used');
});
