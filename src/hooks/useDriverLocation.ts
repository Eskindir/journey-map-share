import { useEffect, useRef } from 'react';
import { snapPositionWithHistory } from '@/lib/api/roads';
import type { Position } from '@/lib/api/types';
import { distanceMeters } from '@/lib/geo/distance';
import { debugLog } from '@/lib/config';
import { handleGeolocationError } from '@/lib/errors';

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

/** Ignore fixes worse than this (meters). */
const MAX_ACCURACY_M = 40;

/** Minimum movement before sending (meters). */
const MIN_MOVE_M = 20;

/** Heartbeat interval when stationary (ms). Spec: send a geolocation every 5 seconds. */
const HEARTBEAT_MS = 5_000;

export interface DriverLocationFix {
  raw: Position;
  snapped: Position;
}

export interface UseDriverLocationOptions {
  enabled: boolean;
  onFix: (fix: DriverLocationFix) => void | Promise<void>;
}

/**
 * Continuous high-accuracy GPS with road snapping for the driver (sender) flow.
 */
export function useDriverLocation({
  enabled,
  onFix,
}: UseDriverLocationOptions): void {
  const historyRef = useRef<Position[]>([]);
  const lastSentRef = useRef<Position | null>(null);
  const lastSentAtRef = useRef(0);
  const processingRef = useRef(false);
  const onFixRef = useRef(onFix);

  onFixRef.current = onFix;

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return;
    }

    const maybeEmit = async (raw: Position, accuracy: number) => {
      if (processingRef.current) {
        return;
      }

      const now = Date.now();
      const lastSent = lastSentRef.current;
      // Accuracy only gates the *extra* movement-triggered sends (so road snapping isn't fed
      // jittery low-quality fixes). The heartbeat must still send every HEARTBEAT_MS regardless
      // of accuracy — otherwise coarse desktop/WiFi fixes (and weak phone GPS) drop every update
      // and nothing is ever reported.
      const accurate = accuracy <= MAX_ACCURACY_M;
      const movedEnough =
        accurate && (!lastSent || distanceMeters(lastSent, raw) >= MIN_MOVE_M);
      const heartbeatDue = now - lastSentAtRef.current >= HEARTBEAT_MS;

      if (!movedEnough && !heartbeatDue) {
        return;
      }

      processingRef.current = true;
      try {
        const snapped = await snapPositionWithHistory(
          historyRef.current,
          raw,
        );

        debugLog('Driver GPS fix:', { raw, snapped, accuracy });

        historyRef.current = [...historyRef.current, snapped].slice(-20);
        lastSentRef.current = snapped;
        lastSentAtRef.current = now;

        await onFixRef.current({ raw, snapped });
      } finally {
        processingRef.current = false;
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const raw: Position = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        void maybeEmit(raw, position.coords.accuracy);
      },
      (error) => {
        handleGeolocationError(error);
      },
      GEO_OPTIONS,
    );

    // Initial heartbeat in case watchPosition is slow to fire
    const heartbeat = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const raw: Position = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          void maybeEmit(raw, position.coords.accuracy);
        },
        () => {
          /* errors handled by watch callback */
        },
        GEO_OPTIONS,
      );
    }, HEARTBEAT_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
      historyRef.current = [];
      lastSentRef.current = null;
      lastSentAtRef.current = 0;
    };
  }, [enabled]);
}
