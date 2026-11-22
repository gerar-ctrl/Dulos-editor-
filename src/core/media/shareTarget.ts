// ============================================================================
// shareTarget.ts - Reads and clears media files received via PWA Share Target
// ============================================================================

const SHARE_DB_NAME = 'dulos-share-target-db';
const SHARE_STORE_NAME = 'files';

/**
 * Retrieves any pending media files saved by the Service Worker's
 * Web Share Target handler and clears them from IndexedDB.
 */
export async function consumeSharedMediaFiles(): Promise<File[]> {
  if (typeof indexedDB === 'undefined') return [];

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(SHARE_DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
          db.createObjectStore(SHARE_STORE_NAME, { autoIncrement: true });
        }
      };

      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
          db.close();
          resolve([]);
          return;
        }

        const tx = db.transaction(SHARE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SHARE_STORE_NAME);
        const getAllReq = store.getAll();
        let files: File[] = [];

        getAllReq.onsuccess = () => {
          const result = getAllReq.result;
          if (Array.isArray(result)) {
            files = result.filter((item): item is File => item instanceof File);
          }
          if (files.length > 0) {
            store.clear();
          }
        };

        tx.oncomplete = () => {
          db.close();
          resolve(files);
        };

        tx.onerror = () => {
          db.close();
          resolve([]);
        };
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
