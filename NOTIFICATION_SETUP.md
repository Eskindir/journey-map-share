# Push Notification Setup Guide

## Overview
This app includes a complete push notification system with customizable alerts for different event types (SOS, route deviation, delays, arrivals, etc.). Each notification type has unique:
- Title and message text
- Icons and badges
- Vibration patterns
- Sound effects
- Priority levels
- Action buttons

## Features Implemented

### 1. **Notification Types**
- **🚨 SOS Emergency**: Critical alert with 7 vibration pulses, requires user interaction
- **⚠️ Route Deviation**: Warning with 3 vibration pulses when driver changes route
- **🕐 Delay Notice**: Informational alert for delays with 2 short pulses
- **✅ Arrival**: Success notification when driver is arriving soon
- **📱 General**: Standard ride updates

### 2. **PWA (Progressive Web App)**
- App can be installed on mobile devices
- Works offline with cached resources
- Service worker handles notifications
- Install prompt appears automatically

### 3. **Customization Per Alert Type**
Each notification includes:
```typescript
{
  title: "Custom Title",
  body: "Custom message",
  icon: "/custom-icon.png",
  badge: "/custom-badge.png",
  vibrate: [200, 100, 200], // Custom pattern
  sound: "/sounds/custom.mp3",
  requireInteraction: true/false,
  actions: [
    { action: 'view', title: 'View Location' },
    { action: 'call', title: 'Call Driver' }
  ]
}
```

## Testing Notifications

### Step 1: Enable Notifications
1. Visit the home page
2. Click "Test Notification Settings"
3. Click "Enable Notifications"
4. Grant permission when prompted

### Step 2: Test Different Types
Test each notification type to see:
- Different vibration patterns
- Unique icons and styling
- Action buttons
- Priority levels

### Step 3: Test During Ride
1. Start a ride from the home page
2. Go to `/track` route
3. Automatic notifications will trigger when:
   - Route deviates (after ~10 seconds for demo)
   - Ride is delayed
   - SOS slider is activated (slide to 95%+)

## How It Works

### Architecture
```
┌─────────────────┐
│  TrackRide.tsx  │ ← Triggers notifications based on events
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ notifications.ts    │ ← Notification service (singleton)
│ - showNotification()│
│ - requestPermission()│
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Service Worker     │ ← Handles push events
│  (sw.js)            │ ← Click handlers
└─────────────────────┘
```

### Code Integration

**In your components:**
```typescript
import { notificationService } from "@/lib/notifications";

// Request permission (once)
await notificationService.requestPermission();
await notificationService.initialize();

// Send notification
await notificationService.showNotification('sos', 'Emergency! Help needed!');
```

**Automatic notifications in TrackRide.tsx:**
```typescript
// SOS activation
if (value[0] >= 95) {
  await notificationService.showNotification('sos', 'EMERGENCY! Location shared.');
}

// Route deviation
if (randomStatus === "deviated") {
  notificationService.showNotification('route-deviation', 'Driver changed route.');
}
```

## Customization Guide

### Adding New Notification Types

1. **Update the type definition:**
```typescript
// src/lib/notifications.ts
export type NotificationType = 'sos' | 'route-deviation' | your-new-type';
```

2. **Add configuration:**
```typescript
export const NOTIFICATION_CONFIGS = {
  'your-new-type': {
    title: '🔔 Your Title',
    icon: '/your-icon.png',
    badge: '/your-badge.png',
    tag: 'your-tag',
    requireInteraction: false,
    vibrate: [100, 50, 100],
    sound: '/sounds/your-sound.mp3',
    data: {
      type: 'your-new-type',
      url: '/target-page'
    }
  }
}
```

3. **Add default message:**
```typescript
private getDefaultBody(type: NotificationType): string {
  switch (type) {
    case 'your-new-type':
      return 'Your default message here';
    // ... other cases
  }
}
```

### Custom Vibration Patterns
```typescript
vibrate: [200, 100, 200, 100, 500] // vibrate, pause, vibrate, pause, vibrate
// Times in milliseconds
// Pattern: [vibrate, pause, vibrate, pause, ...]
```

### Custom Action Buttons
```typescript
actions: [
  { action: 'accept', title: 'Accept' },
  { action: 'decline', title: 'Decline' },
  { action: 'view', title: 'View Details' }
]
```

Handle clicks in `public/sw.js`:
```javascript
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'accept') {
    // Handle accept
  } else if (event.action === 'decline') {
    // Handle decline
  }
});
```

## Browser Compatibility

### Supported Features
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Notifications | ✅ | ✅ | ✅* | ✅ |
| Vibration | ✅ | ✅ | ❌ | ✅ |
| Custom Sounds | Limited | Limited | Limited | Limited |
| Action Buttons | ✅ | ✅ | ❌ | ✅ |
| PWA Install | ✅ | ✅ | ✅ | ✅ |

*Safari requires PWA to be installed first

### Limitations
- **Custom Sounds**: Browsers restrict sound playback; may require user interaction
- **Vibration**: iOS doesn't support vibration API
- **Layout**: OS controls notification appearance
- **Images**: Some browsers don't support notification images

## Production Deployment

### 1. Add Real Icons
Replace placeholder icons in `/public`:
- `/app-icon.png` (192x192, 512x512)
- `/sos-icon.png`
- `/warning-icon.png`
- `/clock-icon.png`
- `/arrival-icon.png`

### 2. Add Sound Files
Add sound files to `/public/sounds/`:
- `emergency.mp3`
- `warning.mp3`
- `notification.mp3`
- `success.mp3`

### 3. Configure Push Server (Optional)
For server-triggered notifications:

1. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

2. Update `notifications.ts`:
```typescript
applicationServerKey: this.urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY')
```

3. Create backend endpoint to send push notifications
4. Store subscriptions when users enable notifications

### 4. Update Service Worker
The service worker is auto-generated by vite-plugin-pwa, but you can customize it in `vite.config.ts`:
```typescript
VitePWA({
  workbox: {
    // Custom caching strategies
  }
})
```

## Testing Checklist

- [ ] Notifications permission request works
- [ ] Each notification type displays correctly
- [ ] Vibration patterns work on Android
- [ ] SOS notification requires interaction
- [ ] Action buttons work correctly
- [ ] Clicking notification opens correct page
- [ ] PWA install prompt appears
- [ ] Notifications work when app is backgrounded
- [ ] Network offline warning appears when disconnected
- [ ] Sound files play (when supported)

## Troubleshooting

### Notifications Not Showing
1. Check browser permissions: Settings → Notifications
2. Ensure HTTPS (required for notifications)
3. Check service worker is registered: DevTools → Application → Service Workers

### Vibration Not Working
- iOS doesn't support vibration
- Check device isn't in silent mode
- Ensure browser supports Vibration API

### Sounds Not Playing
- Browsers restrict audio playback
- May require user interaction first
- Check file paths are correct

### PWA Not Installing
- Requires HTTPS (localhost works for testing)
- Check manifest.json is valid
- Ensure service worker is registered

## Next Steps

To add **native mobile app** notifications (Capacitor):
1. Install `@capacitor/push-notifications`
2. Configure native project (iOS/Android)
3. Set up Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNS)
4. Handle tokens and registration

Would you like help implementing native push notifications?
