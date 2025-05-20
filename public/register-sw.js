// Register the service worker
if ('serviceWorker' in navigator) {
  // Track registration attempts to prevent repeated registrations
  const SW_REGISTRATION_KEY = 'sw_registration_attempt';
  const MAX_REGISTRATION_ATTEMPTS = 5; // Increased from 3 to 5
  const REGISTRATION_COOLDOWN = 1000 * 60 * 10; // Increased from 5 to 10 minutes

  // Check if we have a registered service worker already
  const checkForExistingServiceWorker = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    } catch (error) {
      console.warn('Error checking for existing service workers:', error);
      return false;
    }
  };

  // Check if we've attempted registration recently
  const lastRegistrationAttempt = localStorage.getItem(SW_REGISTRATION_KEY);
  const registrationAttempts = lastRegistrationAttempt ? JSON.parse(lastRegistrationAttempt) : { count: 0, time: 0 };
  const now = Date.now();

  // Reset attempts if cooldown has passed
  if (now - registrationAttempts.time > REGISTRATION_COOLDOWN) {
    registrationAttempts.count = 0;
  }

  // Only increment count if we're actually going to try registration
  // (we'll update this after the check for existing service worker)
  let shouldRegister = registrationAttempts.count < MAX_REGISTRATION_ATTEMPTS;

  // Check for existing service worker before proceeding
  checkForExistingServiceWorker().then(hasExistingServiceWorker => {
    // If we already have a service worker, don't try to register again
    if (hasExistingServiceWorker) {
      console.log('Service worker already registered, skipping registration');
      // Reset the counter since we don't need to register
      localStorage.setItem(SW_REGISTRATION_KEY, JSON.stringify({ count: 0, time: now }));
      return;
    }

    // No existing service worker, so increment the count
    registrationAttempts.count++;
    registrationAttempts.time = now;
    localStorage.setItem(SW_REGISTRATION_KEY, JSON.stringify(registrationAttempts));

    // Update the flag based on the new count
    shouldRegister = registrationAttempts.count <= MAX_REGISTRATION_ATTEMPTS;

    // Skip registration if we've exceeded max attempts
    if (!shouldRegister) {
      console.warn('Skipping service worker registration (too many recent attempts)');
      // Reset after a longer cooldown
      setTimeout(() => {
        localStorage.setItem(SW_REGISTRATION_KEY, JSON.stringify({ count: 0, time: Date.now() }));
      }, REGISTRATION_COOLDOWN * 2);
    } else {
      // Continue with registration process
      registerServiceWorker();
    }
  }).catch(error => {
    console.error('Error in service worker registration check:', error);
    // If there's an error in the check, try to register anyway
    if (shouldRegister) {
      registerServiceWorker();
    }
  });

  // Function to handle the actual registration process
  const registerServiceWorker = () => {
    // Only proceed with registration if we haven't exceeded max attempts
    if (shouldRegister) {
      // Load the error handler script first with error handling
      try {
        const errorHandlerScript = document.createElement('script');
        errorHandlerScript.src = '/workbox-error-handler.js';

        // Add error handling for the script itself
        errorHandlerScript.onerror = (error) => {
          console.warn('Failed to load service worker error handler:', error);
          // Continue with service worker registration even if error handler fails
        };

        // Wait for the error handler script to load
        errorHandlerScript.onload = () => {
          console.log('Service worker error handler loaded');
        };

        document.head.appendChild(errorHandlerScript);
      } catch (error) {
        console.warn('Error setting up service worker error handler:', error);
        // Continue with service worker registration even if error handler setup fails
      }

      // Global error handler for service worker errors (fallback if error handler script fails)
      window.addEventListener('error', (event) => {
        if (event.filename && (
            event.filename.includes('workbox') ||
            event.filename.includes('sw.js') ||
            event.filename.includes('service-worker') ||
            event.filename.includes('custom-sw.js') ||
            event.filename.includes('vercel/insights')
          )) {
          console.warn('Handled service worker error:', event.message || event.error);
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
               event.reason.message.includes('sw.js') ||
               event.reason.message.includes('vercel/insights'))))) {
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
        // Use a more reasonable update interval and add debouncing
        const SW_UPDATE_KEY = 'sw_last_update_check';
        const UPDATE_INTERVAL = 1000 * 60 * 60 * 6; // Check every 6 hours

        // Check when we last updated
        const lastUpdateCheck = localStorage.getItem(SW_UPDATE_KEY) || '0';
        const lastUpdateTime = parseInt(lastUpdateCheck, 10);
        const updateDue = Date.now() - lastUpdateTime > UPDATE_INTERVAL;

        // Only set up the interval if we're due for an update
        if (updateDue) {
          // Update now
          updateServiceWorkers();
          // Store the update time
          localStorage.setItem(SW_UPDATE_KEY, Date.now().toString());
        }

        // Set up the interval for future updates
        const updateInterval = setInterval(updateServiceWorkers, UPDATE_INTERVAL);

        // Function to update service workers
        function updateServiceWorkers() {
          // Skip update if offline
          if (!navigator.onLine) {
            console.log('Skipping service worker update check (offline)');
            return;
          }

          // Update the timestamp
          localStorage.setItem(SW_UPDATE_KEY, Date.now().toString());

          // Update main service worker
          if (mainRegistration) {
            try {
              mainRegistration.update().catch(err => {
                console.warn('Error updating main service worker:', err);
              });
            } catch (error) {
              console.warn('Error calling update on main service worker:', error);
            }
          }

          // Update custom service worker
          if (customRegistration) {
            try {
              customRegistration.update().catch(err => {
                console.warn('Error updating custom service worker:', err);
              });
            } catch (error) {
              console.warn('Error calling update on custom service worker:', error);
            }
          }
        }

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
    } // End of shouldRegister if block
  }; // End of registerServiceWorker function
}
