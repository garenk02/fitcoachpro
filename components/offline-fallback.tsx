'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOffline } from './offline-provider';

interface OfflineFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isLoading?: boolean;
}

export function OfflineFallback({
  title = 'You are offline',
  description = 'This content is not available offline. Please connect to the internet to view it.',
  onRetry,
  isLoading = false
}: OfflineFallbackProps) {
  const { isOnline } = useOffline();

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="text-center text-muted-foreground text-sm">
            {isOnline ? (
              <p>You are now online. Try refreshing the data.</p>
            ) : (
              <p>Connect to the internet to access this content.</p>
            )}
          </div>
          
          {onRetry && (
            <Button 
              variant="secondary" 
              onClick={onRetry}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
