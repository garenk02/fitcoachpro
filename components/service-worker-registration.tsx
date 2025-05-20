'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { useOffline, DataChangeEvent } from './offline-provider';

export function ServiceWorkerRegistration() {
  const { isOnline, syncData } = useOffline();
  const [hasNewVersion, setHasNewVersion] = useState<boolean>(false);
  const [isSyncDebounced, setIsSyncDebounced] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for sync-data events with debounce
    const handleSyncData = () => {
      if (isOnline && !isSyncDebounced) {
        // Check if we've synced recently
        const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
        const now = Date.now();
        const lastSyncTime = lastSyncTimeStr ? parseInt(lastSyncTimeStr, 10) : 0;

        // Only sync if it's been more than 10 seconds since the last sync
        if (now - lastSyncTime > 10 * 1000) {
          // Set debounce flag to prevent multiple syncs
          setIsSyncDebounced(true);

          toast.info(
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Syncing data with server...</span>
            </div>
          );

          // Perform the sync
          syncData().then((changes) => {
            const changeCount = Array.isArray(changes) ? changes.length : 0;
            toast.success(
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span>Data synchronized successfully{changeCount > 0 ? ` (${changeCount} items)` : ''}</span>
              </div>
            );

            // Store the sync time
            localStorage.setItem('lastSyncTime', Date.now().toString());
          }).catch(error => {
            console.error('Sync error:', error);
            toast.error(
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                <span>Failed to sync data. Will retry later.</span>
              </div>
            );
          }).finally(() => {
            // Reset debounce flag after a delay
            setTimeout(() => {
              setIsSyncDebounced(false);
            }, 5000); // 5 second cooldown
          });
        } else {
          console.log('Skipping sync (too soon since last sync)');
        }
      } else if (isSyncDebounced) {
        console.log('Skipping sync (debounced)');
      }
    };

    // Listen for online events
    const handleOnline = () => {
      toast.success(
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>You are back online. Syncing changes...</span>
        </div>
      );

      // Trigger sync when coming back online
      syncData();
    };

    // Listen for offline events
    const handleOffline = () => {
      toast.error(
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Changes will be saved locally.</span>
        </div>
      );
    };

    // Listen for data change events
    const handleDataChange = (event: CustomEvent<DataChangeEvent>) => {
      const { table, operation } = event.detail;

      // Log data changes for debugging
      console.log(`Data change detected: ${operation} in ${table}`);

      // Trigger sync if online
      if (isOnline) {
        syncData();
      }
    };

    // Listen for new version available
    const handleNewVersionAvailable = () => {
      setHasNewVersion(true);

      toast.info(
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4" />
            <span className="font-medium">New version available</span>
          </div>
          <p className="text-sm">Refresh the page to update to the latest version.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-primary text-white rounded-md text-sm self-end"
          >
            Update now
          </button>
        </div>,
        {
          duration: 0, // Don't auto-dismiss
          id: 'new-version',
        }
      );
    };

    // Add event listeners
    window.addEventListener('sync-data', handleSyncData);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('data-changed', handleDataChange as EventListener);
    window.addEventListener('new-version-available', handleNewVersionAvailable);

    // Clean up
    return () => {
      window.removeEventListener('sync-data', handleSyncData);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('data-changed', handleDataChange as EventListener);
      window.removeEventListener('new-version-available', handleNewVersionAvailable);
    };
  }, [isOnline, syncData, setHasNewVersion, isSyncDebounced, setIsSyncDebounced]);

  // Sync on initial load if online
  useEffect(() => {
    if (isOnline && typeof window !== 'undefined') {
      // Delay initial sync to avoid overwhelming the app on startup
      const timer = setTimeout(() => {
        try {
          syncData().catch(error => {
            console.error('Initial sync error:', error);
            // Don't show toast for initial sync errors to avoid overwhelming the user
          });
        } catch (error) {
          console.error('Error during initial sync:', error);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, syncData]);

  // We use hasNewVersion in the event handler, but to satisfy ESLint, we'll also use it here
  if (hasNewVersion) {
    // This is just to use the variable - the actual notification is shown via toast
    console.log('New version is available');
  }

  return null; // This component doesn't render anything
}
