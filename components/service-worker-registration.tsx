'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useOffline } from './offline-provider';

export function ServiceWorkerRegistration() {
  const { isOnline } = useOffline();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for sync-data events
    const handleSyncData = () => {
      if (isOnline) {
        toast.info(
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Syncing data with server...</span>
          </div>
        );
      }
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

    // Add event listeners
    window.addEventListener('sync-data', handleSyncData);
    window.addEventListener('offline', handleOffline);

    // Clean up
    return () => {
      window.removeEventListener('sync-data', handleSyncData);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return null; // This component doesn't render anything
}
