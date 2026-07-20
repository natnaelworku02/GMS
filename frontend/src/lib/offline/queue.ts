import { openDB, type IDBPDatabase } from "idb";

export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: unknown;
  createdAt: string;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
  entityType: string;
  entityId?: string;
}

const DB_NAME = "gms-offline";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function addMutation(mutation: QueuedMutation): Promise<void> {
  const db = await getDb();
  await db.add(STORE_NAME, mutation);
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORE_NAME, "status", "pending");
}

export async function getAllMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function updateMutation(
  id: string,
  updates: Partial<QueuedMutation>,
): Promise<void> {
  const db = await getDb();
  const existing = await db.get(STORE_NAME, id);
  if (existing) {
    await db.put(STORE_NAME, { ...existing, ...updates });
  }
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearMutations(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function getMutationCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}
