// Service Worker for handling push notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let data = {
    type: 'general',
    title: 'Ride Update',
    body: 'You have a new update',
    icon: '/app-icon.png',
    badge: '/app-badge.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    image: data.image,
    tag: data.type,
    requireInteraction: data.type === 'sos',
    vibrate: data.vibrate || [100],
    data: data.data || { url: '/track' },
    actions: data.type === 'sos' 
      ? [
          { action: 'view', title: 'View Location' },
          { action: 'call', title: 'Call Driver' }
        ]
      : [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'call') {
    // Open phone dialer
    event.waitUntil(
      clients.openWindow('tel:+1234567890')
    );
  } else if (action === 'view' || !action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(data.url) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open a new window
          if (clients.openWindow) {
            return clients.openWindow(data.url || '/track');
          }
        })
    );
  }
  // 'dismiss' action just closes the notification (already done above)
});
