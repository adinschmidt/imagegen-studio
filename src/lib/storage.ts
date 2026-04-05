/* ------------------------------------------------------------------ */
/*  Browser storage: IndexedDB for images, localStorage for settings  */
/* ------------------------------------------------------------------ */

import type { StoredImage, AppSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const DB_NAME = "imagegen-studio";
const DB_VERSION = 2;
const IMAGES_STORE = "images";
const DELETED_STORE = "deleted-images";
const MAX_IMAGES = 20;
const MAX_DELETED = 30;

/* ── IndexedDB helpers ────────────────────────────────────────────── */

let cachedDB: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(DELETED_STORE)) {
        const store = db.createObjectStore(DELETED_STORE, { keyPath: "id" });
        store.createIndex("deletedAt", "deletedAt", { unique: false });
      }
    };

    req.onblocked = () => {
      // Old connection is blocking the upgrade — delete the cached ref
      // so the next call retries. The browser will unblock once old tabs close.
      console.warn("[storage] DB upgrade blocked – close other tabs and refresh");
    };

    req.onsuccess = () => {
      const db = req.result;
      // If another tab bumps the version later, drop the cache so we reconnect.
      db.onversionchange = () => {
        db.close();
        cachedDB = null;
      };
      cachedDB = db;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readonly");
    const store = tx.objectStore(IMAGES_STORE);
    const idx = store.index("createdAt");
    const req = idx.getAll();
    req.onsuccess = () => {
      // newest first
      const all = (req.result as StoredImage[]).reverse();
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(img: StoredImage): Promise<void> {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readwrite");
    const store = tx.objectStore(IMAGES_STORE);
    store.put(img);
    tx.oncomplete = async () => {
      // Trim to MAX_IMAGES
      await trimImages();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveImages(imgs: StoredImage[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readwrite");
    const store = tx.objectStore(IMAGES_STORE);
    for (const img of imgs) {
      store.put(img);
    }
    tx.oncomplete = async () => {
      await trimImages();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDB();
  // Read the image first so we can move it to the deleted store
  const image = await new Promise<StoredImage | undefined>((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readonly");
    const req = tx.objectStore(IMAGES_STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredImage | undefined);
    req.onerror = () => reject(req.error);
  });

  const db2 = await openDB();
  return new Promise((resolve, reject) => {
    const stores = image
      ? [IMAGES_STORE, DELETED_STORE]
      : [IMAGES_STORE];
    const tx = db2.transaction(stores, "readwrite");

    tx.objectStore(IMAGES_STORE).delete(id);

    if (image) {
      tx.objectStore(DELETED_STORE).put({
        ...image,
        deletedAt: Date.now(),
      });
    }

    tx.oncomplete = async () => {
      await trimDeletedImages();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllImages(): Promise<void> {
  // Move all current images to deleted store before clearing
  const all = await getAllImages();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([IMAGES_STORE, DELETED_STORE], "readwrite");
    const deletedStore = tx.objectStore(DELETED_STORE);
    const now = Date.now();
    for (const img of all) {
      deletedStore.put({ ...img, deletedAt: now });
    }
    tx.objectStore(IMAGES_STORE).clear();
    tx.oncomplete = async () => {
      await trimDeletedImages();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Deleted images (recently deleted) ───────────────────────────── */

export interface DeletedImage extends StoredImage {
  deletedAt: number; // epoch ms
}

export async function getDeletedImages(): Promise<DeletedImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DELETED_STORE, "readonly");
    const idx = tx.objectStore(DELETED_STORE).index("deletedAt");
    const req = idx.getAll();
    req.onsuccess = () => {
      // newest deletions first
      const all = (req.result as DeletedImage[]).reverse();
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function restoreImage(id: string): Promise<void> {
  const db = await openDB();
  const deleted = await new Promise<DeletedImage | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(DELETED_STORE, "readonly");
      const req = tx.objectStore(DELETED_STORE).get(id);
      req.onsuccess = () => resolve(req.result as DeletedImage | undefined);
      req.onerror = () => reject(req.error);
    },
  );
  if (!deleted) return;

  // Remove deletedAt before restoring to the images store
  const { deletedAt: _, ...original } = deleted;

  const db2 = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db2.transaction([IMAGES_STORE, DELETED_STORE], "readwrite");
    tx.objectStore(IMAGES_STORE).put(original);
    tx.objectStore(DELETED_STORE).delete(id);
    tx.oncomplete = async () => {
      await trimImages();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function permanentlyDeleteImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DELETED_STORE, "readwrite");
    tx.objectStore(DELETED_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearDeletedImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DELETED_STORE, "readwrite");
    tx.objectStore(DELETED_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function trimDeletedImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DELETED_STORE, "readwrite");
    const store = tx.objectStore(DELETED_STORE);
    const idx = store.index("deletedAt");
    const req = idx.getAll();
    req.onsuccess = () => {
      const all = req.result as DeletedImage[];
      if (all.length > MAX_DELETED) {
        // sorted ascending by deletedAt; drop the oldest
        const toDelete = all.slice(0, all.length - MAX_DELETED);
        for (const img of toDelete) {
          store.delete(img.id);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function trimImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readwrite");
    const store = tx.objectStore(IMAGES_STORE);
    const idx = store.index("createdAt");
    const req = idx.getAll();
    req.onsuccess = () => {
      const all = req.result as StoredImage[];
      if (all.length > MAX_IMAGES) {
        // all is sorted ascending by createdAt; delete oldest
        const toDelete = all.slice(0, all.length - MAX_IMAGES);
        for (const img of toDelete) {
          store.delete(img.id);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Thumbnail generation ─────────────────────────────────────────── */

export function generateThumbnail(
  dataUrl: string,
  maxSize = 256,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.7));
    };
    img.onerror = () => resolve(dataUrl); // fallback to full-res
    img.src = dataUrl;
  });
}

/* ── localStorage settings ────────────────────────────────────────── */

const SETTINGS_KEY = "imagegen-studio-settings";
const HISTORY_KEY = "imagegen-studio-prompt-history";
const MAX_HISTORY = 50;

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadPromptHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePromptHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.slice(0, MAX_HISTORY)),
  );
}

export function addToPromptHistory(prompt: string): string[] {
  const history = loadPromptHistory();
  const filtered = history.filter((h) => h !== prompt);
  const updated = [prompt, ...filtered].slice(0, MAX_HISTORY);
  savePromptHistory(updated);
  return updated;
}
