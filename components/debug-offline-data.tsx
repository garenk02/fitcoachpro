'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { debugIndexedDB } from '@/lib/offline-storage';
import { useAuth } from './auth-provider';
import { useOffline } from './offline-provider';

export function DebugOfflineData() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const { isOnline } = useOffline();

  const runDebug = async () => {
    setIsLoading(true);
    try {
      const data = await debugIndexedDB();
      setDebugData(data);
    } catch (error) {
      console.error('Error debugging IndexedDB:', error);
      setDebugData({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 max-h-96 overflow-auto bg-background border rounded-md shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Offline Data Debug</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Close</Button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Online Status:</span>
          <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>User ID:</span>
          <span className="truncate max-w-[150px]">{userId || 'Not logged in'}</span>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={runDebug} 
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Check IndexedDB'}
        </Button>
      </div>
      
      {debugData && (
        <div className="mt-4 text-xs">
          <h4 className="font-semibold mb-2">IndexedDB Data:</h4>
          <pre className="bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
