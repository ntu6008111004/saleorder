const CACHE_NAME = 'aec-sale-order-v1';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './history.html',
  './master-product.html',
  './master-salesperson.html',
  './user-management.html',
  './system-log.html',
  './css/style.css',
  './js/api.js',
  './js/auth.js',
  './js/app.js',
  './image/logo.png',
  './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // For API calls, always go to network
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// Push Notification Event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'แจ้งเตือนระบบ';
  const options = {
    body: data.body || 'มีการอัปเดตใหม่ในระบบ',
    icon: './image/logo.png',
    badge: './image/logo.png',
    data: data.url || './index.html'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
