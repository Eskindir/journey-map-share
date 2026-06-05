/**
 * SOS recipient storage.
 *
 * When the rider shares their ride, the friends/family they choose are stored
 * (client-side, keyed by tracking id) as emergency contacts. If the rider later
 * triggers the SOS slider, the client sends these phone numbers to the backend,
 * which sends each of them an SOS SMS. The numbers live only on the rider's
 * device until an SOS is raised.
 */

const PREFIX = 'sos-recipients:';

/**
 * Device-global key holding the rider's last-used emergency contacts, so the
 * share sheet can pre-fill them on the next ride instead of asking again.
 */
const REMEMBERED_KEY = `${PREFIX}__default__`;

export interface SosRecipient {
  /** Optional display name (from manual entry / contact picker). */
  name?: string;
  /** Phone number in msisdn-ish form; normalized server-side before sending. */
  phone: string;
}

export function storeSosRecipients(
  trackingId: string,
  recipients: SosRecipient[]
): void {
  if (!trackingId) return;
  try {
    // Keep only entries with a phone number.
    const cleaned = recipients.filter((r) => r.phone && r.phone.trim());
    if (cleaned.length === 0) {
      localStorage.removeItem(`${PREFIX}${trackingId}`);
      return;
    }
    localStorage.setItem(`${PREFIX}${trackingId}`, JSON.stringify(cleaned));
  } catch {
    // Storage unavailable (private mode) — non-fatal.
  }
}

export function getSosRecipients(trackingId: string): SosRecipient[] {
  if (!trackingId) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${trackingId}`);
    return raw ? (JSON.parse(raw) as SosRecipient[]) : [];
  } catch {
    return [];
  }
}

/** Just the phone numbers, for sending to the SOS endpoint. */
export function getSosRecipientPhones(trackingId: string): string[] {
  return getSosRecipients(trackingId)
    .map((r) => r.phone.trim())
    .filter(Boolean);
}

/**
 * The rider's remembered emergency contacts (device-global), used to pre-fill
 * the share sheet on subsequent rides.
 */
export function getRememberedRecipients(): SosRecipient[] {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    return raw ? (JSON.parse(raw) as SosRecipient[]) : [];
  } catch {
    return [];
  }
}

export function storeRememberedRecipients(recipients: SosRecipient[]): void {
  try {
    const cleaned = recipients.filter((r) => r.phone && r.phone.trim());
    if (cleaned.length === 0) {
      localStorage.removeItem(REMEMBERED_KEY);
      return;
    }
    localStorage.setItem(REMEMBERED_KEY, JSON.stringify(cleaned));
  } catch {
    // Storage unavailable (private mode) — non-fatal.
  }
}

export function clearSosRecipients(trackingId: string): void {
  if (!trackingId) return;
  try {
    localStorage.removeItem(`${PREFIX}${trackingId}`);
  } catch {
    // non-fatal
  }
}
