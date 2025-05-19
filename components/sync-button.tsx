'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useOffline } from './offline-provider';
import { cn } from '@/lib/utils';

interface SyncButtonProps {
  className?: string;
  variant?: 'default' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SyncButton({ 
  className, 
  variant = 'default',
  size = 'default'
}: SyncButtonProps) {
  const { isOnline, isSyncing, syncData } = useOffline();
  const [animating, setAnimating] = useState(false);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setAnimating(true);
    await syncData();
    
    // Keep animation going a bit longer for visual feedback
    setTimeout(() => {
      setAnimating(false);
    }, 500);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleSync}
      disabled={!isOnline || isSyncing}
    >
      <RefreshCw 
        className={cn(
          "h-4 w-4", 
          (isSyncing || animating) && "animate-spin"
        )} 
      />
      <span>Sync</span>
    </Button>
  );
}
