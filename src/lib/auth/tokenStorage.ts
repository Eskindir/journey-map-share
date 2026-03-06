/**
 * Token Storage Service
 *
 * Provides secure storage utilities for authentication tokens.
 * Prepared for future authentication implementation.
 *
 * Security considerations:
 * - Access tokens stored in sessionStorage (cleared on tab close)
 * - Refresh tokens stored in localStorage (persisted)
 * - All tokens cleared on explicit logout
 */

const ACCESS_TOKEN_KEY = 'besec_access_token';
const REFRESH_TOKEN_KEY = 'besec_refresh_token';
const TOKEN_EXPIRY_KEY = 'besec_token_expiry';

// =============================================================================
// Access Token Management
// =============================================================================

/**
 * Store access token in session storage
 */
export function setAccessToken(token: string): void {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store access token:', error);
  }
}

/**
 * Retrieve access token from session storage
 */
export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve access token:', error);
    return null;
  }
}

/**
 * Remove access token from session storage
 */
export function removeAccessToken(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove access token:', error);
  }
}

// =============================================================================
// Refresh Token Management
// =============================================================================

/**
 * Store refresh token in local storage
 */
export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store refresh token:', error);
  }
}

/**
 * Retrieve refresh token from local storage
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve refresh token:', error);
    return null;
  }
}

/**
 * Remove refresh token from local storage
 */
export function removeRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove refresh token:', error);
  }
}

// =============================================================================
// Token Expiry Management
// =============================================================================

/**
 * Store token expiry timestamp
 */
export function setTokenExpiry(expiresAt: Date): void {
  try {
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toISOString());
  } catch (error) {
    console.error('Failed to store token expiry:', error);
  }
}

/**
 * Get token expiry timestamp
 */
export function getTokenExpiry(): Date | null {
  try {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? new Date(expiry) : null;
  } catch (error) {
    console.error('Failed to retrieve token expiry:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return true;

  // Consider token expired 5 minutes before actual expiry
  const bufferMs = 5 * 60 * 1000;
  return new Date().getTime() > expiry.getTime() - bufferMs;
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Clear all authentication tokens
 */
export function clearAllTokens(): void {
  removeAccessToken();
  removeRefreshToken();
  try {
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
    console.error('Failed to clear token expiry:', error);
  }
}

/**
 * Check if user has valid authentication
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired();
}

/**
 * Store complete auth session
 */
export function setAuthSession(
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): void {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
  setTokenExpiry(expiresAt);
}

// =============================================================================
// Token Utilities
// =============================================================================

/**
 * Get authorization header value
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

/**
 * Parse JWT token payload (without verification)
 * Note: This does NOT verify the token signature
 */
export function parseTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
