'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useOffline } from '@/components/offline-provider';
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
  const { isOnline } = useOffline();

  // Fetch data from Supabase or IndexedDB
  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Fetch from Supabase when online
        let query = supabase.from(table).select(select || '*');

        // Apply filters
        if (filterColumn && filterValue !== undefined && filterValue !== null) {
          query = query.eq(filterColumn, filterValue);
        } else if (filterColumn === 'trainer_id') {
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
          for (const item of onlineData) {
            await offlineStorage.saveItem(table, item, 'UPDATE', true);
          }
          setData(onlineData as T[]);
        }
      } else {
        // Fetch from IndexedDB when offline
        const offlineData = await offlineStorage.getAll(table, userId);

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

            // Convert to strings for safe comparison
            const aString = String(aValue || '');
            const bString = String(bValue || '');

            if (aString < bString) return orderDirection === 'asc' ? -1 : 1;
            if (aString > bString) return orderDirection === 'asc' ? 1 : -1;
            return 0;
          });
        }

        setData(filteredData as T[]);
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
    fetchData();
  }, [fetchData]);

  // Create a new item
  const createItem = async (item: Partial<T>): Promise<string | null> => {
    try {
      // Add trainer_id if not provided
      const itemWithTrainerId = {
        ...item,
        trainer_id: userId,
      };

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

          return newData[0].id;
        }
      } else {
        // Save to IndexedDB and sync queue when offline
        const newId = await offlineStorage.saveItem(table, itemWithTrainerId);

        // Update local state with the temporary item
        const newItem = { ...itemWithTrainerId, id: newId } as T;
        setData(prevData => [...prevData, newItem]);

        toast.info('You are offline', {
          description: 'This item will be synced when you reconnect.',
        });

        return newId;
      }
    } catch (err) {
      console.error(`Error creating ${table}:`, err);
      toast.error(`Failed to create ${table}`);
      return null;
    }

    return null;
  };

  // Update an existing item
  const updateItem = async (id: string, updates: Partial<T>): Promise<boolean> => {
    try {
      if (isOnline) {
        // Update directly in Supabase when online
        const { error } = await supabase
          .from(table)
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setData(prevData =>
          prevData.map(item =>
            (item as Record<string, unknown>).id === id ? { ...item, ...updates } : item
          )
        );

        // Update in IndexedDB
        const existingItem = await offlineStorage.getById(table, id);
        if (existingItem) {
          await offlineStorage.saveItem(table, { ...existingItem, ...updates }, 'UPDATE', true);
        }
      } else {
        // Update in IndexedDB and add to sync queue when offline
        const existingItem = await offlineStorage.getById(table, id);
        if (existingItem) {
          await offlineStorage.saveItem(table, { ...existingItem, ...updates }, 'UPDATE');

          // Update local state
          setData(prevData =>
            prevData.map(item =>
              (item as Record<string, unknown>).id === id ? { ...item, ...updates } : item
            )
          );

          toast.info('You are offline', {
            description: 'This update will be synced when you reconnect.',
          });
        }
      }

      return true;
    } catch (err) {
      console.error(`Error updating ${table}:`, err);
      toast.error(`Failed to update ${table}`);
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
      } else {
        // Delete from IndexedDB and add to sync queue when offline
        await offlineStorage.deleteItem(table, id);

        // Update local state
        setData(prevData => prevData.filter(item => (item as Record<string, unknown>).id !== id));

        toast.info('You are offline', {
          description: 'This deletion will be synced when you reconnect.',
        });
      }

      return true;
    } catch (err) {
      console.error(`Error deleting ${table}:`, err);
      toast.error(`Failed to delete ${table}`);
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
