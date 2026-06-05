/**
 * Thin wrapper over the browser Contact Picker API, used to let the rider pick
 * SOS emergency contacts from their device address book instead of typing them.
 *
 * Support is limited to Chromium on Android; iOS Safari and desktop browsers do
 * not implement it, so callers must keep manual entry as a fallback. The API
 * also requires a secure context (HTTPS) and a user gesture (e.g. a button tap).
 */

import type { SosRecipient } from './sosRecipients';

// Minimal typings for the (still non-standard) Contact Picker API.
interface ContactInfo {
  name?: string[];
  tel?: string[];
}

interface ContactsManager {
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<ContactInfo[]>;
}

export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window
  );
}

/**
 * Opens the device contact picker and returns the chosen contacts mapped to
 * SOS recipients. Entries without a phone number are dropped. Returns an empty
 * array if the picker is unsupported or the user cancels.
 */
export async function pickContacts(): Promise<SosRecipient[]> {
  if (!isContactPickerSupported()) return [];

  const contactsManager = (navigator as Navigator & {
    contacts: ContactsManager;
  }).contacts;

  try {
    const selected = await contactsManager.select(['name', 'tel'], {
      multiple: true,
    });

    return selected
      .map((c) => {
        const phone = c.tel?.find((t) => t && t.trim())?.trim() ?? '';
        const name = c.name?.find((n) => n && n.trim())?.trim();
        return { name, phone } as SosRecipient;
      })
      .filter((r) => r.phone);
  } catch {
    // User cancelled or the picker failed — non-fatal.
    return [];
  }
}
