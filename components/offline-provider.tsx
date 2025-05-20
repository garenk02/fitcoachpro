'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { processSyncQueue } from '@/lib/offline-storage';
import { useAuth } from './auth-provider';
import { WifiOff, Wifi } from 'lucide-react';

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

  // Use a ref to store listeners to avoid re-renders
  const listenersRef = React.useRef<{
    [table: string]: ((event: DataChangeEvent) => void)[];
  }>({});

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

    const handleOnline = async () => {
      // First update UI immediately based on navigator.onLine
      setIsOnline(true);

      // Show a temporary toast
      const toastId = toast.loading('Checking connection...', {
        icon: <Wifi className="h-4 w-4 animate-pulse" />,
      });

      // Verify actual connectivity
      const isReallyOnline = await checkRealConnectivity();

      if (isReallyOnline) {
        // Update toast to success
        toast.success('You are back online', {
          id: toastId,
          icon: <Wifi className="h-4 w-4" />,
          description: 'Syncing your changes...',
        });

        // Attempt to sync when coming back online
        try {
          await syncData();
        } catch (error) {
          console.error('Error syncing data after coming online:', error);
        }
      } else {
        // We're not really online despite navigator.onLine saying we are
        setIsOnline(false);
        toast.error('Still offline', {
          id: toastId,
          icon: <WifiOff className="h-4 w-4" />,
          description: 'Your device reports being online, but cannot reach the server.',
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline', {
        icon: <WifiOff className="h-4 w-4" />,
        description: 'Changes will be saved locally and synced when you reconnect.',
      });
    };

    // Set initial online status
    if (typeof navigator !== 'undefined') {
      // First set based on navigator.onLine
      setIsOnline(navigator.onLine);

      // Then verify with actual request if we appear to be online
      if (navigator.onLine) {
        checkRealConnectivity().then(isReallyOnline => {
          if (!isReallyOnline) {
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
  }, [isOnline, user, syncData]);

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
