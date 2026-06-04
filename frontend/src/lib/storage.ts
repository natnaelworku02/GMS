const DB_NAME = "gms-auth";
const STORE_NAME = "tokens";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const storage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(accessToken, "accessToken");
      tx.objectStore(STORE_NAME).put(refreshToken, "refreshToken");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const accessReq = tx.objectStore(STORE_NAME).get("accessToken");
      const refreshReq = tx.objectStore(STORE_NAME).get("refreshToken");
      tx.oncomplete = () => {
        if (accessReq.result && refreshReq.result) {
          resolve({ accessToken: accessReq.result, refreshToken: refreshReq.result });
        } else {
          resolve(null);
        }
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearTokens(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
