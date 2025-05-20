'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useOffline, DataChangeEvent } from '@/components/offline-provider';
import { supabase } from '@/lib/supabase';
import * as offlineStorage from '@/lib/offline-storage';
import { toast } from 'sonner';

type UseOfflineDataOptions = {
  table: string;
  select?: string;
  filterColumn?: string;
  filterValue?: string | null;
  orderColumn?: string;
  orderDirection?: 'asc' | 'desc';
};

export function useOfflineData<T>(options: UseOfflineDataOptions) {
  const { table, select, filterColumn, filterValue, orderColumn, orderDirection = 'asc' } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userId } = useAuth();
  const { isOnline, notifyDataChange, subscribeToDataChanges } = useOffline();

  // Debounce flags to prevent duplicate toasts
  const toastDebounceRef = useRef({
    lastOfflineToastTime: 0
  });

  // Fetch data from Supabase or IndexedDB
  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always try to get data from IndexedDB first for faster initial load
      const offlineData = await offlineStorage.getAll(table, userId);

      // If we have offline data, set it immediately to avoid UI flicker
      if (offlineData && offlineData.length > 0) {
        console.log(`[useOfflineData] Using cached data for ${table} (${offlineData.length} items)`);

        // Apply client-side filtering
        let filteredData = offlineData;
        if (filterColumn && filterValue !== undefined && filterValue !== null && filterColumn !== 'trainer_id') {
          filteredData = offlineData.filter(item =>
            (item as Record<string, unknown>)[filterColumn] === filterValue
          );
        }

        // Apply client-side ordering
        if (orderColumn) {
          filteredData.sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[orderColumn];
            const bValue = (b as Record<string, unknown>)[orderColumn];

            if (aValue === undefined || bValue === undefined) return 0;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return orderDirection === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }

            // Handle numeric values
            const aNum = Number(aValue);
            const bNum = Number(bValue);

            if (!isNaN(aNum) && !isNaN(bNum)) {
              return orderDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            return 0;
          });
        }

        setData(filteredData as T[]);
      }

      // If online, fetch fresh data from Supabase
      if (isOnline) {
        // Fetch from Supabase when online
        let query = supabase.from(table).select(select || '*');

        // Apply filters
        if (filterColumn && filterValue !== undefined && filterValue !== null) {
          query = query.eq(filterColumn, filterValue);
        } else if (filterColumn === 'trainer_id' || !filterColumn) {
          // Always filter by trainer_id if no specific filter is provided
          query = query.eq('trainer_id', userId);
        }

        // Apply ordering
        if (orderColumn) {
          query = query.order(orderColumn, { ascending: orderDirection === 'asc' });
        }

        const { data: onlineData, error: onlineError } = await query;

        if (onlineError) {
          throw onlineError;
        }

        // Store fetched data in IndexedDB for offline use
        if (onlineData) {
          console.log(`[useOfflineData] Storing ${onlineData.length} items from ${table} for offline use`);

          // Always store data in IndexedDB, even if empty (to track that we've checked)
          if (onlineData.length > 0) {
            try {
              // Use Promise.all for better performance
              await Promise.all(
                onlineData.map((item: Record<string, unknown>) =>
                  offlineStorage.saveItem(table, item, 'UPDATE', true)
                )
              );
              console.log(`[useOfflineData] Successfully stored ${onlineData.length} items from ${table} in IndexedDB`);
            } catch (storageError) {
              console.error(`[useOfflineData] Error storing ${table} data in IndexedDB:`, storageError);
            }
          } else {
            // If we got empty data from server, log it
            console.log(`[useOfflineData] No data returned from server for ${table}`);
          }

          // Update state with online data
          setData(onlineData as T[]);
        } else {
          // If we got null/undefined from server and had no offline data
          if (!offlineData || offlineData.length === 0) {
            setData([]);
          }
        }
      } else {
        // We're offline and already set data from IndexedDB above
        // If we didn't have any offline data, show empty state
        if (!offlineData || offlineData.length === 0) {
          console.log(`[useOfflineData] No offline data available for ${table}`);
          setData([]);
        }
        // Data was already set above, no need to set it again
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(`Failed to load ${table}. ${err instanceof Error ? err.message : ''}`);

      // Try to get data from IndexedDB as fallback
      try {
        const offlineData = await offlineStorage.getAll(table, userId);
        setData(offlineData as T[]);
      } catch (offlineErr) {
        console.error(`Error fetching ${table} from IndexedDB:`, offlineErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [table, select, filterColumn, filterValue, orderColumn, orderDirection, userId, isOnline]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    // Only fetch data on the client side
    if (typeof window !== 'undefined') {
      fetchData();
    }
  }, [fetchData]);

  // Subscribe to data changes for this table
  useEffect(() => {
    // Skip subscription during server-side rendering
    if (typeof window === 'undefined') {
      return;
    }

    // Create a stable callback function that won't change on re-renders
    const handleDataChange = (event: DataChangeEvent) => {
      console.log(`Data change detected for ${table}:`, event);
      fetchData();
    };

    // Subscribe to changes for this specific table
    let unsubscribe = () => {};

    // Only subscribe if the necessary function is available
    if (subscribeToDataChanges) {
      try {
        unsubscribe = subscribeToDataChanges(table, handleDataChange);
      } catch (error) {
        console.error(`Error subscribing to data changes for ${table}:`, error);
      }
    }

    // Also listen for global data-changed events from the service worker
    const handleDataChangedEvent = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<DataChangeEvent>;
        if (customEvent.detail && customEvent.detail.table === table) {
          console.log(`Service worker notified data change for ${table}:`, customEvent.detail);
          fetchData();
        }
      } catch (error) {
        console.error('Error handling data-changed event:', error);
      }
    };

    window.addEventListener('data-changed', handleDataChangedEvent);

    // Clean up subscriptions
    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from data changes:', error);
      }
      window.removeEventListener('data-changed', handleDataChangedEvent);
    };
  }, [table, fetchData, subscribeToDataChanges, notifyDataChange]);

  // Create a new item
  const createItem = async (item: Partial<T>): Promise<string | null> => {
    try {
      // Always ensure trainer_id is set correctly
      const itemRecord = item as Record<string, unknown>;
      const itemWithTrainerId = {
        ...item,
        trainer_id: userId,
      } as Record<string, unknown>;

      // Log for debugging
      if (!itemRecord.trainer_id) {
        console.log(`[useOfflineData] Adding trainer_id (${userId}) to new item for ${table}`);
      } else if (itemRecord.trainer_id !== userId) {
        console.log(`[useOfflineData] Correcting trainer_id from ${itemRecord.trainer_id} to ${userId} for ${table}`);
      }

      if (isOnline) {
        // Insert directly to Supabase when online
        const { data: newData, error } = await supabase
          .from(table)
          .insert([itemWithTrainerId])
          .select();

        if (error) throw error;

        if (newData && newData[0]) {
          // Update local state
          setData(prevData => [...prevData, newData[0] as T]);

          // Save to IndexedDB
          await offlineStorage.saveItem(table, newData[0], 'INSERT', true);

          // Notify about data change
          notifyDataChange({
            table,
            operation: 'INSERT',
            id: newData[0].id
          });

          return newData[0].id;
        }
      } else {
        // Save to IndexedDB and sync queue when offline
        const newId = await offlineStorage.saveItem(table, itemWithTrainerId);

        // Update local state with the temporary item
        const newItem = { ...itemWithTrainerId, id: newId } as T;
        setData(prevData => [...prevData, newItem]);

        // Log offline status instead of showing toast
        console.log(`[useOfflineData] Item created while offline. Will be synced when reconnected.`);

        return newId;
      }
    } catch (err) {
      console.error(`Error creating ${table}:`, err);
      toast.error(`Failed to create ${table}`, { duration: 3000 });
      return null;
    }

    return null;
  };

  // Update an existing item
  const updateItem = async (id: string, updates: Partial<T>): Promise<boolean> => {
    try {
      // Ensure trainer_id is set correctly in updates
      const updatesRecord = updates as Record<string, unknown>;
      const updatesWithTrainerId = {
        ...updates,
        trainer_id: userId, // Always set trainer_id correctly
      } as Record<string, unknown>;

      // Log appropriate messages based on the original trainer_id value
      if (!updatesRecord.trainer_id) {
        console.log(`[useOfflineData] Adding trainer_id (${userId}) to update for ${table}`);
      } else if (updatesRecord.trainer_id !== userId) {
        console.log(`[useOfflineData] Correcting trainer_id from ${updatesRecord.trainer_id} to ${userId} for ${table}`);
      }
      if (isOnline) {
        // Update directly in Supabase when online
        const { error } = await supabase
          .from(table)
          .update(updatesWithTrainerId)
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setData(prevData =>
          prevData.map(item =>
            (item as Record<string, unknown>).id === id ? { ...item, ...updatesWithTrainerId } : item
          )
        );

        // Update in IndexedDB
        const existingItem = await offlineStorage.getById(table, id);
        if (existingItem) {
          await offlineStorage.saveItem(table, { ...existingItem, ...updatesWithTrainerId }, 'UPDATE', true);
        }

        // Notify about data change
        notifyDataChange({
          table,
          operation: 'UPDATE',
          id
        });
      } else {
        // Update in IndexedDB and add to sync queue when offline
        const existingItem = await offlineStorage.getById(table, id);
        if (existingItem) {
          await offlineStorage.saveItem(table, { ...existingItem, ...updatesWithTrainerId }, 'UPDATE');

          // Update local state
          setData(prevData =>
            prevData.map(item =>
              (item as Record<string, unknown>).id === id ? { ...item, ...updatesWithTrainerId } : item
            )
          );

          // Log offline status instead of showing toast
          console.log(`[useOfflineData] Item updated while offline. Will be synced when reconnected.`);
        }
      }

      return true;
    } catch (err) {
      console.error(`Error updating ${table}:`, err);
      toast.error(`Failed to update ${table}`, { duration: 3000 });
      return false;
    }
  };

  // Delete an item
  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      if (isOnline) {
        // Delete from Supabase when online
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setData(prevData => prevData.filter(item => (item as Record<string, unknown>).id !== id));

        // Delete from IndexedDB
        await offlineStorage.deleteItem(table, id, true);

        // Notify about data change
        notifyDataChange({
          table,
          operation: 'DELETE',
          id
        });
      } else {
        // Delete from IndexedDB and add to sync queue when offline
        await offlineStorage.deleteItem(table, id);

        // Update local state
        setData(prevData => prevData.filter(item => (item as Record<string, unknown>).id !== id));

        // Log offline status instead of showing toast
        console.log(`[useOfflineData] Item deleted while offline. Will be synced when reconnected.`);
      }

      return true;
    } catch (err) {
      console.error(`Error deleting ${table}:`, err);
      toast.error(`Failed to delete ${table}`, { duration: 3000 });
      return false;
    }
  };

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    createItem,
    updateItem,
    deleteItem,
  };
}
