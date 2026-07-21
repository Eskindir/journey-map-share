/**
 * useVideoPreview
 *
 * Requests the rider's ~15-second preview clip (a single decrypted segment — fast,
 * no full merge). Auto-starts once when the confirmation id + rider key are known.
 *
 * `unavailable` means the ride has no preview clip (e.g. a very short ride, or an
 * older ride); the caller (RideEnd) falls back to the full-video flow.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestRiderPreview } from '@/lib/api/video';
import { debugLog } from '@/lib/config';

export type VideoPreviewState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unavailable'
  | 'failed';

export interface UseVideoPreviewReturn {
  previewState: VideoPreviewState;
  previewUrl: string | null;
  error: string | null;
  retry: () => void;
}

export function useVideoPreview(
  confirmationId: string | null,
  riderKey: string | null
): UseVideoPreviewReturn {
  const [previewState, setPreviewState] = useState<VideoPreviewState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);

  const request = useCallback(async () => {
    if (!confirmationId || !riderKey) return;
    setPreviewState('loading');
    setError(null);
    try {
      const result = await requestRiderPreview(confirmationId, riderKey);
      if (result.status === 'ready') {
        setPreviewUrl(result.url);
        setPreviewState('ready');
      } else if (result.status === 'unavailable') {
        setPreviewState('unavailable');
      } else {
        setError(result.message);
        setPreviewState('failed');
      }
    } catch (err) {
      debugLog('Preview request threw:', err);
      setError(err instanceof Error ? err.message : 'Could not load the preview.');
      setPreviewState('failed');
    }
  }, [confirmationId, riderKey]);

  // Reset when the ride changes.
  useEffect(() => {
    requestedRef.current = false;
    setPreviewState('idle');
    setPreviewUrl(null);
    setError(null);
  }, [confirmationId]);

  // Auto-start once we have what we need.
  useEffect(() => {
    if (!confirmationId || !riderKey || requestedRef.current) return;
    requestedRef.current = true;
    request();
  }, [confirmationId, riderKey, request]);

  const retry = useCallback(() => {
    request();
  }, [request]);

  return { previewState, previewUrl, error, retry };
}

export default useVideoPreview;
