'use client';

import { useEffect, useState, ReactNode, useRef } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly component to prevent hydration errors
 * Only renders its children on the client-side, after hydration
 * Optionally shows a fallback during server-side rendering
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    // Only set state if we haven't already mounted
    // This prevents unnecessary re-renders
    if (!hasMounted.current) {
      hasMounted.current = true;
      setIsMounted(true);
    }
  }, []);

  // During SSR and initial client render, show fallback
  if (!isMounted) {
    return <>{fallback}</>;
  }

  // After hydration, show actual content
  return <>{children}</>;
}
