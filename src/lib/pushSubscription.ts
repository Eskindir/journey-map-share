/**
 * Push Subscription Service
 *
 * Handles Web Push subscription management with graceful degradation:
 * - Android/Desktop: Full push notification support
 * - iOS: Falls back to polling (no push in browser)
 *
 * Partitioning Strategy (aligned with backend):
 * - Subscriptions are keyed by rideId (partition) + visitorId (row)
 * - This allows efficient "notify all visitors for ride" queries
 */

import { config, debugLog } from './config';

export type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

export interface SubscriptionResult {
  success: boolean;
  platform: Platform;
  hasPushSupport: boolean;
  subscription?: {
    visitorId: string;
    rideId: string;
    expiresAt: string;
  };
  error?: string;
}

export interface RideStatus {
  rideId: string;
  riderName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  arrivedSafely?: boolean;
  subscriberCount: number;
  completedAt?: string;
}

/**
 * Detect the user's platform
 */
export function detectPlatform(): Platform {
  const ua = navigator.userAgent;

  // iOS detection (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return 'ios';
  }

  // Android detection
  if (/Android/.test(ua)) {
    return 'android';
  }

  // Desktop (has full support)
  if (!/Mobi|Android/i.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Check if Web Push is supported on this platform
 */
export function isPushSupported(): boolean {
  const platform = detectPlatform();

  // iOS Safari doesn't support Web Push (only installed PWAs on iOS 16.4+)
  if (platform === 'ios') {
    // Check if running as installed PWA
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (!isStandalone) {
      debugLog('iOS browser detected - push not supported');
      return false;
    }
  }

  // Check for required APIs
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Generate a unique visitor ID (persisted in localStorage)
 */
export function getOrCreateVisitorId(): string {
  const storageKey = 'besec_visitor_id';
  let visitorId = localStorage.getItem(storageKey);

  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(storageKey, visitorId);
  }

  return visitorId;
}

/**
 * Get the notification API base URL
 */
function getNotificationApiUrl(): string {
  // Use separate notification API if configured, otherwise use main API
  return import.meta.env.VITE_NOTIFICATION_API_URL || config.api.baseUrl;
}

/**
 * Convert VAPID public key to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications for a ride
 *
 * Flow:
 * 1. Detect platform
 * 2. Request notification permission (Android/Desktop only)
 * 3. Get push subscription from browser
 * 4. Send subscription to backend
 */
export async function subscribeToRide(rideId: string): Promise<SubscriptionResult> {
  const platform = detectPlatform();
  const visitorId = getOrCreateVisitorId();
  const hasPushSupport = isPushSupported();

  debugLog(`Subscribing to ride: ${rideId}, platform: ${platform}, pushSupport: ${hasPushSupport}`);

  // For iOS or unsupported platforms, register without push subscription
  if (!hasPushSupport) {
    return registerWithoutPush(rideId, visitorId, platform);
  }

  // Request notification permission
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    debugLog('Notification permission denied, registering without push');
    return registerWithoutPush(rideId, visitorId, platform);
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Get or create push subscription
  let pushSubscription: PushSubscription | null = null;

  try {
    // Check for existing subscription
    pushSubscription = await registration.pushManager.getSubscription();

    if (!pushSubscription && config.push.vapidPublicKey) {
      // Create new subscription
      pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.push.vapidPublicKey),
      });
      debugLog('Created new push subscription');
    }
  } catch (error) {
    debugLog('Failed to get push subscription:', error);
    // Continue without push - graceful degradation
  }

  // Send subscription to backend
  return registerSubscription(rideId, visitorId, platform, pushSubscription);
}

/**
 * Register visitor without push subscription (iOS fallback)
 */
async function registerWithoutPush(
  rideId: string,
  visitorId: string,
  platform: Platform
): Promise<SubscriptionResult> {
  return registerSubscription(rideId, visitorId, platform, null);
}

/**
 * Send subscription to backend
 */
async function registerSubscription(
  rideId: string,
  visitorId: string,
  platform: Platform,
  pushSubscription: PushSubscription | null
): Promise<SubscriptionResult> {
  try {
    const apiUrl = getNotificationApiUrl();
    const response = await fetch(`${apiUrl}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rideId,
        visitorId,
        platform,
        pushSubscription: pushSubscription
          ? {
              endpoint: pushSubscription.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')),
                auth: arrayBufferToBase64(pushSubscription.getKey('auth')),
              },
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        platform,
        hasPushSupport: !!pushSubscription,
        error: error.error || 'Failed to subscribe',
      };
    }

    const data = await response.json();

    // Store subscription info locally
    localStorage.setItem(`besec_ride_${rideId}`, JSON.stringify({
      visitorId,
      subscribedAt: new Date().toISOString(),
      hasPush: !!pushSubscription,
    }));

    return {
      success: true,
      platform,
      hasPushSupport: !!pushSubscription,
      subscription: data.subscription,
    };
  } catch (error: any) {
    debugLog('Failed to register subscription:', error);
    return {
      success: false,
      platform,
      hasPushSupport: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Get current ride status
 * iOS users should poll this to check for arrival
 */
export async function getRideStatus(rideId: string): Promise<RideStatus | null> {
  try {
    const apiUrl = getNotificationApiUrl();
    const response = await fetch(`${apiUrl}/api/rides/${rideId}`);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    debugLog('Failed to get ride status:', error);
    return null;
  }
}

/**
 * Unsubscribe from a ride
 */
export async function unsubscribeFromRide(rideId: string): Promise<boolean> {
  const visitorId = getOrCreateVisitorId();

  try {
    const apiUrl = getNotificationApiUrl();
    const response = await fetch(`${apiUrl}/api/subscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rideId, visitorId }),
    });

    // Clean up local storage
    localStorage.removeItem(`besec_ride_${rideId}`);

    return response.ok;
  } catch (error) {
    debugLog('Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Helper: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Hook for React components to manage subscription state
 */
export interface UseRideSubscriptionOptions {
  rideId: string;
  pollInterval?: number; // Polling interval for iOS users (ms)
  onStatusChange?: (status: RideStatus) => void;
  onArrivedSafely?: (status: RideStatus) => void;
}

export interface RideSubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  platform: Platform;
  hasPushSupport: boolean;
  rideStatus: RideStatus | null;
  error: string | null;
}

/**
 * Create initial subscription state
 */
export function createInitialSubscriptionState(): RideSubscriptionState {
  return {
    isSubscribed: false,
    isLoading: true,
    platform: detectPlatform(),
    hasPushSupport: isPushSupported(),
    rideStatus: null,
    error: null,
  };
}
