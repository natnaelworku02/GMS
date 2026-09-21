import { openDB, type IDBPDatabase } from "idb";

interface CachedQuery {
  key: string;
  data: unknown;
  cachedAt: string;
}

const DB_NAME = "gms-offline";
const DB_VERSION = 2;
const STORE_NAME = "queryCache";
const MUTATION_STORE = "mutations";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(MUTATION_STORE)) {
          const store = db.createObjectStore(MUTATION_STORE, { keyPath: "id" });
          store.createIndex("status", "status");
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheQuery(key: string, data: unknown): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, { key, data, cachedAt: new Date().toISOString() });
}

export async function getCachedQuery<T = unknown>(key: string): Promise<CachedQuery | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, key);
}

export async function clearQueryCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
