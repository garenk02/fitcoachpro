// Register the service worker
if ('serviceWorker' in navigator) {
  // Load the error handler script first
  const errorHandlerScript = document.createElement('script');
  errorHandlerScript.src = '/workbox-error-handler.js';
  document.head.appendChild(errorHandlerScript);

  // Wait for the error handler script to load
  errorHandlerScript.onload = () => {
    console.log('Service worker error handler loaded');
  };

  // Global error handler for service worker errors
  window.addEventListener('error', (event) => {
    if (event.filename && (
        event.filename.includes('workbox') ||
        event.filename.includes('sw.js') ||
        event.filename.includes('service-worker') ||
        event.filename.includes('custom-sw.js')
      )) {
      console.warn('Handled service worker error:', event);
      event.preventDefault();
      return false;
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Check if this is a service worker related error
    if (event.reason &&
        (event.reason.name === 'NetworkError' ||
         (typeof event.reason.message === 'string' &&
          (event.reason.message.includes('workbox') ||
           event.reason.message.includes('service worker') ||
           event.reason.message.includes('sw.js'))))) {
      console.warn('Handled service worker promise rejection:', event.reason);
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('load', async function() {
    try {
      // Register service workers one at a time to better handle errors
      let mainRegistration, customRegistration;

      try {
        // Register main service worker first
        mainRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Prevent caching issues
        });
        console.log('Main ServiceWorker registration successful with scope:', mainRegistration.scope);
      } catch (mainError) {
        console.error('Main ServiceWorker registration failed:', mainError);
        // Continue with custom service worker registration even if main fails
      }

      try {
        // Then register custom service worker
        customRegistration = await navigator.serviceWorker.register('/custom-sw.js', {
          scope: '/'
        });
        console.log('Custom ServiceWorker registration successful with scope:', customRegistration.scope);
      } catch (customError) {
        console.error('Custom ServiceWorker registration failed:', customError);
        // Continue with the app even if custom service worker fails
      }

      // Check if service workers were registered successfully
      if (!mainRegistration && !customRegistration) {
        console.warn('No service workers were registered successfully');
      }

      // Set up service worker functionality if main registration was successful
      if (mainRegistration) {
        // Check for updates in the main service worker
        mainRegistration.addEventListener('updatefound', () => {
          const newWorker = mainRegistration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed but waiting to activate
              console.log('New service worker available');

              // Dispatch event for the app to show update notification
              window.dispatchEvent(new CustomEvent('new-version-available'));
            }
          });
        });

        // Register for background sync if supported
        if (mainRegistration.sync) {
          // Try to register for background sync
          try {
            // Check if we've registered sync recently
            const lastSyncRegTime = localStorage.getItem('lastSyncRegTime');
            const now = Date.now();
            const lastTime = lastSyncRegTime ? parseInt(lastSyncRegTime, 10) : 0;

            // Only register sync if it's been more than 5 minutes since the last registration
            if (now - lastTime > 5 * 60 * 1000) {
              await mainRegistration.sync.register('sync-data');
              localStorage.setItem('lastSyncRegTime', now.toString());
              console.log('Background sync registered');
            } else {
              console.log('Skipping background sync registration (too soon)');
            }
          } catch (err) {
            console.error('Background sync registration failed:', err);
          }
        } else {
          console.log('Background sync not supported in this browser');
        }
      }

      // Handle controller change (when a new service worker takes over)
      // Use a flag to prevent multiple reloads
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;

        console.log('Service worker controller changed');

        // Check if we're online before reloading
        if (navigator.onLine) {
          console.log('Online and service worker updated, reloading page...');
          window.location.reload();
        } else {
          console.log('Offline, not reloading page despite service worker update');
          // Don't reload when offline to prevent reload loops
        }
      });

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data);

        if (event.data && event.data.type === 'SYNC_DATA') {
          // Trigger data sync
          console.log('Syncing data...');
          window.dispatchEvent(new CustomEvent('sync-data'));
        }

        // Handle data change notifications from other clients via service worker
        if (event.data && event.data.type === 'DATA_CHANGED') {
          const { table, operation, id } = event.data;
          console.log(`Data changed in another tab: ${operation} in ${table}`);

          // Dispatch data-changed event for components to refresh
          window.dispatchEvent(new CustomEvent('data-changed', {
            detail: { table, operation, id }
          }));
        }
      });

      // Listen for data-changed events from the app to notify service worker
      window.addEventListener('data-changed', (event) => {
        // Only forward to service worker if we have an active controller
        if (navigator.serviceWorker.controller) {
          try {
            // Send to service worker to broadcast to other clients/tabs
            navigator.serviceWorker.controller.postMessage({
              type: 'DATA_CHANGED',
              ...event.detail
            });
          } catch (error) {
            console.error('Error sending message to service worker:', error);
          }
        }
      });

      // Periodically check for updates if registrations were successful
      setInterval(() => {
        if (mainRegistration) {
          try {
            mainRegistration.update().catch(err => {
              console.warn('Error updating main service worker:', err);
            });
          } catch (error) {
            console.warn('Error calling update on main service worker:', error);
          }
        }

        if (customRegistration) {
          try {
            customRegistration.update().catch(err => {
              console.warn('Error updating custom service worker:', err);
            });
          } catch (error) {
            console.warn('Error calling update on custom service worker:', error);
          }
        }
      }, 1000 * 60 * 60); // Check every hour

    } catch (error) {
      console.error('ServiceWorker registration failed:', error);

      // Try to recover from the error by unregistering and re-registering
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister().then(() => {
              console.log('Unregistered service worker with scope:', registration.scope);
            });
          }

          // Clear caches to prevent stale data
          if ('caches' in window) {
            caches.keys().then(cacheNames => {
              return Promise.all(
                cacheNames.map(cacheName => {
                  console.log('Deleting cache:', cacheName);
                  return caches.delete(cacheName);
                })
              );
            }).then(() => {
              console.log('All caches cleared, reloading page...');
              // Reload the page after a short delay
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            });
          }
        });
      }
    }
  });
}
