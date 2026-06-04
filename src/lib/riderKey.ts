/**
 * Rider key storage.
 *
 * The rider's video-decryption key arrives in the tracking link (`?rk=...&cid=...`)
 * and is captured when the rider lands on /start. We persist it keyed by the ride
 * confirmation id so the ride-end screen can later request the encrypted video
 * (POST /api/decrypt/rider-by-confirmation) without re-prompting the rider.
 *
 * Note: the key only unwraps THIS ride's video DEK; it is the rider's own access
 * key for their own ride.
 */

const PREFIX = 'rider-key:';

export function storeRiderKey(confirmationId: string, riderKey: string): void {
  if (!confirmationId || !riderKey) return;
  try {
    localStorage.setItem(`${PREFIX}${confirmationId}`, riderKey);
  } catch {
    // Storage unavailable (private mode) — non-fatal.
  }
}

export function getRiderKey(confirmationId: string): string | null {
  if (!confirmationId) return null;
  try {
    return localStorage.getItem(`${PREFIX}${confirmationId}`);
  } catch {
    return null;
  }
}

/**
 * Capture `rk` (rider key) and `cid` (confirmation id) from a URL's query string
 * and persist them. Returns true if a key was captured.
 */
export function captureRiderKeyFromQuery(search: string): boolean {
  try {
    const params = new URLSearchParams(search);
    const rk = params.get('rk');
    const cid = params.get('cid');
    if (rk && cid) {
      storeRiderKey(cid, rk);
      return true;
    }
  } catch {
    // ignore malformed query
  }
  return false;
}
