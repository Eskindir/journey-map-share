/**
 * Centralized Error Handling Service
 *
 * Provides consistent error handling with user-friendly messages
 * and integration with the toast notification system.
 */

import { toast } from '@/hooks/use-toast';
import { debugLog } from '@/lib/config';
import type { ApiError } from '@/lib/api/types';

// =============================================================================
// Error Codes
// =============================================================================

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  OFFLINE = 'OFFLINE',

  // API errors
  API_ERROR = 'API_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  INVALID_PHONE = 'INVALID_PHONE',

  // Geolocation errors
  GEOLOCATION_DENIED = 'GEOLOCATION_DENIED',
  GEOLOCATION_UNAVAILABLE = 'GEOLOCATION_UNAVAILABLE',
  GEOLOCATION_TIMEOUT = 'GEOLOCATION_TIMEOUT',

  // Generic
  UNKNOWN = 'UNKNOWN',
}

// =============================================================================
// Error Messages
// =============================================================================

interface ErrorConfig {
  title: string;
  description: string;
  retryable: boolean;
}

const ERROR_MESSAGES: Record<ErrorCode, ErrorConfig> = {
  // Network
  [ErrorCode.NETWORK_ERROR]: {
    title: 'Connection Error',
    description: 'Unable to connect. Please check your internet connection.',
    retryable: true,
  },
  [ErrorCode.TIMEOUT]: {
    title: 'Request Timeout',
    description: 'The request took too long. Please try again.',
    retryable: true,
  },
  [ErrorCode.OFFLINE]: {
    title: 'No Internet Connection',
    description: 'You appear to be offline. Please check your connection.',
    retryable: true,
  },

  // API
  [ErrorCode.API_ERROR]: {
    title: 'Service Error',
    description: 'Something went wrong. Please try again later.',
    retryable: true,
  },
  [ErrorCode.UNAUTHORIZED]: {
    title: 'Session Expired',
    description: 'Please sign in again to continue.',
    retryable: false,
  },
  [ErrorCode.FORBIDDEN]: {
    title: 'Access Denied',
    description: 'You do not have permission to perform this action.',
    retryable: false,
  },
  [ErrorCode.NOT_FOUND]: {
    title: 'Not Found',
    description: 'The requested resource could not be found.',
    retryable: false,
  },
  [ErrorCode.RATE_LIMITED]: {
    title: 'Too Many Requests',
    description: 'Please wait a moment before trying again.',
    retryable: true,
  },
  [ErrorCode.SERVER_ERROR]: {
    title: 'Server Error',
    description: 'Our servers are having trouble. Please try again later.',
    retryable: true,
  },

  // Validation
  [ErrorCode.VALIDATION_ERROR]: {
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    retryable: false,
  },
  [ErrorCode.INVALID_COORDINATES]: {
    title: 'Invalid Location',
    description: 'Please enter valid GPS coordinates (e.g., 40.7128, -74.0060).',
    retryable: false,
  },
  [ErrorCode.INVALID_PHONE]: {
    title: 'Invalid Phone Number',
    description: 'Please enter a valid phone number.',
    retryable: false,
  },

  // Geolocation
  [ErrorCode.GEOLOCATION_DENIED]: {
    title: 'Location Access Denied',
    description: 'Please enable location access in your browser settings.',
    retryable: false,
  },
  [ErrorCode.GEOLOCATION_UNAVAILABLE]: {
    title: 'Location Unavailable',
    description: 'Unable to determine your location. Please enter it manually.',
    retryable: true,
  },
  [ErrorCode.GEOLOCATION_TIMEOUT]: {
    title: 'Location Timeout',
    description: 'Getting your location took too long. Please try again.',
    retryable: true,
  },

  // Generic
  [ErrorCode.UNKNOWN]: {
    title: 'Error',
    description: 'An unexpected error occurred. Please try again.',
    retryable: true,
  },
};

// =============================================================================
// Error Handling Functions
// =============================================================================

/**
 * Show error toast with appropriate message
 */
export function showError(
  code: ErrorCode,
  customMessage?: string
): void {
  const config = ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN];

  toast({
    title: config.title,
    description: customMessage || config.description,
    variant: 'destructive',
  });
}

/**
 * Handle API error and show appropriate toast
 */
export function handleApiError(error: ApiError | unknown): ErrorCode {
  debugLog('Handling API error:', error);

  const apiError = error as ApiError;
  let code = ErrorCode.UNKNOWN;

  if (apiError.code) {
    switch (apiError.code) {
      case 'NETWORK_ERROR':
        code = ErrorCode.NETWORK_ERROR;
        break;
      case 'TIMEOUT':
        code = ErrorCode.TIMEOUT;
        break;
      case 'HTTP_401':
        code = ErrorCode.UNAUTHORIZED;
        break;
      case 'HTTP_403':
        code = ErrorCode.FORBIDDEN;
        break;
      case 'HTTP_404':
        code = ErrorCode.NOT_FOUND;
        break;
      case 'HTTP_429':
        code = ErrorCode.RATE_LIMITED;
        break;
      case 'HTTP_500':
      case 'HTTP_502':
      case 'HTTP_503':
      case 'HTTP_504':
        code = ErrorCode.SERVER_ERROR;
        break;
      default:
        code = ErrorCode.API_ERROR;
    }
  } else if (apiError.status) {
    if (apiError.status === 401) code = ErrorCode.UNAUTHORIZED;
    else if (apiError.status === 403) code = ErrorCode.FORBIDDEN;
    else if (apiError.status === 404) code = ErrorCode.NOT_FOUND;
    else if (apiError.status === 429) code = ErrorCode.RATE_LIMITED;
    else if (apiError.status >= 500) code = ErrorCode.SERVER_ERROR;
    else code = ErrorCode.API_ERROR;
  }

  showError(code, apiError.message);
  return code;
}

/**
 * Handle geolocation error and show appropriate toast
 */
export function handleGeolocationError(error: GeolocationPositionError): ErrorCode {
  debugLog('Handling geolocation error:', error);

  let code: ErrorCode;

  switch (error.code) {
    case error.PERMISSION_DENIED:
      code = ErrorCode.GEOLOCATION_DENIED;
      break;
    case error.POSITION_UNAVAILABLE:
      code = ErrorCode.GEOLOCATION_UNAVAILABLE;
      break;
    case error.TIMEOUT:
      code = ErrorCode.GEOLOCATION_TIMEOUT;
      break;
    default:
      code = ErrorCode.GEOLOCATION_UNAVAILABLE;
  }

  showError(code);
  return code;
}

/**
 * Check if error code is retryable
 */
export function isRetryable(code: ErrorCode): boolean {
  return ERROR_MESSAGES[code]?.retryable ?? false;
}

/**
 * Get error configuration
 */
export function getErrorConfig(code: ErrorCode): ErrorConfig {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN];
}

/**
 * Create error handler for async operations
 */
export function createErrorHandler(onError?: (code: ErrorCode) => void) {
  return (error: unknown) => {
    const code = handleApiError(error);
    onError?.(code);
    return code;
  };
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    onError?: (code: ErrorCode) => void;
    fallback?: T;
  } = {}
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const code = handleApiError(error);
    options.onError?.(code);
    return options.fallback;
  }
}
