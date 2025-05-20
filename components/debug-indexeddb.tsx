'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { debugIndexedDB, StoreData } from '@/lib/offline-storage';
import { useAuth } from './auth-provider';
import { useOffline } from './offline-provider';

export function DebugIndexedDB() {
  const [dbContent, setDbContent] = useState<Record<string, StoreData> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const { isOnline } = useOffline();

  const checkIndexedDB = async () => {
    setIsLoading(true);
    try {
      const content = await debugIndexedDB();
      setDbContent(content);
      console.log('IndexedDB content:', content);
    } catch (error) {
      console.error('Error checking IndexedDB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check IndexedDB content on mount
    checkIndexedDB();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>IndexedDB Debug</CardTitle>
        <CardDescription>
          Check what data is stored in IndexedDB for offline use
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Button onClick={checkIndexedDB} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh IndexedDB Data'}
          </Button>
          <div className="text-sm text-muted-foreground">
            User ID: {userId || 'Not logged in'} | {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {dbContent ? (
          <Tabs defaultValue="clients">
            <TabsList className="mb-4">
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
              <TabsTrigger value="exercises">Exercises</TabsTrigger>
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="sync_queue">Sync Queue</TabsTrigger>
            </TabsList>

            {Object.entries(dbContent).map(([storeName, storeData]) => (
              <TabsContent key={storeName} value={storeName.toLowerCase()}>
                <div className="rounded-md border p-4">
                  <h3 className="text-lg font-medium mb-2">{storeName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {storeData.count} items stored
                  </p>

                  {storeData.count > 0 ? (
                    <div className="space-y-4">
                      {storeData.items.map((item: Record<string, unknown>, index: number) => (
                        <div key={index} className="rounded-md bg-muted p-3">
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </div>
                      ))}
                      {storeData.hasMore && (
                        <p className="text-sm text-muted-foreground">
                          ... and {storeData.count - storeData.items.length} more items
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items in this store</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {isLoading ? 'Loading IndexedDB data...' : 'No IndexedDB data available'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
