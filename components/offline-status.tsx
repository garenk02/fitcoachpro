'use client';

import { useOffline } from './offline-provider';
// import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { Button } from './ui/button';
import { format } from 'date-fns';
import { ClientOnly } from './client-only';

export function OfflineStatus() {
  // const { isOnline, isSyncing, lastSyncTime, syncData } = useOffline();
  const { isOnline, lastSyncTime } = useOffline();

  // const handleSync = () => {
  //   if (!isOnline || isSyncing) return;
  //   syncData();
  // };

  return (
    <ClientOnly fallback={
      <div className="flex items-center gap-3 text-xs py-1">
        <div className="w-20 h-6 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"></div>
      </div>
    }>
      <div className="flex items-center gap-3 text-xs py-1">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full",
            isOnline
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          )}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>

        {/* {isOnline && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
        )} */}

        {lastSyncTime && (
          <span className="text-muted-foreground whitespace-nowrap">
            Last update: {format(lastSyncTime, 'HH:mm')}
          </span>
        )}
      </div>
    </ClientOnly>
  );
}
