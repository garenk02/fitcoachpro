// This is a simple service worker for offline support

// Cache names
const CACHE_NAMES = {
  static: 'fitcoachpro-static-v1',
  dynamic: 'fitcoachpro-dynamic-v1',
  pages: 'fitcoachpro-pages-v1'
};

// Network status tracking
let isOnline = true;

// Check if we're online
const checkOnlineStatus = () => {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      // If we timeout, assume we're offline
      isOnline = false;
      resolve(false);
    }, 2000);

    fetch('/manifest.json', { method: 'HEAD' })
      .then(() => {
        clearTimeout(timeout);
        isOnline = true;
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timeout);
        isOnline = false;
        resolve(false);
      });
  });
};

// Files to cache immediately
const urlsToCache = [
  '/',
  '/offline',
  '/dashboard',
  '/dashboard/clients',
  '/dashboard/schedule',
  '/dashboard/exercises',
  '/dashboard/workouts',
  '/settings',
  '/logo.png',
  '/manifest.json'
];

// Install event - cache the app shell
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');

  // Perform install steps
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAMES.static)
        .then((cache) => {
          console.log('[ServiceWorker] Caching static resources');
          return cache.addAll([
            '/logo.png',
            '/manifest.json'
          ]);
        }),

      // Cache pages
      caches.open(CACHE_NAMES.pages)
        .then((cache) => {
          console.log('[ServiceWorker] Caching pages');

          // Make sure the offline page is cached first
          return cache.add('/offline')
            .then(() => {
              // Then cache the rest of the URLs
              const pagesToCache = urlsToCache.filter(url =>
                url !== '/offline' &&
                url !== '/logo.png' &&
                url !== '/manifest.json'
              );
              return cache.addAll(pagesToCache);
            })
            .catch(error => {
              console.error('[ServiceWorker] Error caching offline page:', error);
              // Continue with other URLs even if offline page caching fails
              return cache.addAll(urlsToCache.filter(url =>
                url !== '/offline' &&
                url !== '/logo.png' &&
                url !== '/manifest.json'
              ));
            });
        })
    ])
    .catch(error => {
      console.error('[ServiceWorker] Install error:', error);
    })
  );

  // Activate the service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');

  // Get all the cache names we want to keep
  const currentCaches = Object.values(CACHE_NAMES);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[ServiceWorker] Claiming clients');
      // Check online status
      return checkOnlineStatus();
    })
  );

  // Claim clients so the service worker is in control immediately
  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip logging for common requests to reduce console noise
  if (!event.request.url.includes('chrome-extension') &&
      !event.request.url.includes('favicon.ico')) {
    console.log('[ServiceWorker] Fetch', event.request.url);
  }

  // Skip non-HTTP/HTTPS requests
  const url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // Check if this is an API request
  const isApiRequest = url.includes('/api/');

  // Determine which cache to use based on the request
  let cacheName;
  if (event.request.destination === 'image' ||
      url.endsWith('.png') ||
      url.endsWith('.jpg') ||
      url.endsWith('.svg') ||
      url.endsWith('.ico')) {
    cacheName = CACHE_NAMES.static;
  } else if (event.request.destination === 'document' ||
             event.request.mode === 'navigate') {
    cacheName = CACHE_NAMES.pages;
  } else {
    cacheName = CACHE_NAMES.dynamic;
  }

  try {
    // For navigation requests (HTML pages)
    if (event.request.mode === 'navigate') {
      event.respondWith(
        // Try to get the page from the cache first
        caches.open(CACHE_NAMES.pages)
          .then(cache => cache.match(event.request))
          .then(cachedResponse => {
            // If we have it in cache and we're offline, use the cached version
            if (cachedResponse && !isOnline) {
              return cachedResponse;
            }

            // Otherwise try the network
            return fetch(event.request)
              .then(response => {
                // Cache the navigation request
                if (response.ok) {
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAMES.pages)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                    });
                }
                return response;
              })
              .catch(() => {
                console.log('[ServiceWorker] Fallback to offline page');
                // If we're offline and don't have the page in cache, show the offline page
                return caches.match('/offline')
                  .then(response => {
                    return response || new Response(
                      '<html><body><h1>Offline</h1><p>You are currently offline.</p></body></html>',
                      {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                          'Content-Type': 'text/html'
                        })
                      }
                    );
                  });
              });
          })
      );
      return;
    }

    // For other requests, try the cache first, then the network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Try to fetch from network
          return fetch(event.request.clone())
            .then((response) => {
              // Check if we received a valid response
              if (!response || response.status !== 200) {
                return response;
              }

              // Clone the response because it's a one-time use stream
              const responseToCache = response.clone();

              // Cache the response for future use (in the background)
              if (event.request.method === 'GET') {
                const url = event.request.url;
                if (!isApiRequest &&
                    !url.startsWith('chrome-extension://') &&
                    !url.startsWith('data:') &&
                    (url.startsWith('http://') || url.startsWith('https://'))) {

                  // Don't block the response on caching
                  setTimeout(() => {
                    try {
                      caches.open(cacheName)
                        .then(cache => {
                          try {
                            // Create a valid request object
                            const validRequest = new Request(url, {
                              method: 'GET',
                              headers: event.request.headers,
                              mode: 'cors',
                              credentials: event.request.credentials
                            });

                            cache.put(validRequest, responseToCache);
                            console.log(`[ServiceWorker] Cached ${url} in ${cacheName}`);
                          } catch (error) {
                            console.error('[ServiceWorker] Error in cache.put:', error);
                          }
                        })
                        .catch(error => {
                          console.error('[ServiceWorker] Error opening cache:', error);
                        });
                    } catch (error) {
                      console.error('[ServiceWorker] Error in caching operation:', error);
                    }
                  }, 0);
                }
              }

              return response;
            })
            .catch(error => {
              // This is normal when offline, so only log if it's not a simple network error
              if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
                console.error('[ServiceWorker] Fetch error:', error);
              }

              // Return a fallback response based on the request type
              if (event.request.destination === 'image') {
                return new Response('', {
                  status: 404,
                  statusText: 'Not Found'
                });
              }

              if (event.request.destination === 'script' ||
                  event.request.destination === 'style') {
                // For JS/CSS, try to get from cache
                return caches.match(event.request)
                  .then(cachedResponse => {
                    if (cachedResponse) {
                      return cachedResponse;
                    }
                    // If not in cache, return an empty response
                    return new Response('', {
                      status: 503,
                      statusText: 'Service Unavailable',
                      headers: new Headers({
                        'Content-Type': event.request.destination === 'script' ? 'application/javascript' : 'text/css'
                      })
                    });
                  });
              }

              // For other types of requests
              return new Response('Network error', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
  } catch (error) {
    console.error('[ServiceWorker] Error in fetch handler:', error);
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync', event.tag);

  if (event.tag === 'sync-data') {
    // Notify all clients that they should sync data
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_DATA' });
      });
    });
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
