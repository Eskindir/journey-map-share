/**
 * Tracking API Service
 *
 * Provides type-safe methods for all ride tracking API operations.
 * All responses are validated with Zod schemas.
 */

import { apiPost, apiGet } from './client';
import {
  InitiateTrackingRequest,
  InitiateTrackingResponse,
  InitiateTrackingResponseSchema,
  AddGeolocationRequest,
  AddGeolocationResponse,
  AddGeolocationResponseSchema,
  LatestLocationResponse,
  LatestLocationResponseSchema,
  CloseTrackingRequest,
  CloseTrackingResponse,
  CloseTrackingResponseSchema,
  Position,
  RideStatus,
  normalizeDriverInfo,
  NormalizedDriverInfo,
} from './types';
import { debugLog } from '@/lib/config';

/**
 * Result of initiating tracking
 */
export interface InitiateTrackingResult {
  trackingId: string;
  rideId: string;
  message: string;
  driverInfo: NormalizedDriverInfo | null;
}

/**
 * Initiate ride tracking
 *
 * Creates a new tracking session and returns tracking ID and driver info.
 *
 * @param request - Tracking request payload
 * @returns Tracking result with ID and driver info
 */
export async function initiateTracking(
  request: InitiateTrackingRequest
): Promise<InitiateTrackingResult> {
  debugLog('Initiating tracking:', request);

  const response = await apiPost<unknown>('/initiate-tracking', request);

  // Validate response schema
  const parseResult = InitiateTrackingResponseSchema.safeParse(response);

  if (!parseResult.success) {
    debugLog('Response validation warning:', parseResult.error);
    // Continue with unvalidated response for backwards compatibility
  }

  const validatedResponse = parseResult.success
    ? parseResult.data
    : (response as InitiateTrackingResponse);

  // Handle nested payload structure from some backend versions
  const responseRecord = response as Record<string, unknown>;
  const payload =
    responseRecord.payload && typeof responseRecord.payload === 'object'
      ? (responseRecord.payload as Record<string, unknown>)
      : responseRecord;

  // Check both camelCase and PascalCase (C# backend returns Id)
  const trackingIdFromResponse =
    typeof payload.id === 'string' ? payload.id
    : typeof payload.Id === 'string' ? payload.Id
    : typeof responseRecord.id === 'string' ? responseRecord.id
    : typeof responseRecord.Id === 'string' ? responseRecord.Id
    : validatedResponse.id ?? '';

  const messageFromResponse =
    typeof payload.message === 'string' ? payload.message
    : typeof payload.Message === 'string' ? payload.Message
    : typeof responseRecord.message === 'string' ? responseRecord.message
    : typeof responseRecord.Message === 'string' ? responseRecord.Message
    : validatedResponse.message;

  const driverInfoFromResponse =
    (payload.driverInfo as InitiateTrackingResponse['driverInfo'] | undefined) ??
    (payload.DriverInfo as InitiateTrackingResponse['driverInfo'] | undefined) ??
    (responseRecord.driverInfo as InitiateTrackingResponse['driverInfo'] | undefined) ??
    (responseRecord.DriverInfo as InitiateTrackingResponse['driverInfo'] | undefined) ??
    validatedResponse.driverInfo;

  if (!trackingIdFromResponse.trim()) {
    throw new Error('Initiate tracking response did not include a valid id');
  }

  return {
    trackingId: trackingIdFromResponse,
    rideId: request.rideId,
    message: messageFromResponse,
    driverInfo: normalizeDriverInfo(driverInfoFromResponse),
  };
}

/**
 * Result of getting latest location
 */
export interface LatestLocationResult {
  position: Position;
  rideStatus: RideStatus;
  isRideActive: boolean;
  locationId: string;
  driverId: string;
  rideId: string;
}

/**
 * Get latest location for a tracking session
 *
 * @param trackingId - The tracking session ID
 * @returns Latest location data including ride status, or null if not available
 */
export async function getLatestLocation(
  trackingId: string
): Promise<LatestLocationResult | null> {
  debugLog('Fetching latest location for:', trackingId);

  const response = await apiGet<unknown>(`/getlatestlocation/${trackingId}`);

  // Validate and normalize response (handles PascalCase from C# backend)
  const parseResult = LatestLocationResponseSchema.safeParse(response);

  if (!parseResult.success) {
    debugLog('Response validation warning:', parseResult.error);
  }

  // The schema transform normalizes PascalCase to camelCase.
  // If validation fails, fall back to manual extraction for PascalCase responses.
  let location: LatestLocationResult['position'] | undefined;
  let rideStatus: LatestLocationResult['rideStatus'];
  let isRideActive: boolean;
  let locationId: string;
  let driverId: string;
  let rideId: string;

  if (parseResult.success) {
    const data = parseResult.data;
    if (!data.location) return null;
    location = data.location.position;
    rideStatus = data.rideStatus as LatestLocationResult['rideStatus'];
    isRideActive = data.isRideActive;
    locationId = data.location.id;
    driverId = data.location.driverId;
    rideId = data.location.rideId;
  } else {
    // Manual PascalCase extraction as fallback
    const r = response as Record<string, unknown>;
    const loc = (r.location ?? r.Location) as Record<string, unknown> | undefined;
    if (!loc) return null;

    const pos = (loc.position ?? loc.Position) as Record<string, unknown> | undefined;
    location = pos ? {
      latitude: (pos.latitude ?? pos.Latitude ?? 0) as number,
      longitude: (pos.longitude ?? pos.Longitude ?? 0) as number,
    } : undefined;

    if (!location) return null;

    rideStatus = ((r.rideStatus ?? r.RideStatus) as LatestLocationResult['rideStatus']) ?? 'Ongoing';
    isRideActive = ((r.isRideActive ?? r.IsRideActive) as boolean) ?? true;
    locationId = ((loc.id ?? loc.Id) as string) ?? '';
    driverId = ((loc.driverId ?? loc.DriverId) as string) ?? '';
    rideId = ((loc.rideId ?? loc.RideId) as string) ?? '';
  }

  return {
    position: location,
    rideStatus,
    isRideActive,
    locationId,
    driverId,
    rideId,
  };
}

/**
 * Result of sending location update
 */
export interface SendLocationResult {
  geoLocationId: string;
  timestamp: string;
  message: string;
}

/**
 * Send location update to backend
 *
 * @param trackingId - The tracking session ID
 * @param driverId - Driver identifier
 * @param position - Current GPS position
 * @returns Location update result with geolocation ID and timestamp
 */
export async function sendLocationUpdate(
  trackingId: string,
  driverId: string,
  position: Position,
  rideStatus: RideStatus = 'Ongoing'
): Promise<SendLocationResult> {
  debugLog('Sending location update:', { trackingId, driverId, position });

  const request: AddGeolocationRequest = {
    driverId,
    trackingId,
    position,
    rideStatus,
  };

  const response = await apiPost<unknown>(`/addgeolocationtoride/${trackingId}`, request);

  // Validate response schema
  const parseResult = AddGeolocationResponseSchema.safeParse(response);

  if (!parseResult.success) {
    debugLog('Response validation warning:', parseResult.error);
  }

  const validatedResponse = parseResult.success
    ? parseResult.data
    : (response as AddGeolocationResponse);

  debugLog('Location update sent successfully');

  return {
    geoLocationId: validatedResponse.geoLocationId,
    timestamp: validatedResponse.timestamp,
    message: validatedResponse.message,
  };
}

/**
 * Result of closing tracking
 */
export interface CloseTrackingResult {
  trackingId: string;
  rideId: string;
  rideStatus: RideStatus;
  closedAt: string;
  message: string;
}

/**
 * Close a tracking session
 *
 * @param trackingId - The tracking session ID
 * @param request - Optional close request with status details
 * @returns Closure result with details
 */
export async function closeTracking(
  trackingId: string,
  request?: CloseTrackingRequest
): Promise<CloseTrackingResult> {
  debugLog('Closing tracking:', { trackingId, request });

  const response = await apiPost<unknown>(`/closetracking/${trackingId}`, request ?? {});

  // Validate response schema
  const parseResult = CloseTrackingResponseSchema.safeParse(response);

  if (!parseResult.success) {
    debugLog('Response validation warning:', parseResult.error);
  }

  const validatedResponse = parseResult.success
    ? parseResult.data
    : (response as CloseTrackingResponse);

  debugLog('Tracking closed successfully');

  return {
    trackingId: validatedResponse.id,
    rideId: validatedResponse.rideId,
    rideStatus: validatedResponse.rideStatus,
    closedAt: validatedResponse.closedAt,
    message: validatedResponse.message,
  };
}

/**
 * Build tracking URL with all necessary parameters
 *
 * @param params - Tracking parameters
 * @returns Relative URL for tracking page
 */
export function buildTrackingUrl(params: {
  from: string;
  to: string;
  trackingId: string;
  driverId?: string;
  driverInfo?: NormalizedDriverInfo | null;
  sendingTrackingInfo?: boolean;
}): string {
  const {
    from,
    to,
    trackingId,
    driverId,
    driverInfo,
    sendingTrackingInfo = true,
  } = params;

  const searchParams = new URLSearchParams({
    from,
    to,
    trackingId,
    sendingTrackingInfo: sendingTrackingInfo.toString(),
  });

  if (driverId) {
    searchParams.set('driverId', driverId);
  }

  if (driverInfo) {
    searchParams.set('driverData', JSON.stringify(driverInfo));
  }

  return `/track?${searchParams.toString()}`;
}

/**
 * Generate a unique ride ID (UUID v4 format)
 */
export function generateRideId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
