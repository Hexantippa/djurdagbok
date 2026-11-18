import {
  AppSettings,
  Category,
  DiaryEvent,
  MediaAsset,
  Pet,
} from '../types/models';
import { generateId } from '../utils/formatters';
import { DataRepositoryBundle } from './types';

const DB_NAME = 'djurdagbok-db-v1';
const DB_VERSION = 1;
const DEVICE_USER_ID_STORAGE_KEY = 'djurdagbok_device_user_id';

const STORES = {
  META: 'meta',
  PETS: 'pets',
  CATEGORIES: 'categories',
  EVENTS: 'events',
  MEDIA: 'media',
  SETTINGS: 'settings',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.PETS)) {
        db.createObjectStore(STORES.PETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        const eventStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventStore.createIndex('by_pet', 'petId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.MEDIA)) {
        const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
        mediaStore.createIndex('by_pet', 'petId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Kunde inte öppna lokal IndexedDB-databas.'));
    };
  });
  return dbPromise;
}

function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Databasfel i IndexedDB.'));
  });
}

function wrapTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Transaktionen i IndexedDB misslyckades.'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaktionen i IndexedDB avbröts.'));
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return wrapRequest<T[]>(store.getAll());
}

async function getByKeyFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return wrapRequest<T | undefined>(store.get(key));
}

async function putIntoStore<T>(storeName: string, value: T): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  await wrapTransaction(tx);
}

async function putManyIntoStore<T>(storeName: string, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const val of values) {
    store.put(val);
  }
  await wrapTransaction(tx);
}

async function replaceAllInStore<T>(storeName: string, values: T[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  for (const val of values) {
    store.put(val);
  }
  await wrapTransaction(tx);
}

async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(key);
  await wrapTransaction(tx);
}

interface MetaRecord {
  key: string;
  value: string | boolean;
}

export function createIndexedDbRepository(): DataRepositoryBundle {
  return {
    meta: {
      async getOrCreateDeviceUserId(): Promise<string> {
        const stored = await getByKeyFromStore<MetaRecord>(STORES.META, 'deviceUserId');
        if (stored && typeof stored.value === 'string' && stored.value.length > 0) {
          try {
            localStorage.setItem(DEVICE_USER_ID_STORAGE_KEY, stored.value);
          } catch {
            // Ignorera om localStorage är begränsad
          }
          return stored.value;
        }
        let localFallback = '';
        try {
          localFallback = localStorage.getItem(DEVICE_USER_ID_STORAGE_KEY) || '';
        } catch {
          localFallback = '';
        }
        const userId = localFallback || generateId();
        await putIntoStore<MetaRecord>(STORES.META, { key: 'deviceUserId', value: userId });
        try {
          localStorage.setItem(DEVICE_USER_ID_STORAGE_KEY, userId);
        } catch {
          // Ignorera
        }
        return userId;
      },

      async setDeviceUserId(userId: string): Promise<void> {
        await putIntoStore<MetaRecord>(STORES.META, { key: 'deviceUserId', value: userId });
        try {
          localStorage.setItem(DEVICE_USER_ID_STORAGE_KEY, userId);
        } catch {
          // Ignorera
        }
      },

      async getFlag(key: string): Promise<boolean> {
        const record = await getByKeyFromStore<MetaRecord>(STORES.META, key);
        return Boolean(record?.value);
      },

      async setFlag(key: string, value: boolean): Promise<void> {
        await putIntoStore<MetaRecord>(STORES.META, { key, value });
      },
    },

    pets: {
      getAll: () => getAllFromStore<Pet>(STORES.PETS),
      getById: (id) => getByKeyFromStore<Pet>(STORES.PETS, id),
      save: (pet) => putIntoStore<Pet>(STORES.PETS, pet),
      replaceAll: (pets) => replaceAllInStore<Pet>(STORES.PETS, pets),
    },

    categories: {
      getAll: () => getAllFromStore<Category>(STORES.CATEGORIES),
      save: (category) => putIntoStore<Category>(STORES.CATEGORIES, category),
      replaceAll: (categories) => replaceAllInStore<Category>(STORES.CATEGORIES, categories),
    },

    events: {
      getAll: () => getAllFromStore<DiaryEvent>(STORES.EVENTS),
      async getByPetId(petId: string): Promise<DiaryEvent[]> {
        const db = await openDatabase();
        const tx = db.transaction(STORES.EVENTS, 'readonly');
        const index = tx.objectStore(STORES.EVENTS).index('by_pet');
        return wrapRequest<DiaryEvent[]>(index.getAll(petId));
      },
      save: (event) => putIntoStore<DiaryEvent>(STORES.EVENTS, event),
      saveMany: (events) => putManyIntoStore<DiaryEvent>(STORES.EVENTS, events),
      replaceAll: (events) => replaceAllInStore<DiaryEvent>(STORES.EVENTS, events),
    },

    media: {
      getAll: () => getAllFromStore<MediaAsset>(STORES.MEDIA),
      getById: (id) => getByKeyFromStore<MediaAsset>(STORES.MEDIA, id),
      save: (asset) => putIntoStore<MediaAsset>(STORES.MEDIA, asset),
      delete: (id) => deleteFromStore(STORES.MEDIA, id),
      replaceAll: (assets) => replaceAllInStore<MediaAsset>(STORES.MEDIA, assets),
    },

    settings: {
      async get(userId: string): Promise<AppSettings> {
        const existing = await getByKeyFromStore<AppSettings>(STORES.SETTINGS, 'app_settings');
        if (existing) return existing;
        const defaults: AppSettings = {
          id: 'app_settings',
          userId,
          theme: 'dark',
          largeText: false,
          highContrast: true,
          hideArchived: true,
          weightChartTitle: 'Viktkurva',
          showWeightTrendline: false,
          updatedAt: new Date().toISOString(),
        };
        await putIntoStore<AppSettings>(STORES.SETTINGS, defaults);
        return defaults;
      },
      save: (settings) => putIntoStore<AppSettings>(STORES.SETTINGS, settings),
    },
  };
}
