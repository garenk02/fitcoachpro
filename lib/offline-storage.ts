'use client';

import { openDB, IDBPDatabase } from 'idb';
import { supabase } from './supabase';
import { toast } from 'sonner';

// Define database name and version
const DB_NAME = 'fitcoachpro-offline';
const DB_VERSION = 1;

// Define table names
export const TABLES = {
  CLIENTS: 'clients',
  SCHEDULES: 'schedules',
  EXERCISES: 'exercises',
  WORKOUTS: 'workouts',
  PROGRESS: 'progress',
  SYNC_QUEUE: 'sync_queue',
};

// Define sync queue item type
export type SyncQueueItem = {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
};

// Initialize IndexedDB
export const initDB = async (): Promise<IDBPDatabase> => {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(TABLES.CLIENTS)) {
          const clientsStore = db.createObjectStore(TABLES.CLIENTS, { keyPath: 'id' });
          clientsStore.createIndex('trainer_id', 'trainer_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(TABLES.SCHEDULES)) {
          const schedulesStore = db.createObjectStore(TABLES.SCHEDULES, { keyPath: 'id' });
          schedulesStore.createIndex('trainer_id', 'trainer_id', { unique: false });
          schedulesStore.createIndex('client_id', 'client_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(TABLES.EXERCISES)) {
          const exercisesStore = db.createObjectStore(TABLES.EXERCISES, { keyPath: 'id' });
          exercisesStore.createIndex('trainer_id', 'trainer_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(TABLES.WORKOUTS)) {
          const workoutsStore = db.createObjectStore(TABLES.WORKOUTS, { keyPath: 'id' });
          workoutsStore.createIndex('trainer_id', 'trainer_id', { unique: false });
          workoutsStore.createIndex('client_id', 'client_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(TABLES.PROGRESS)) {
          const progressStore = db.createObjectStore(TABLES.PROGRESS, { keyPath: 'id' });
          progressStore.createIndex('trainer_id', 'trainer_id', { unique: false });
          progressStore.createIndex('client_id', 'client_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(TABLES.SYNC_QUEUE)) {
          db.createObjectStore(TABLES.SYNC_QUEUE, { keyPath: 'id' });
        }
      },
    });
    return db;
  } catch (error) {
    console.error('Error initializing IndexedDB:', error);
    throw error;
  }
};

// Get all items from a store
export const getAll = async (storeName: string, trainerId?: string): Promise<Record<string, unknown>[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    if (trainerId) {
      const index = store.index('trainer_id');
      return await index.getAll(trainerId);
    }

    return await store.getAll();
  } catch (error) {
    console.error(`Error getting all items from ${storeName}:`, error);
    return [];
  }
};

// Get item by ID
export const getById = async (storeName: string, id: string): Promise<Record<string, unknown> | undefined> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return await store.get(id);
  } catch (error) {
    console.error(`Error getting item from ${storeName}:`, error);
    return undefined;
  }
};

// Add or update item
export const saveItem = async (
  storeName: string,
  item: Record<string, unknown>,
  operation: 'INSERT' | 'UPDATE' = 'INSERT',
  skipQueue = false
): Promise<string> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Generate a temporary ID if not provided (for new items)
    if (!item.id && operation === 'INSERT') {
      item.id = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    await store.put(item);

    // Add to sync queue if online operations should be performed later
    if (!skipQueue) {
      await addToSyncQueue({
        id: `${storeName}_${String(item.id)}_${Date.now()}`,
        table: storeName,
        operation,
        data: item,
        timestamp: Date.now(),
        retries: 0
      });
    }

    return String(item.id);
  } catch (error) {
    console.error(`Error saving item to ${storeName}:`, error);
    throw error;
  }
};

// Delete item
export const deleteItem = async (
  storeName: string,
  id: string,
  skipQueue = false
): Promise<void> => {
  try {
    const db = await initDB();

    // Get the item before deleting (for sync queue)
    let item;
    if (!skipQueue) {
      const tx1 = db.transaction(storeName, 'readonly');
      const store1 = tx1.objectStore(storeName);
      item = await store1.get(id);
    }

    // Delete the item
    const tx2 = db.transaction(storeName, 'readwrite');
    const store2 = tx2.objectStore(storeName);
    await store2.delete(id);

    // Add to sync queue
    if (!skipQueue && item) {
      await addToSyncQueue({
        id: `${storeName}_${id}_${Date.now()}`,
        table: storeName,
        operation: 'DELETE',
        data: item,
        timestamp: Date.now(),
        retries: 0
      });
    }
  } catch (error) {
    console.error(`Error deleting item from ${storeName}:`, error);
    throw error;
  }
};

// Add item to sync queue
export const addToSyncQueue = async (item: SyncQueueItem): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(TABLES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(TABLES.SYNC_QUEUE);
    await store.add(item);
  } catch (error) {
    console.error('Error adding item to sync queue:', error);
  }
};

// Process sync queue
export const processSyncQueue = async (): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(TABLES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(TABLES.SYNC_QUEUE);
    const items = await store.getAll();

    if (items.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        await syncItemWithSupabase(item);
        await removeFromSyncQueue(item.id);
        successCount++;
      } catch (error) {
        console.error('Error syncing item:', error);
        await updateSyncQueueItemRetries(item.id);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Synced ${successCount} items with the server`);
    }

    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} items. Will retry later.`);
    }
  } catch (error) {
    console.error('Error processing sync queue:', error);
  }
};

// Remove item from sync queue
export const removeFromSyncQueue = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(TABLES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(TABLES.SYNC_QUEUE);
    await store.delete(id);
  } catch (error) {
    console.error('Error removing item from sync queue:', error);
  }
};

// Update sync queue item retries
export const updateSyncQueueItemRetries = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(TABLES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(TABLES.SYNC_QUEUE);
    const item = await store.get(id);

    if (item) {
      item.retries += 1;
      await store.put(item);
    }
  } catch (error) {
    console.error('Error updating sync queue item retries:', error);
  }
};

// Sync item with Supabase
export const syncItemWithSupabase = async (item: SyncQueueItem): Promise<void> => {
  const { table, operation, data } = item;

  // Skip if the ID is temporary and operation is not INSERT
  const dataId = String(data.id);
  if (dataId.startsWith('temp_') && operation !== 'INSERT') {
    return;
  }

  switch (operation) {
    case 'INSERT': {
      // For temporary IDs, we need to remove it before inserting to Supabase
      const insertData = { ...data };
      const insertDataId = String(insertData.id);
      if (insertDataId.startsWith('temp_')) {
        delete insertData.id;
      }

      const { data: newData, error } = await supabase
        .from(table)
        .insert([insertData])
        .select();

      if (error) throw error;

      // If we had a temporary ID, update the local record with the new ID
      if (dataId.startsWith('temp_') && newData && newData[0]) {
        await updateLocalItemAfterSync(table, dataId, newData[0]);
      }

      break;
    }
    case 'UPDATE': {
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq('id', dataId);

      if (error) throw error;
      break;
    }
    case 'DELETE': {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', dataId);

      if (error) throw error;
      break;
    }
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

// Update local item after sync (for temporary IDs)
export const updateLocalItemAfterSync = async (
  storeName: string,
  oldId: string,
  newData: Record<string, unknown>
): Promise<void> => {
  try {
    const db = await initDB();

    // Delete the old item
    const tx1 = db.transaction(storeName, 'readwrite');
    const store1 = tx1.objectStore(storeName);
    await store1.delete(oldId);

    // Add the new item
    const tx2 = db.transaction(storeName, 'readwrite');
    const store2 = tx2.objectStore(storeName);
    await store2.add(newData);
  } catch (error) {
    console.error(`Error updating local item after sync in ${storeName}:`, error);
  }
};
