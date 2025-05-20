'use client';

import { openDB, IDBPDatabase } from 'idb';
import { supabase } from './supabase';
import { DataChangeEvent } from '@/components/offline-provider';

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

    // Verify the store exists
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`[IndexedDB] Store ${storeName} does not exist, initializing it`);
      // The store should have been created in initDB, but just in case
      return [];
    }

    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    let results: Record<string, unknown>[] = [];

    if (trainerId) {
      try {
        // Check if the index exists
        if (store.indexNames.contains('trainer_id')) {
          const index = store.index('trainer_id');
          results = await index.getAll(trainerId);
        } else {
          console.warn(`[IndexedDB] trainer_id index not found for ${storeName}, falling back to filter`);
          const allItems = await store.getAll();
          results = allItems.filter((item: Record<string, unknown>) => item.trainer_id === trainerId);
        }
      } catch (indexError) {
        console.error(`[IndexedDB] Error using trainer_id index for ${storeName}:`, indexError);
        // Fallback to filtering all items if index lookup fails
        const allItems = await store.getAll();
        results = allItems.filter((item: Record<string, unknown>) => item.trainer_id === trainerId);
      }
    } else {
      results = await store.getAll();
    }

    // Log data retrieval for debugging
    // console.log(`[IndexedDB] Retrieved ${results.length} items from ${storeName}${trainerId ? ` for trainer ${trainerId}` : ''}`);

    return results;
  } catch (error) {
    console.error(`[IndexedDB] Error getting all items from ${storeName}:`, error);
    return [];
  }
};

// Define the type for store data
export type StoreData = {
  count: number;
  items: Record<string, unknown>[];
  hasMore: boolean;
};

// Debug function to check what's in IndexedDB
export const debugIndexedDB = async (): Promise<Record<string, StoreData>> => {
  try {
    const db = await initDB();
    const result: Record<string, StoreData> = {};

    // Get counts for all stores
    for (const storeName of Object.values(TABLES)) {
      if (storeName === TABLES.SYNC_QUEUE) continue; // Skip sync queue

      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const count = await store.count();
      const items = await store.getAll();

      result[storeName] = {
        count,
        items: items.slice(0, 5), // Just show first 5 items to avoid huge logs
        hasMore: items.length > 5
      };
    }

    return result;
  } catch (error) {
    console.error('Error debugging IndexedDB:', error);
    // Return an empty object with error info in case of error
    return {
      error: {
        count: 0,
        items: [{ error: String(error) }],
        hasMore: false
      }
    } as unknown as Record<string, StoreData>;
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
    // Validate inputs
    if (!storeName || !item) {
      console.error(`[IndexedDB] Invalid parameters for saveItem: storeName=${storeName}, item=`, item);
      throw new Error('Invalid parameters for saveItem');
    }

    // Make a deep copy to avoid reference issues
    const itemToStore = JSON.parse(JSON.stringify(item));

    // Generate a temporary ID if not provided (for new items)
    if (!itemToStore.id && operation === 'INSERT') {
      itemToStore.id = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Ensure item has all required fields
    if (!itemToStore.created_at) {
      itemToStore.created_at = new Date().toISOString();
    }

    // Ensure trainer_id is present
    if (!itemToStore.trainer_id) {
      // Try to get the user ID from localStorage as a fallback
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          // console.log(`[IndexedDB] Adding missing trainer_id (${userId}) to item for ${storeName}`);
          itemToStore.trainer_id = userId;
        } else {
          console.warn(`[IndexedDB] Item for ${storeName} is missing trainer_id and no userId found in localStorage`);
        }
      } catch (error) {
        console.warn(`[IndexedDB] Item for ${storeName} is missing trainer_id, this may cause retrieval issues:`, error);
      }
    }

    const db = await initDB();

    // Verify the store exists
    if (!db.objectStoreNames.contains(storeName)) {
      console.error(`[IndexedDB] Store ${storeName} does not exist`);
      throw new Error(`Store ${storeName} does not exist`);
    }

    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Store the item
    await store.put(itemToStore);

    // Log for debugging
    // console.log(`[IndexedDB] Saved item to ${storeName}:`, { id: itemToStore.id, operation });

    // Add to sync queue if online operations should be performed later
    if (!skipQueue) {
      await addToSyncQueue({
        id: `${storeName}_${String(itemToStore.id)}_${Date.now()}`,
        table: storeName,
        operation,
        data: itemToStore,
        timestamp: Date.now(),
        retries: 0
      });
    }

    return String(itemToStore.id);
  } catch (error) {
    console.error(`[IndexedDB] Error saving item to ${storeName}:`, error);
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
export const processSyncQueue = async (): Promise<DataChangeEvent[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(TABLES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(TABLES.SYNC_QUEUE);
    const items = await store.getAll();

    if (items.length === 0) return [];

    let successCount = 0;
    let failCount = 0;
    const successfulChanges: DataChangeEvent[] = [];

    for (const item of items) {
      try {
        await syncItemWithSupabase(item);
        await removeFromSyncQueue(item.id);
        successCount++;

        // Add to successful changes list
        successfulChanges.push({
          table: item.table,
          operation: item.operation,
          id: String(item.data.id)
        });
      } catch (error) {
        console.error('Error syncing item:', error);
        await updateSyncQueueItemRetries(item.id);
        failCount++;
      }
    }

    if (successCount > 0) {
      console.log(`[IndexedDB] Synced ${successCount} items with the server`);
    }

    if (failCount > 0) {
      console.log(`[IndexedDB] Failed to sync ${failCount} items. Will retry later.`);
    }

    return successfulChanges;
  } catch (error) {
    console.error('Error processing sync queue:', error);
    return [];
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

// Preload all tables data for offline use
export const preloadAllTablesData = async (userId: string): Promise<Record<string, number>> => {
  if (!userId) {
    console.error('[IndexedDB] Cannot preload data without userId');
    return {};
  }

  const results: Record<string, number> = {};
  const tables = Object.values(TABLES).filter(table => table !== TABLES.SYNC_QUEUE);

  try {
    console.log('[IndexedDB] Starting preload of all tables data for offline use');

    for (const table of tables) {
      try {
        // Fetch data from Supabase
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('trainer_id', userId);

        // Explicitly type the data
        const typedData: Record<string, unknown>[] = data || [];

        if (error) {
          console.error(`[IndexedDB] Error fetching ${table} data for preload:`, error);
          results[table] = -1; // Error indicator
          continue;
        }

        if (typedData.length === 0) {
          console.log(`[IndexedDB] No data found for ${table} during preload`);
          results[table] = 0;
          continue;
        }

        // Define a typed function to handle the mapping
        const saveItemToIndexedDB = (item: Record<string, unknown>): Promise<string> => {
          // Ensure trainer_id is set correctly before saving
          if (!item.trainer_id) {
            // console.log(`[IndexedDB] Adding missing trainer_id (${userId}) to item for ${table}`);
            item.trainer_id = userId;
          }
          return saveItem(table, item, 'UPDATE', true);
        };

        // Store data in IndexedDB
        await Promise.all(
          typedData.map(saveItemToIndexedDB)
        );

        console.log(`[IndexedDB] Preloaded ${typedData.length} items for ${table}`);
        results[table] = typedData.length;
      } catch (tableError) {
        console.error(`[IndexedDB] Error preloading ${table}:`, tableError);
        results[table] = -1; // Error indicator
      }
    }

    console.log('[IndexedDB] Completed preload of all tables data:', results);
    return results;
  } catch (error) {
    console.error('[IndexedDB] Error during preload of all tables:', error);
    return results;
  }
};
