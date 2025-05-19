'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { processSyncQueue } from '@/lib/offline-storage';
import { useAuth } from './auth-provider';
import { WifiOff, Wifi } from 'lucide-react';

type OfflineContextType = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncData: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  syncData: async () => {},
});

export const useOffline = () => useContext(OfflineContext);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user } = useAuth();

  // Sync data with the server
  const syncData = useCallback(async () => {
    if (!isOnline || !user || isSyncing) return;

    try {
      setIsSyncing(true);
      await processSyncQueue();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, user, isSyncing]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online', {
        icon: <Wifi className="h-4 w-4" />,
      });
      // Attempt to sync when coming back online
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline', {
        icon: <WifiOff className="h-4 w-4" />,
        description: 'Changes will be saved locally and synced when you reconnect.',
      });
    };

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic sync attempts when online
    let syncInterval: NodeJS.Timeout | null = null;

    if (isOnline && user) {
      syncInterval = setInterval(() => {
        syncData();
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
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
