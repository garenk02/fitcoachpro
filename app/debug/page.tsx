'use client';

import { DebugIndexedDB } from '@/components/debug-indexeddb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOffline } from '@/components/offline-provider';
import { useAuth } from '@/components/auth-provider';
import { preloadAllTablesData } from '@/lib/offline-storage';
import { useState } from 'react';
import { Database } from 'lucide-react';
import { toast } from 'sonner';

export default function DebugPage() {
  const { isOnline, syncData } = useOffline();
  const { userId } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncData();
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePreloadData = async () => {
    if (!userId) {
      toast.error('You must be logged in to preload data');
      return;
    }

    setIsPreloading(true);
    try {
      const preloadToastId = toast.loading('Preparing offline data...', {
        icon: <Database className="h-4 w-4 animate-pulse" />,
      });

      const results = await preloadAllTablesData(userId);

      // Count total items preloaded
      const totalItems = Object.values(results).reduce((sum, count) =>
        count > 0 ? sum + count : sum, 0);

      // Count tables with errors
      const tablesWithErrors = Object.entries(results)
        .filter(([, count]) => count === -1)
        .map(([table]) => table);

      if (totalItems > 0) {
        toast.success('Offline data ready', {
          id: preloadToastId,
          icon: <Database className="h-4 w-4" />,
          description: `${totalItems} items available for offline use`,
        });
      } else if (tablesWithErrors.length > 0) {
        toast.error('Error preparing offline data', {
          id: preloadToastId,
          icon: <Database className="h-4 w-4" />,
          description: `Could not prepare some data for offline use`,
        });
      } else {
        toast.info('No offline data available', {
          id: preloadToastId,
          icon: <Database className="h-4 w-4" />,
          description: 'No data found to prepare for offline use',
        });
      }
    } catch (error) {
      console.error('Error preloading offline data:', error);
      toast.error('Failed to prepare offline data', {
        icon: <Database className="h-4 w-4" />,
        description: 'Please try again later',
      });
    } finally {
      setIsPreloading(false);
    }
  };

  const simulateOffline = () => {
    // @ts-expect-error - Property 'goOffline' does not exist on type 'Navigator'
    if (navigator.connection && navigator.connection.goOffline) {
      // @ts-expect-error - Property 'goOffline' does not exist on type 'Navigator'
      navigator.connection.goOffline();
    } else {
      alert('Cannot simulate offline mode programmatically. Please use browser DevTools Network tab to go offline.');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Debug Tools</h1>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Network Status</CardTitle>
            <CardDescription>Current network status and sync options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSync} disabled={!isOnline || isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Sync Data Now'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePreloadData}
                  disabled={!isOnline || isPreloading || !userId}
                >
                  {isPreloading ? 'Preloading...' : 'Preload Offline Data'}
                </Button>
                <Button variant="secondary" onClick={simulateOffline} disabled={!isOnline}>
                  Simulate Offline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <DebugIndexedDB />
      </div>
    </div>
  );
}
