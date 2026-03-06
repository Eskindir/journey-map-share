/**
 * Application Configuration Service
 *
 * Centralizes all environment configuration with validation.
 * Uses Vite's import.meta.env for environment variable access.
 */

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface GoogleMapsConfig {
  apiKey: string;
}

export interface PushConfig {
  vapidPublicKey: string;
}

export interface FeatureFlags {
  enableDebugLogging: boolean;
  enableMockApi: boolean;
}

export interface AppConfig {
  api: ApiConfig;
  googleMaps: GoogleMapsConfig;
  push: PushConfig;
  features: FeatureFlags;
}

/**
 * Get environment variable with optional default value
 * Throws error if required variable is missing
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key];

  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please check your .env.local file or set this variable.`
    );
  }

  return value;
}

/**
 * Get boolean environment variable
 */
function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

/**
 * Get numeric environment variable
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Application configuration singleton
 * Validates required environment variables on first access
 */
export const config: AppConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL'),
    timeout: getEnvNumber('VITE_API_TIMEOUT', 30000),
    retryAttempts: getEnvNumber('VITE_API_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('VITE_API_RETRY_DELAY', 1000),
  },
  googleMaps: {
    apiKey: getEnvVar('VITE_GOOGLE_MAPS_API_KEY'),
  },
  push: {
    // VAPID key is optional - push notifications may not be configured
    vapidPublicKey: getEnvVar('VITE_VAPID_PUBLIC_KEY', ''),
  },
  features: {
    enableDebugLogging: getEnvBool('VITE_ENABLE_DEBUG_LOGGING', false),
    enableMockApi: getEnvBool('VITE_ENABLE_MOCK_API', false),
  },
};

/**
 * Debug logger that respects feature flag
 */
export function debugLog(...args: unknown[]): void {
  if (config.features.enableDebugLogging) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Check if all required configuration is present
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('VITE_API_BASE_URL is required');
  }

  if (!config.googleMaps.apiKey) {
    errors.push('VITE_GOOGLE_MAPS_API_KEY is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default config;
