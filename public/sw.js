// Service Worker for handling push notifications
// Supports graceful degradation architecture:
// - Android/Desktop: Full push notification support
// - iOS: No push support in browser (handled by polling in app)

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications from backend
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  // Default notification data
  let data = {
    type: 'general',
    title: 'Ride Update',
    body: 'You have a new update',
    icon: '/app-icon.png',
    badge: '/app-badge.png',
    data: { url: '/track' }
  };

  // Parse push payload
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
      // Try as text
      try {
        data.body = event.data.text();
      } catch (e2) {
        console.error('Error reading push data as text:', e2);
      }
    }
  }

  // Build notification options based on type
  const options = buildNotificationOptions(data);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Build notification options based on notification type
 */
function buildNotificationOptions(data) {
  const baseOptions = {
    body: data.body,
    icon: data.icon || '/app-icon.png',
    badge: data.badge || '/app-badge.png',
    tag: data.tag || data.type || 'general',
    data: data.data || { url: '/track' },
    timestamp: Date.now(),
  };

  // Customize based on notification type
  switch (data.type) {
    case 'arrived_safely':
      return {
        ...baseOptions,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          { action: 'view', title: 'View Details' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
      };

    case 'sos':
      return {
        ...baseOptions,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500, 200, 500],
        actions: [
          { action: 'call', title: 'Call Now' },
          { action: 'view', title: 'View Location' }
        ],
      };

    case 'route_change':
    case 'route-deviation':
      return {
        ...baseOptions,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'view', title: 'View Route' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
      };

    case 'delay':
      return {
        ...baseOptions,
        requireInteraction: false,
        vibrate: [100, 50, 100],
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'OK' }
        ],
      };

    case 'test':
      return {
        ...baseOptions,
        requireInteraction: false,
        vibrate: [100],
        actions: [
          { action: 'dismiss', title: 'OK' }
        ],
      };

    default:
      return {
        ...baseOptions,
        requireInteraction: false,
        vibrate: data.vibrate || [100],
        actions: data.actions || [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
      };
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action, event.notification.data);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Handle different actions
  if (action === 'call' && data.phone) {
    // Open phone dialer
    event.waitUntil(
      clients.openWindow(`tel:${data.phone}`)
    );
    return;
  }

  if (action === 'dismiss') {
    // Just close notification (already done above)
    return;
  }

  // Default action: open the app
  const targetUrl = data.url || data.rideId ? `/track/${data.rideId}` : '/track';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes('/track') && 'focus' in client) {
            // Send message to client about the notification
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: data,
            });
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.data);
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
