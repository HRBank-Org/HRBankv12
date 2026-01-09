/* eslint-disable no-restricted-globals */

// Service Worker for HR Bank PWA - Enhanced Version
const CACHE_NAME = 'hrbank-v2';
const DYNAMIC_CACHE = 'hrbank-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/workforce/dashboard',
  '/manifest-workforce.json',
  '/icons/icon-workforce-192x192.png',
  '/icons/icon-workforce-512x512.png',
  '/favicon.ico'
];

// API routes to cache for offline access
const API_CACHE_ROUTES = [
  '/api/workforce/me/profile',
  '/api/workforce/me/dashboard',
  '/api/jobs/public'
];

// Install service worker and cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy: Network first, then cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== location.origin) return;

  // API requests: Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok && API_CACHE_ROUTES.some(route => url.pathname.includes(route))) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if offline
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets: Cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = { title: 'HR Bank', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-workforce-192x192.png',
    badge: '/icons/icon-workforce-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/workforce/dashboard',
      dateOfArrival: Date.now()
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'hrbank-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/workforce/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('hrbank') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  try {
    const db = await openIndexedDB();
    const pendingAttendance = await getPendingAttendance(db);
    
    for (const record of pendingAttendance) {
      await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      await removeFromPending(db, record.id);
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Helper: Open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hrbank-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-attendance')) {
        db.createObjectStore('pending-attendance', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Helper: Get pending attendance records
function getPendingAttendance(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pending-attendance', 'readonly');
    const store = transaction.objectStore('pending-attendance');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Helper: Remove synced record
function removeFromPending(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pending-attendance', 'readwrite');
    const store = transaction.objectStore('pending-attendance');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('[SW] Service worker loaded');
