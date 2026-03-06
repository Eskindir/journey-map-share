import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToRide,
  getRideStatus,
  unsubscribeFromRide,
  detectPlatform,
  isPushSupported,
  Platform,
  RideStatus,
} from '@/lib/pushSubscription';
import { debugLog } from '@/lib/config';

export interface UseRideSubscriptionOptions {
  /** The ride ID to subscribe to */
  rideId: string;
  /** Polling interval in ms (default: 30000 for iOS, 60000 for others) */
  pollInterval?: number;
  /** Callback when ride status changes */
  onStatusChange?: (status: RideStatus) => void;
  /** Callback when rider arrives safely */
  onArrivedSafely?: (status: RideStatus) => void;
  /** Auto-subscribe on mount (default: true) */
  autoSubscribe?: boolean;
}

export interface UseRideSubscriptionReturn {
  /** Current subscription state */
  isSubscribed: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Detected platform */
  platform: Platform;
  /** Whether push notifications are supported */
  hasPushSupport: boolean;
  /** Current ride status */
  rideStatus: RideStatus | null;
  /** Error message if any */
  error: string | null;
  /** Manually subscribe to the ride */
  subscribe: () => Promise<void>;
  /** Manually unsubscribe from the ride */
  unsubscribe: () => Promise<void>;
  /** Manually refresh the ride status */
  refreshStatus: () => Promise<void>;
  /** User-friendly message about notification support */
  notificationMessage: string;
}

/**
 * React hook for managing ride subscription with graceful degradation
 *
 * Features:
 * - Auto-detects platform (iOS, Android, Desktop)
 * - Subscribes to Web Push on supported platforms
 * - Falls back to polling on iOS
 * - Handles visibility changes (pauses polling when tab hidden)
 */
export function useRideSubscription(
  options: UseRideSubscriptionOptions
): UseRideSubscriptionReturn {
  const { rideId, pollInterval, onStatusChange, onArrivedSafely, autoSubscribe = true } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null);

  const platform = detectPlatform();
  const hasPushSupport = isPushSupported();

  // Refs for callbacks and cleanup
  const pollIntervalRef = useRef<number | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  // Determine polling interval based on platform
  const effectivePollInterval =
    pollInterval ?? (platform === 'ios' || !hasPushSupport ? 30000 : 60000);

  /**
   * Get user-friendly notification message
   */
  const notificationMessage = (() => {
    if (platform === 'ios') {
      return "You'll need to check back here for arrival updates. iOS browsers don't support background notifications.";
    }
    if (!hasPushSupport) {
      return "Notifications aren't available on this device. Please check back for updates.";
    }
    if (isSubscribed && hasPushSupport) {
      return "You'll receive a notification when they arrive safely.";
    }
    return 'Enable notifications to be alerted when they arrive.';
  })();

  /**
   * Fetch current ride status
   */
  const refreshStatus = useCallback(async () => {
    try {
      const status = await getRideStatus(rideId);

      if (status) {
        setRideStatus(status);

        // Check if status changed
        const statusKey = `${status.status}-${status.arrivedSafely}`;
        if (lastStatusRef.current !== statusKey) {
          lastStatusRef.current = statusKey;
          onStatusChange?.(status);

          // Check for arrival
          if (status.status === 'completed' && status.arrivedSafely) {
            onArrivedSafely?.(status);
          }
        }
      }
    } catch (err) {
      debugLog('Failed to refresh status:', err);
    }
  }, [rideId, onStatusChange, onArrivedSafely]);

  /**
   * Subscribe to the ride
   */
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await subscribeToRide(rideId);

      if (result.success) {
        setIsSubscribed(true);
        // Initial status fetch
        await refreshStatus();
      } else {
        setError(result.error || 'Failed to subscribe');
      }
    } catch (err: any) {
      setError(err.message || 'Subscription failed');
    } finally {
      setIsLoading(false);
    }
  }, [rideId, refreshStatus]);

  /**
   * Unsubscribe from the ride
   */
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      await unsubscribeFromRide(rideId);
      setIsSubscribed(false);
    } catch (err) {
      debugLog('Unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [rideId]);

  /**
   * Start polling for status updates
   */
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Only poll if:
    // 1. iOS user (no push support)
    // 2. Or page is visible
    const shouldPoll = !hasPushSupport || platform === 'ios';

    if (shouldPoll && rideStatus?.status !== 'completed') {
      debugLog(`Starting polling every ${effectivePollInterval}ms`);

      pollIntervalRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshStatus();
        }
      }, effectivePollInterval);
    }
  }, [hasPushSupport, platform, effectivePollInterval, rideStatus?.status, refreshStatus]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Auto-subscribe on mount
  useEffect(() => {
    if (autoSubscribe && rideId) {
      subscribe();
    }

    return () => {
      stopPolling();
    };
  }, [rideId, autoSubscribe]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start polling when subscribed
  useEffect(() => {
    if (isSubscribed) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isSubscribed, startPolling, stopPolling]);

  // Handle visibility changes - refresh immediately when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSubscribed) {
        debugLog('Page visible, refreshing status');
        refreshStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSubscribed, refreshStatus]);

  // Stop polling when ride is completed
  useEffect(() => {
    if (rideStatus?.status === 'completed') {
      debugLog('Ride completed, stopping polling');
      stopPolling();
    }
  }, [rideStatus?.status, stopPolling]);

  return {
    isSubscribed,
    isLoading,
    platform,
    hasPushSupport,
    rideStatus,
    error,
    subscribe,
    unsubscribe,
    refreshStatus,
    notificationMessage,
  };
}

export default useRideSubscription;
