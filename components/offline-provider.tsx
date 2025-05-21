'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { processSyncQueue, preloadAllTablesData, initDB } from '@/lib/offline-storage';
import { useAuth } from './auth-provider';

// Define the data change event type
export type DataChangeEvent = {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  id?: string;
};

type OfflineContextType = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncData: () => Promise<DataChangeEvent[] | void>;
  notifyDataChange: (event: DataChangeEvent) => void;
  subscribeToDataChanges: (
    table: string,
    callback: (event: DataChangeEvent) => void
  ) => () => void;
};

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  syncData: async () => {},
  notifyDataChange: () => {},
  subscribeToDataChanges: () => () => {},
});

export const useOffline = () => useContext(OfflineContext);

export function OfflineProvider({ children }: { children: ReactNode }) {
  // Use a safe default for server-side rendering
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user } = useAuth();

  // Update online status after mount
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Initialize IndexedDB
  useEffect(() => {
    const initializeDB = async () => {
      try {
        console.log('[OfflineProvider] Initializing IndexedDB...');
        await initDB();
        console.log('[OfflineProvider] IndexedDB initialized successfully');
      } catch (error) {
        console.error('[OfflineProvider] Error initializing IndexedDB:', error);
      }
    };

    initializeDB();
  }, []);

  // Use a ref to store listeners to avoid re-renders
  const listenersRef = React.useRef<{
    [table: string]: ((event: DataChangeEvent) => void)[];
  }>({});

  // Debounce flags to prevent duplicate toasts
  const toastDebounceRef = useRef({
    online: false,
    offline: false,
    preload: false,
    sync: false,
    lastToastTime: 0
  });

  // We'll use only the ref for listeners to avoid unnecessary re-renders

  // Notify all listeners of a data change
  const notifyDataChange = useCallback((event: DataChangeEvent) => {
    const { table } = event;

    // Notify table-specific listeners using the ref
    if (listenersRef.current[table]) {
      listenersRef.current[table].forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in data change listener for table ${table}:`, error);
        }
      });
    }

    // Notify global listeners (empty string as table)
    if (listenersRef.current['']) {
      listenersRef.current[''].forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in global data change listener:', error);
        }
      });
    }

    // Dispatch a custom event for service worker communication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data-changed', {
        detail: event
      }));
    }
  }, []);

  // Subscribe to data changes for a specific table
  const subscribeToDataChanges = useCallback(
    (table: string, callback: (event: DataChangeEvent) => void) => {
      // Initialize table listeners array if it doesn't exist
      if (!listenersRef.current[table]) {
        listenersRef.current[table] = [];
      }

      // Add the callback to the listeners if it's not already there
      if (!listenersRef.current[table].includes(callback)) {
        listenersRef.current[table].push(callback);
      }

      // Return unsubscribe function
      return () => {
        if (listenersRef.current[table]) {
          // Remove the callback from listeners
          listenersRef.current[table] = listenersRef.current[table].filter(cb => cb !== callback);
        }
      };
    },
    []
  );

  // Sync data with the server
  const syncData = useCallback(async () => {
    if (!isOnline || !user || isSyncing) {
      return Promise.reject(new Error('Cannot sync: offline, no user, or already syncing'));
    }

    // Prevent multiple sync operations
    if (toastDebounceRef.current.sync) {
      console.log('Skipping sync (already in progress)');
      return Promise.resolve([]);
    }

    toastDebounceRef.current.sync = true;

    try {
      setIsSyncing(true);
      const changes = await processSyncQueue();
      setLastSyncTime(new Date());

      // Notify listeners about synced changes
      if (changes && changes.length > 0) {
        // Group changes by table for efficient refreshing
        const tableChanges = new Set<string>();

        changes.forEach(change => {
          tableChanges.add(change.table);
          notifyDataChange(change);
        });

        // Log sync results
        console.log(`Synced data for tables: ${Array.from(tableChanges).join(', ')}`);
      }

      // Only register for background sync if we have pending changes
      // This prevents an infinite sync loop
      if (changes && changes.length > 0 && 'serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // Check if sync is supported
          if (registration.sync) {
            // Store the last sync time in localStorage to prevent frequent re-syncs
            const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
            const now = Date.now();
            const lastSyncTime = lastSyncTimeStr ? parseInt(lastSyncTimeStr, 10) : 0;

            // Only register sync if it's been more than 5 minutes since the last sync
            if (now - lastSyncTime > 5 * 60 * 1000) {
              await registration.sync.register('sync-data');
              localStorage.setItem('lastSyncTime', now.toString());
              console.log('Background sync registered');
            } else {
              console.log('Skipping background sync registration (too soon)');
            }
          } else {
            console.log('Background sync not supported in this browser');
          }
        } catch (err) {
          console.error('Background sync registration failed:', err);
        }
      }

      return changes;
    } catch (error) {
      console.error('Error syncing data:', error);
      throw error;
    } finally {
      setIsSyncing(false);

      // Reset debounce flag after a delay
      setTimeout(() => {
        toastDebounceRef.current.sync = false;
      }, 5000); // 5 second cooldown
    }
  }, [isOnline, user, isSyncing, notifyDataChange]);

  // Handle online/offline events
  useEffect(() => {
    // Function to check actual connectivity by making a network request
    const checkRealConnectivity = async (): Promise<boolean> => {
      try {
        // Try to fetch a small file to verify actual connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/manifest.json', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        console.log('Connectivity check failed:', error);
        return false;
      }
    };

    // Preload all tables data for offline use
    const preloadOfflineData = async (userId: string) => {
      if (!userId) return;

      // Prevent multiple preload operations and toasts
      if (toastDebounceRef.current.preload) {
        console.log('Skipping preload (already in progress)');
        return;
      }

      // Check if we've shown a preload toast recently (within 10 seconds)
      const now = Date.now();
      if (now - toastDebounceRef.current.lastToastTime < 10000) {
        console.log('Skipping preload toast (shown recently)');
        return;
      }

      toastDebounceRef.current.preload = true;
      toastDebounceRef.current.lastToastTime = now;

      try {
        const results = await preloadAllTablesData(userId);

        // Count total items preloaded
        const totalItems = Object.values(results).reduce((sum, count) =>
          count > 0 ? sum + count : sum, 0);

        // Count tables with errors
        const tablesWithErrors = Object.entries(results)
          .filter(([, count]) => count === -1)
          .map(([table]) => table);

        // Log results instead of showing toasts
        if (totalItems > 0) {
          console.log(`[OfflineProvider] Offline data ready: ${totalItems} items available for offline use`);
        } else if (tablesWithErrors.length > 0) {
          console.log(`[OfflineProvider] Error preparing offline data: Could not prepare some data for offline use`);
        } else {
          console.log(`[OfflineProvider] No offline data available: No data found to prepare for offline use`);
        }
      } catch (error) {
        console.error('Error preloading offline data:', error);
      } finally {
        // Reset debounce flag after a delay
        setTimeout(() => {
          toastDebounceRef.current.preload = false;
        }, 5000); // 5 second cooldown
      }
    };

    const handleOnline = async () => {
      // Prevent multiple online toasts
      if (toastDebounceRef.current.online) {
        console.log('Skipping online handler (already processing)');
        return;
      }

      // Check if we've shown an online toast recently (within 5 seconds)
      const now = Date.now();
      if (now - toastDebounceRef.current.lastToastTime < 5000) {
        console.log('Skipping online toast (shown recently)');
        setIsOnline(true); // Still update the state
        return;
      }

      toastDebounceRef.current.online = true;
      toastDebounceRef.current.lastToastTime = now;

      // First update UI immediately based on navigator.onLine
      setIsOnline(true);

      // Log connection check instead of showing toast
      console.log('[OfflineProvider] Checking connection...');

      // Verify actual connectivity
      const isReallyOnline = await checkRealConnectivity();

      if (isReallyOnline) {
        // Log status instead of showing toast
        console.log('[OfflineProvider] You are back online. Syncing your changes...');

        // Attempt to sync when coming back online
        try {
          await syncData();

          // After syncing, preload data for offline use if we have a user
          if (user?.id) {
            preloadOfflineData(user.id);
          }
        } catch (error) {
          console.error('Error syncing data after coming online:', error);
        }
      } else {
        // We're not really online despite navigator.onLine saying we are
        setIsOnline(false);
        console.log('[OfflineProvider] Still offline. Your device reports being online, but cannot reach the server.');
      }

      // Reset debounce flag after a delay
      setTimeout(() => {
        toastDebounceRef.current.online = false;
      }, 5000); // 5 second cooldown
    };

    const handleOffline = () => {
      // Prevent multiple offline toasts
      if (toastDebounceRef.current.offline) {
        console.log('Skipping offline handler (already processing)');
        return;
      }

      // Check if we've shown an offline toast recently (within 5 seconds)
      const now = Date.now();
      if (now - toastDebounceRef.current.lastToastTime < 5000) {
        console.log('Skipping offline toast (shown recently)');
        setIsOnline(false); // Still update the state
        return;
      }

      toastDebounceRef.current.offline = true;
      toastDebounceRef.current.lastToastTime = now;

      setIsOnline(false);
      console.log('[OfflineProvider] You are offline. Changes will be saved locally and synced when you reconnect.');

      // Reset debounce flag after a delay
      setTimeout(() => {
        toastDebounceRef.current.offline = false;
      }, 5000); // 5 second cooldown
    };

    // Set initial online status
    if (typeof navigator !== 'undefined') {
      // First set based on navigator.onLine
      setIsOnline(navigator.onLine);

      // Then verify with actual request if we appear to be online
      if (navigator.onLine) {
        checkRealConnectivity().then(isReallyOnline => {
          if (isReallyOnline) {
            // If we're really online and have a user, preload data for offline use
            if (user?.id) {
              preloadOfflineData(user.id);
            }
          } else {
            setIsOnline(false);
          }
        });
      }
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic sync attempts when online
    let syncInterval: NodeJS.Timeout | null = null;

    if (isOnline && user) {
      syncInterval = setInterval(() => {
        // Check real connectivity before attempting sync
        checkRealConnectivity().then(isReallyOnline => {
          if (isReallyOnline) {
            syncData().catch(error => {
              console.error('Error in periodic sync:', error);
            });
          } else {
            // Update online status if we're not really online
            setIsOnline(false);
          }
        });
      }, 60000); // Try to sync every minute when online
    }

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [isOnline, user, syncData, /* preloadOfflineData is defined inside the effect */]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncTime,
        syncData,
        notifyDataChange,
        subscribeToDataChanges,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
