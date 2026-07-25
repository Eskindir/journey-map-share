/**
 * HTTP API Client with Retry Logic
 *
 * Provides a centralized, typed HTTP client with:
 * - Automatic retry with exponential backoff
 * - Request timeouts
 * - Standardized error handling
 * - Debug logging support
 */

import { config, debugLog } from '@/lib/config';
import type { ApiError } from './types';

// HTTP status codes that are retryable
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Request configuration options
 */
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipRetry?: boolean;
  /**
   * Override the base URL for this request. Defaults to `config.api.baseUrl`.
   * Used to reach the separate Ride Processor (video) Functions host while
   * reusing the same retry/timeout/error handling.
   */
  baseUrl?: string;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an HTTP status code is retryable
 */
function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(status);
}

/**
 * Create a standardized API error
 */
function createApiError(
  message: string,
  options: Partial<ApiError> = {}
): ApiError {
  return {
    message,
    retryable: false,
    ...options,
  };
}

/**
 * Make an API request with retry logic and timeout handling
 *
 * @param endpoint - API endpoint path (will be appended to base URL)
 * @param requestConfig - Request configuration options
 * @returns Parsed JSON response
 * @throws ApiError on failure
 */
export async function apiRequest<T>(
  endpoint: string,
  requestConfig: RequestConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = config.api.timeout,
    retries = config.api.retryAttempts,
    retryDelay = config.api.retryDelay,
    skipRetry = false,
    baseUrl = config.api.baseUrl,
  } = requestConfig;

  const url = `${baseUrl}${endpoint}`;
  let lastError: ApiError | null = null;
  const maxAttempts = skipRetry ? 1 : retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      debugLog(`API Request [Attempt ${attempt}/${maxAttempts}]:`, {
        method,
        url,
        body: body ? JSON.stringify(body).substring(0, 200) : undefined,
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
          // Future: Add authentication header
          // 'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorData: Record<string, unknown> = {};

        try {
          errorData = await response.json();
          // Backend functions return { error: "..." }; some return { message: "..." }.
          // Surface whichever is present so the real reason isn't swallowed.
          errorMessage =
            (errorData.message as string) ||
            (errorData.error as string) ||
            errorMessage;
        } catch {
          // Response body is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }

        lastError = createApiError(errorMessage, {
          status: response.status,
          code: (errorData.code as string) || `HTTP_${response.status}`,
          retryable: isRetryableStatus(response.status),
        });

        debugLog(`API Error [${response.status}]:`, lastError);

        // Retry if retryable and attempts remain
        if (lastError.retryable && attempt < maxAttempts) {
          const exponentialDelay = retryDelay * Math.pow(2, attempt - 1);
          debugLog(`Retrying in ${exponentialDelay}ms...`);
          await delay(exponentialDelay);
          continue;
        }

        throw lastError;
      }

      // Parse successful response
      const data = await response.json();
      debugLog('API Response:', data);
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = createApiError('Request timed out. Please try again.', {
          code: 'TIMEOUT',
          retryable: true,
        });
        debugLog('API Timeout');
      }
      // Handle network errors
      else if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = createApiError(
          'Unable to connect. Please check your internet connection.',
          {
            code: 'NETWORK_ERROR',
            retryable: true,
            originalError: error,
          }
        );
        debugLog('Network Error:', error.message);
      }
      // Re-throw API errors
      else if ((error as ApiError).code) {
        throw error;
      }
      // Handle unknown errors
      else {
        lastError = createApiError('An unexpected error occurred.', {
          code: 'UNKNOWN',
          retryable: false,
          originalError: error,
        });
        debugLog('Unknown Error:', error);
      }

      // Retry if retryable and attempts remain
      if (lastError.retryable && attempt < maxAttempts) {
        const exponentialDelay = retryDelay * Math.pow(2, attempt - 1);
        debugLog(`Retrying in ${exponentialDelay}ms...`);
        await delay(exponentialDelay);
        continue;
      }
    }
  }

  // All attempts exhausted
  throw (
    lastError ||
    createApiError('Request failed after all retry attempts.', {
      code: 'MAX_RETRIES',
      retryable: false,
    })
  );
}

/**
 * Convenience method for GET requests
 */
export function apiGet<T>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(endpoint, { ...config, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export function apiPost<T>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(endpoint, { ...config, method: 'POST', body });
}

/**
 * Convenience method for PUT requests
 */
export function apiPut<T>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(endpoint, { ...config, method: 'PUT', body });
}

/**
 * Convenience method for DELETE requests
 */
export function apiDelete<T>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method'>
): Promise<T> {
  return apiRequest<T>(endpoint, { ...config, method: 'DELETE' });
}
