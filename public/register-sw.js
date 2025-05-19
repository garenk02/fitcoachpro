// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/offline-sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed but waiting to activate
              console.log('New service worker available');
              
              // Show a notification to the user
              if (window.confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          });
        });
      })
      .catch(function(error) {
        console.error('ServiceWorker registration failed: ', error);
      });
    
    // Handle controller change (when a new service worker takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Controller changed, reloading...');
      window.location.reload();
    });
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from service worker: ', event.data);
      
      if (event.data && event.data.type === 'SYNC_DATA') {
        // Trigger data sync
        console.log('Syncing data...');
        window.dispatchEvent(new CustomEvent('sync-data'));
      }
    });
  });
}
