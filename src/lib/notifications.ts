export type NotificationType = 'sos' | 'route-deviation' | 'delay' | 'arrival' | 'general';

export interface NotificationConfig {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  requireInteraction: boolean;
  vibrate?: number[];
  sound?: string;
  data?: {
    type: NotificationType;
    url?: string;
  };
}

interface CustomNotificationAction {
  action: string;
  title: string;
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, Omit<NotificationConfig, 'body'>> = {
  sos: {
    title: '🚨 EMERGENCY SOS ACTIVATED',
    icon: '/sos-icon.png',
    badge: '/sos-badge.png',
    tag: 'sos-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    sound: '/sounds/emergency.mp3',
    data: {
      type: 'sos',
      url: '/track'
    }
  },
  'route-deviation': {
    title: '⚠️ Route Deviation Alert',
    icon: '/warning-icon.png',
    badge: '/warning-badge.png',
    tag: 'route-deviation',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    sound: '/sounds/warning.mp3',
    data: {
      type: 'route-deviation',
      url: '/track'
    }
  },
  delay: {
    title: '🕐 Delay Notice',
    icon: '/clock-icon.png',
    badge: '/clock-badge.png',
    tag: 'delay',
    requireInteraction: false,
    vibrate: [100, 50, 100],
    sound: '/sounds/notification.mp3',
    data: {
      type: 'delay',
      url: '/track'
    }
  },
  arrival: {
    title: '✅ Arriving Soon',
    icon: '/arrival-icon.png',
    badge: '/arrival-badge.png',
    tag: 'arrival',
    requireInteraction: false,
    vibrate: [100],
    sound: '/sounds/success.mp3',
    data: {
      type: 'arrival',
      url: '/track'
    }
  },
  general: {
    title: '📱 Ride Update',
    icon: '/app-icon.png',
    badge: '/app-badge.png',
    tag: 'general',
    requireInteraction: false,
    vibrate: [100],
    data: {
      type: 'general',
      url: '/track'
    }
  }
};

export class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push notifications not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.error('Notifications not supported');
      return 'denied';
    }

    return await Notification.requestPermission();
  }

  async showNotification(type: NotificationType, customBody?: string): Promise<void> {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      console.error('Service worker not registered');
      return;
    }

    const config = NOTIFICATION_CONFIGS[type];
    const body = customBody || this.getDefaultBody(type);

    const notificationOptions = {
      body,
      icon: config.icon,
      badge: config.badge,
      tag: config.tag,
      requireInteraction: config.requireInteraction,
      vibrate: config.vibrate,
      data: config.data,
      actions: this.getActions(type),
      timestamp: Date.now(),
    } as NotificationOptions;

    await this.registration.showNotification(config.title, notificationOptions);

    // Play custom sound (browsers limit this)
    if (config.sound) {
      this.playSound(config.sound);
    }
    
    // Trigger vibration separately for better browser support
    if (config.vibrate && 'vibrate' in navigator) {
      navigator.vibrate(config.vibrate);
    }
  }

  private getDefaultBody(type: NotificationType): string {
    switch (type) {
      case 'sos':
        return 'Emergency services have been notified. Help is on the way!';
      case 'route-deviation':
        return 'Your driver has taken a different route. Tap to view details.';
      case 'delay':
        return 'Your ride will be delayed by 5 minutes.';
      case 'arrival':
        return 'Your driver will arrive in 2 minutes.';
      default:
        return 'You have a new ride update.';
    }
  }

  private getActions(type: NotificationType): CustomNotificationAction[] {
    if (type === 'sos') {
      return [
        { action: 'view', title: 'View Location' },
        { action: 'call', title: 'Call Driver' }
      ];
    }
    return [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  private playSound(soundUrl: string): void {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(err => console.warn('Could not play notification sound:', err));
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Replace with your VAPID public key
          'YOUR_VAPID_PUBLIC_KEY'
        ) as BufferSource
      });

      // Send subscription to your backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    // TODO: Implement your backend endpoint to store subscription
    console.log('Subscription to send to backend:', JSON.stringify(subscription));
  }
}

export const notificationService = NotificationService.getInstance();
