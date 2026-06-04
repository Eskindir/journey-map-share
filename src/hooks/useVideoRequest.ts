/**
 * useVideoRequest
 *
 * Drives the post-ride "request a video" flow for an unsatisfactory ride.
 *
 * The ride video is end-to-end encrypted. The rider's decryption key was captured
 * from the tracking link and is passed in here with the confirmation id. Tapping
 * "request" kicks off the backend decrypt+merge. Merging takes minutes, so we do
 * NOT trap the rider on a spinner: state is persisted to localStorage keyed by
 * confirmation id, polling is visibility-aware with an escalating interval, and
 * reopening the ride-end screen resumes. When the merge completes the backend
 * texts the ready video link to the rider's phone (SMS); the hook also exposes an
 * in-app "open" fallback.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestRiderVideo } from '@/lib/api/video';
import { debugLog } from '@/lib/config';

export type VideoRequestState = 'idle' | 'generating' | 'ready' | 'failed';

export interface UseVideoRequestReturn {
  state: VideoRequestState;
  /** True while a one-off async action (request/resend/open) is running. */
  isBusy: boolean;
  /** True when generation is taking unusually long (soft warning, not failure). */
  isStalled: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Start merging; the ready link is texted to the rider's phone when done. */
  requestVideo: () => Promise<void>;
  /** Open the merged video in-app (download/playback fallback to the SMS link). */
  openInApp: () => Promise<void>;
  /** Retry after a failure. */
  retry: () => Promise<void>;
}

interface PersistedState {
  state: VideoRequestState;
  mergedUrl: string | null;
  requestedAt: number | null;
}

const STALL_AFTER_MS = 8 * 60 * 1000;
const POLL_MIN_MS = 5_000;
const POLL_MAX_MS = 30_000;

function storageKey(confirmationId: string): string {
  return `ride-video:${confirmationId}`;
}

function loadPersisted(confirmationId: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(storageKey(confirmationId));
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function savePersisted(confirmationId: string, value: PersistedState): void {
  try {
    localStorage.setItem(storageKey(confirmationId), JSON.stringify(value));
  } catch {
    // Storage may be unavailable - non-fatal.
  }
}

export function useVideoRequest(
  confirmationId: string | null,
  riderKey: string | null
): UseVideoRequestReturn {
  const [state, setState] = useState<VideoRequestState>('idle');
  const [isBusy, setIsBusy] = useState(false);
  const [isStalled, setIsStalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedUrlRef = useRef<string | null>(null);
  const requestedAtRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollDelayRef = useRef<number>(POLL_MIN_MS);

  const persist = useCallback(
    (next: Partial<PersistedState>) => {
      if (!confirmationId) return;
      savePersisted(confirmationId, {
        state: next.state ?? state,
        mergedUrl: next.mergedUrl ?? mergedUrlRef.current,
        requestedAt: next.requestedAt ?? requestedAtRef.current,
      });
    },
    [confirmationId, state]
  );

  // Rehydrate when the confirmation changes (deep link / return visit).
  useEffect(() => {
    setError(null);
    setIsStalled(false);
    if (!confirmationId) {
      setState('idle');
      mergedUrlRef.current = null;
      requestedAtRef.current = null;
      return;
    }
    const persisted = loadPersisted(confirmationId);
    if (persisted) {
      setState(persisted.state);
      mergedUrlRef.current = persisted.mergedUrl;
      requestedAtRef.current = persisted.requestedAt;
    } else {
      setState('idle');
      mergedUrlRef.current = null;
      requestedAtRef.current = null;
    }
  }, [confirmationId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const markReady = useCallback(
    (url: string) => {
      mergedUrlRef.current = url;
      setState('ready');
      persist({ state: 'ready', mergedUrl: url });
    },
    [persist]
  );

  // Visibility-aware escalating poll while generating.
  useEffect(() => {
    if (!confirmationId || !riderKey || state !== 'generating') {
      stopPolling();
      return;
    }

    let cancelled = false;
    pollDelayRef.current = POLL_MIN_MS;

    const tick = async () => {
      if (cancelled) return;

      if (requestedAtRef.current) {
        setIsStalled(Date.now() - requestedAtRef.current > STALL_AFTER_MS);
      }

      if (document.visibilityState === 'visible') {
        const result = await requestRiderVideo(confirmationId, riderKey);
        if (!cancelled) {
          if (result.status === 'ready') {
            markReady(result.url);
            return; // state change tears down this effect
          }
          if (result.status === 'error') {
            setError(result.message);
            setState('failed');
            persist({ state: 'failed' });
            return;
          }
        }
      }

      pollDelayRef.current = Math.min(pollDelayRef.current * 1.5, POLL_MAX_MS);
      pollTimerRef.current = window.setTimeout(tick, pollDelayRef.current);
    };

    pollTimerRef.current = window.setTimeout(tick, pollDelayRef.current);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        stopPolling();
        pollDelayRef.current = POLL_MIN_MS;
        pollTimerRef.current = window.setTimeout(tick, 0);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [confirmationId, riderKey, state, persist, stopPolling, markReady]);

  const requestVideo = useCallback(async () => {
    if (!confirmationId || isBusy) return;
    if (!riderKey) {
      setState('failed');
      setError('Video access key is missing for this ride.');
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      // Kick off the decrypt/merge (may already be ready).
      const now = Date.now();
      requestedAtRef.current = now;
      const result = await requestRiderVideo(confirmationId, riderKey);
      if (result.status === 'ready') {
        markReady(result.url);
      } else if (result.status === 'error') {
        throw new Error(result.message);
      } else {
        setState('generating');
        persist({ state: 'generating', requestedAt: now });
      }
    } catch (err) {
      debugLog('Failed to request video:', err);
      setState('failed');
      setError(err instanceof Error ? err.message : 'Could not request the video.');
      persist({ state: 'failed' });
    } finally {
      setIsBusy(false);
    }
  }, [confirmationId, riderKey, isBusy, markReady, persist]);

  const openInApp = useCallback(async () => {
    if (!confirmationId || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      let url = mergedUrlRef.current;
      if (!url && riderKey) {
        const result = await requestRiderVideo(confirmationId, riderKey);
        if (result.status === 'ready') {
          url = result.url;
          markReady(result.url);
        }
      }
      if (url) {
        window.open(url, '_blank', 'noopener');
      } else {
        setError('The video is not ready yet.');
      }
    } catch (err) {
      debugLog('Failed to open video in app:', err);
      setError(err instanceof Error ? err.message : 'The video is not ready yet.');
    } finally {
      setIsBusy(false);
    }
  }, [confirmationId, riderKey, isBusy, markReady]);

  const retry = useCallback(async () => {
    await requestVideo();
  }, [requestVideo]);

  return {
    state,
    isBusy,
    isStalled,
    error,
    requestVideo,
    openInApp,
    retry,
  };
}

export default useVideoRequest;
