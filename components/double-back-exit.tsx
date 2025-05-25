'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

/**
 * Component that implements the Android-style double back to exit behavior
 * When a user presses the back button once, it shows a toast notification
 * If they press it again within a short time window, the app will exit
 */
export function DoubleBackExit() {
  const pathname = usePathname();
  const [backPressCount, setBackPressCount] = useState(0);
  const [backPressTimer, setBackPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Time window for double back press (in milliseconds)
  const EXIT_TIMEOUT = 2000; // 2 seconds

  // Function to handle back button press
  const handleBackPress = useCallback(() => {
    // If we're on a "root" page like dashboard, trigger the exit behavior
    // Otherwise, let the normal navigation happen
    const isRootPage = ['/dashboard', '/auth/signin', '/auth/signup', '/'].includes(pathname);

    if (!isRootPage) {
      // If not on a root page, let the normal back navigation happen
      return false;
    }

    if (backPressCount === 0) {
      // First back press
      toast.info('Press back again to exit', {
        duration: EXIT_TIMEOUT,
        position: 'bottom-center',
      });

      // Increment counter
      setBackPressCount(1);

      // Set timer to reset counter after timeout
      const timer = setTimeout(() => {
        setBackPressCount(0);
      }, EXIT_TIMEOUT);

      // Store timer reference for cleanup
      setBackPressTimer(timer);
    } else {
      // Second back press within timeout - exit the app
      if (backPressTimer) {
        clearTimeout(backPressTimer);
        setBackPressTimer(null);
      }

      // Reset counter
      setBackPressCount(0);

      // Exit the app
      window.close();

      // Fallback for browsers that don't support window.close()
      // This will attempt to navigate away from the PWA
      window.location.href = 'about:blank';
    }

    // Prevent default navigation
    return true;
  }, [backPressCount, backPressTimer, pathname, EXIT_TIMEOUT]);

  useEffect(() => {
    // Only add the event listeners if we're in a browser
    if (typeof window === 'undefined') {
      return undefined;
    }

    // Check if the app is running as a PWA in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as { standalone?: boolean }).standalone === true;

    // Check if it's an Android device
    const isAndroid = /Android/i.test(window.navigator.userAgent);

    // Only apply double-back behavior for Android PWAs in standalone mode
    if (!(isStandalone && isAndroid)) {
      return undefined;
    }

    // Handle popstate event (browser back button)
    const handlePopState = () => {
      // Prevent the default navigation
      if (handleBackPress()) {
        // If our handler returns true, prevent the default navigation
        // by pushing a new history state
        window.history.pushState({ preventBack: true }, '', window.location.href);
      }
    };

    // Add a history entry to the stack to ensure we can capture the back button
    // This is a common pattern for handling back button in SPAs
    const setupHistoryTrap = () => {
      // Only add the history entry if we're on a root page
      const isRootPage = ['/dashboard', '/dashboard/settings', '/auth/signin', '/auth/signup', '/'].includes(pathname);

      if (isRootPage) {
        // Add a history entry with a specific state to identify it
        window.history.pushState({ preventBack: true }, '', window.location.href);
      }
    };

    // Set up the history trap when the component mounts
    // or when the pathname changes to a root page
    setupHistoryTrap();

    // Add event listeners
    window.addEventListener('popstate', handlePopState);

    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimer) {
        clearTimeout(backPressTimer);
      }
    };
  }, [backPressCount, backPressTimer, pathname, handleBackPress]);

  // This component doesn't render anything visible
  return null;
}
