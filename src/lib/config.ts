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

/**
 * Ride Processor (video) API configuration.
 *
 * The video pipeline lives on a separate Azure Functions host that is
 * protected with a function key (passed as a `?code=` query parameter),
 * so it needs its own base URL and key distinct from the tracking API.
 */
export interface VideoApiConfig {
  baseUrl: string;
  functionCode: string;
}

/**
 * Telegram delivery configuration.
 *
 * The ready video is delivered to the user via a Telegram bot. The PWA only
 * needs the bot username to build the `t.me/<bot>?start=<token>` deep link.
 */
export interface TelegramConfig {
  botUsername: string;
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
  videoApi: VideoApiConfig;
  telegram: TelegramConfig;
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
  videoApi: {
    // Ride Processor Functions host. Optional - falls back to empty so the
    // app still boots; the video feature checks isVideoFeatureEnabled().
    baseUrl: getEnvVar('VITE_VIDEO_API_BASE_URL', ''),
    functionCode: getEnvVar('VITE_VIDEO_API_CODE', ''),
  },
  telegram: {
    botUsername: getEnvVar('VITE_TELEGRAM_BOT_USERNAME', ''),
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
 * Whether the ride-video / Telegram delivery feature is configured.
 * The feature is hidden when its backend host or bot is not set up.
 */
export function isVideoFeatureEnabled(): boolean {
  return Boolean(config.videoApi.baseUrl && config.telegram.botUsername);
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
