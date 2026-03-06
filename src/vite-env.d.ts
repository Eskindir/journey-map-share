/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables
 *
 * All custom environment variables must be prefixed with VITE_
 * to be exposed to the client-side code.
 */
interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_API_RETRY_ATTEMPTS?: string;
  readonly VITE_API_RETRY_DELAY?: string;

  // Google Maps
  readonly VITE_GOOGLE_MAPS_API_KEY: string;

  // Push Notifications
  readonly VITE_VAPID_PUBLIC_KEY?: string;

  // Feature Flags
  readonly VITE_ENABLE_DEBUG_LOGGING?: string;
  readonly VITE_ENABLE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Contact Picker API type definitions
 * This API is not yet in TypeScript's standard lib
 */
interface ContactAddress {
  city?: string;
  country?: string;
  dependentLocality?: string;
  organization?: string;
  phone?: string;
  postalCode?: string;
  region?: string;
  sortingCode?: string;
  streetAddress?: string;
}

interface ContactInfo {
  address?: ContactAddress[];
  email?: string[];
  icon?: Blob[];
  name?: string[];
  tel?: string[];
}

interface ContactsManager {
  getProperties(): Promise<string[]>;
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<ContactInfo[]>;
}

declare global {
  interface Navigator {
    contacts?: ContactsManager;
  }

  interface Window {
    ContactsManager?: ContactsManager;
  }
}

export {};
