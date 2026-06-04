/**
 * API Module Barrel Export
 *
 * Re-exports all API-related functionality for convenient imports.
 */

// Client
export { apiRequest, apiGet, apiPost, apiPut, apiDelete } from './client';
export type { RequestConfig } from './client';

// Tracking API
export {
  initiateTracking,
  getLatestLocation,
  sendLocationUpdate,
  closeTracking,
  buildTrackingUrl,
  generateRideId,
  getTrackingInfo,
} from './tracking';
export type {
  InitiateTrackingResult,
  LatestLocationResult,
  SendLocationResult,
  CloseTrackingResult,
  GetTrackingResult,
} from './tracking';

// Video API (rider video request + Telegram delivery)
export {
  requestRiderVideo,
  issueTelegramLink,
  buildTelegramDeepLink,
} from './video';
export type {
  RiderVideoResult,
  TelegramLinkResult,
} from './video';

// Geocoding API
export {
  reverseGeocode,
  getAddressFromCoordinates,
  batchReverseGeocode,
} from './geocoding';

// Roads API
export { snapToRoads, snapPositionWithHistory } from './roads';


// SOS Emergency API
export {
  createSOS,
  getSOSStatus,
  addSOSGeolocation,
} from './sos';
export type {
  CreateSOSResult,
  SOSStatusResult,
} from './sos';
// Types
export {
  PositionSchema,
  StringPositionSchema,
  RideStatusSchema,
  InitiateTrackingRequestSchema,
  DriverInfoSchema,
  DriverInfoResponseSchema,
  InitiateTrackingResponseSchema,
  AddGeolocationRequestSchema,
  AddGeolocationResponseSchema,
  GetTrackingResponseSchema,
  LocationUpdateRequestSchema,
  LocationDataSchema,
  LatestLocationResponseSchema,
  CloseTrackingRequestSchema,
  CloseTrackingResponseSchema,
  GeocodingResponseSchema,
  normalizeDriverInfo,
  normalizeDriverInfoLegacy,
  extractTrackingId,
} from './types';

export type {
  Position,
  StringPosition,
  RideStatus,
  InitiateTrackingRequest,
  DriverInfo,
  DriverInfoResponse,
  NormalizedDriverInfo,
  InitiateTrackingResponse,
  AddGeolocationRequest,
  AddGeolocationResponse,
  LocationUpdateRequest,
  LocationData,
  LatestLocationResponse,
  CloseTrackingRequest,
  CloseTrackingResponse,
  GeocodingResponse,
  ApiError,
  ApiResult,
  NormalizedRiderInfo,
} from './types';
// SOS Types
export {
  CreateSOSRequestSchema,
  CreateSOSResponseSchema,
  SOSStatusResponseSchema,
  AddSOSGeolocationRequestSchema,
} from './types';

export type {
  CreateSOSRequest,
  CreateSOSResponse,
  SOSStatusResponse,
  AddSOSGeolocationRequest,
} from './types';

