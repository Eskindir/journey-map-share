/**
 * Ride Video API Service
 *
 * Talks to the SafeRide RideManager Functions host (separate from the tracking
 * API) to request the rider's encrypted ride video and to link the rider's
 * Telegram chat for out-of-band delivery.
 *
 * The ride video is end-to-end encrypted. The rider receives a "rider key" via
 * the tracking link (captured at /start and stored against the confirmation id);
 * the PWA sends {confirmationId, riderKey} to decrypt+merge and obtain a
 * time-limited SAS URL. A Telegram bot delivers that link to the rider's chat
 * when the merge completes, so they don't have to wait on the page.
 */

import { apiPost } from './client';
import { config, debugLog } from '@/lib/config';

export type RiderVideoResult =
  | { status: 'ready'; url: string }
  | { status: 'processing' }
  | { status: 'error'; message: string };

/**
 * Preview request result. `unavailable` means the ride has no preview clip (404)
 * — the caller should fall back to the full-video flow.
 */
export type RiderPreviewResult =
  | { status: 'ready'; url: string }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export interface TelegramLinkResult {
  linkToken: string;
  botUsername: string;
}

/**
 * Build an endpoint path on the RideManager host with the function key appended.
 * Functions live under `/api/<route>` and are protected with a `?code=` key.
 */
function buildVideoEndpoint(route: string): string {
  const search = new URLSearchParams();
  if (config.videoApi.functionCode) {
    search.set('code', config.videoApi.functionCode);
  }
  const query = search.toString();
  return `/api/${route}${query ? `?${query}` : ''}`;
}

function videoRequestOptions() {
  return { baseUrl: config.videoApi.baseUrl } as const;
}

/**
 * The absolute URL that `requestRiderVideo` POSTs to (decrypt/rider-by-confirmation),
 * including the `?code=` function key. Exposed so the UI can surface it for
 * debugging/diagnostics. Note: the function key is already client-visible (it ships
 * in the bundle and on every request), so this is not a new exposure.
 */
export function getRiderVideoRequestUrl(): string {
  return `${config.videoApi.baseUrl}${buildVideoEndpoint('decrypt/rider-by-confirmation')}`;
}

/**
 * Request the rider's ~15-second preview clip. Fast (single decrypted clip, no
 * merge). Returns 'ready' with the SAS URL, 'unavailable' when the ride has no
 * preview clip yet (caller falls back to the full video), or 'error'.
 */
export async function requestRiderPreview(
  confirmationId: string,
  riderKey: string
): Promise<RiderPreviewResult> {
  debugLog('Requesting rider preview for confirmation:', confirmationId);

  try {
    const response = await apiPost<unknown>(
      buildVideoEndpoint('decrypt/rider-preview-by-confirmation'),
      { confirmationId, riderKey },
      videoRequestOptions()
    );

    const raw = (response ?? {}) as Record<string, unknown>;
    const url = (raw.previewVideoUrl ?? raw.PreviewVideoUrl) as string | undefined;
    if (url) {
      return { status: 'ready', url };
    }
    return { status: 'error', message: 'Preview URL missing in response.' };
  } catch (error) {
    const status = (error as { status?: number }).status;
    // 404 = no preview clip for this ride → fall back to the full video.
    if (status === 404) {
      return { status: 'unavailable' };
    }
    const serverMessage =
      (error as { message?: string }).message || 'Could not retrieve the preview.';
    // Include the HTTP status so a mobile failure is self-explanatory.
    const message = status ? `(${status}) ${serverMessage}` : serverMessage;
    debugLog('Rider preview request failed:', error);
    return { status: 'error', message };
  }
}

/**
 * Request the rider's video. Kicks off decrypt+merge (or returns the SAS URL if
 * already merged). Safe to call repeatedly as a poll: returns 'ready' with the
 * URL once available, 'processing' while merging, or 'error' on a hard failure.
 */
export async function requestRiderVideo(
  confirmationId: string,
  riderKey: string
): Promise<RiderVideoResult> {
  debugLog('Requesting rider video for confirmation:', confirmationId);

  try {
    const response = await apiPost<unknown>(
      buildVideoEndpoint('decrypt/rider-by-confirmation'),
      { confirmationId, riderKey },
      videoRequestOptions()
    );

    const raw = (response ?? {}) as Record<string, unknown>;
    const url = (raw.mergedVideoUrl ?? raw.MergedVideoUrl) as string | undefined;
    if (url) {
      return { status: 'ready', url };
    }
    // 202 Accepted (still merging) returns a status/instanceId body, no URL.
    return { status: 'processing' };
  } catch (error) {
    const status = (error as { status?: number }).status;
    // 409 = ride not linked to the confirmation yet → treat as "keep waiting".
    if (status === 409) {
      return { status: 'processing' };
    }
    const message =
      error instanceof Error ? error.message : 'Could not retrieve the video.';
    debugLog('Rider video request failed:', error);
    return { status: 'error', message };
  }
}

/**
 * Issue a short-lived Telegram link token for this confirmation and return the
 * deep-link parts. The backend stores `linkToken -> confirmationId` so the bot
 * webhook can bind the rider's chat when they tap Start.
 */
export async function issueTelegramLink(
  confirmationId: string
): Promise<TelegramLinkResult> {
  debugLog('Issuing Telegram link for confirmation:', confirmationId);

  const response = await apiPost<unknown>(
    buildVideoEndpoint('telegram/link'),
    { confirmationId },
    videoRequestOptions()
  );

  const raw = (response ?? {}) as Record<string, unknown>;
  const linkToken = (raw.linkToken ?? raw.LinkToken ?? '') as string;
  const botUsername =
    ((raw.botUsername ?? raw.BotUsername) as string) ||
    config.telegram.botUsername;

  if (!linkToken) {
    throw new Error('Failed to issue Telegram link token');
  }

  return { linkToken, botUsername };
}

/**
 * Build the Telegram deep link the rider taps to open the bot and link their
 * chat. Two taps for the rider: open link -> tap Start.
 */
export function buildTelegramDeepLink(
  linkToken: string,
  botUsername: string = config.telegram.botUsername
): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(linkToken)}`;
}
