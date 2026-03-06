/**
 * API Type Definitions with Zod Validation Schemas
 *
 * All API request/response types are validated using Zod schemas
 * to ensure type safety at runtime.
 */

import { z } from 'zod';

// =============================================================================
// Core Types
// =============================================================================

/**
 * GPS Position with validation for valid coordinate ranges
 */
export const PositionSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});
export type Position = z.infer<typeof PositionSchema>;

/**
 * Position with string coordinates (as used in some API endpoints)
 */
export const StringPositionSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
});
export type StringPosition = z.infer<typeof StringPositionSchema>;

/**
 * Ride status enum matching backend RideStatus values
 */
export const RideStatusSchema = z.enum([
  'Ongoing',
  'ArrivedSafely',
  'RideEndedByDriver',
  'Cancelled',
  'SOS',
]);
export type RideStatus = z.infer<typeof RideStatusSchema>;

// =============================================================================
// Tracking API Types
// =============================================================================

/**
 * Request payload for initiating ride tracking
 */
export const InitiateTrackingRequestSchema = z.object({
  deviceCode: z.string().min(1, 'Device code is required'),
  rideId: z.string(),
  trackingRecipients: z.string(),
  initialPosition: PositionSchema,
  isRideActive: z.boolean(),
  rideStatus: RideStatusSchema,
  driverIdFromDispatchService: z.string(),
  driverPlateNumber: z.string(),
  modelType: z.string(), // Vehicle model (e.g., "Toyota Corolla")
  destinationPosition: PositionSchema,
  destinationAddress: z.string(),
});
export type InitiateTrackingRequest = z.infer<typeof InitiateTrackingRequestSchema>;

/**
 * Driver information returned from tracking initiation (new format)
 */
export const DriverInfoResponseSchema = z.object({
  driverId: z.string(),
  plateNumber: z.string(),
  modelType: z.string(),
});
export type DriverInfoResponse = z.infer<typeof DriverInfoResponseSchema>;

/**
 * Driver information returned from tracking initiation (legacy format)
 */
export const DriverInfoSchema = z.object({
  FirstName: z.string().nullish(),
  LastName: z.string().nullish(),
  Rating: z.number().nullish(),
  CarBrand: z.string().nullish(),
  CarModel: z.string().nullish(),
  LicensePlateNumber: z.string().nullish(),
  PictureAddress: z.string().nullish(),
  PhoneNumber: z.string().nullish(),
});
export type DriverInfo = z.infer<typeof DriverInfoSchema>;

/**
 * Normalized driver data for client use
 */
export interface NormalizedDriverInfo {
  driverId: string;
  plateNumber: string;
  modelType: string;
  // Legacy fields for backward compatibility
  firstName: string | null;
  lastName: string | null;
  rating: number;
  carBrand: string | null;
  carModel: string | null;
  pictureUrl: string | null;
  phone: string | null;
}

/**
 * Response from tracking initiation endpoint.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const InitiateTrackingResponseSchema = z
  .object({
    id: z.string().optional(),
    Id: z.string().optional(),
    message: z.string().optional(),
    Message: z.string().optional(),
    driverInfo: DriverInfoResponseSchema.optional(),
    DriverInfo: DriverInfoResponseSchema.optional(),
  })
  .transform((data) => ({
    id: data.id ?? data.Id ?? '',
    message: data.message ?? data.Message ?? '',
    driverInfo: data.driverInfo ?? data.DriverInfo ?? undefined,
  }));
export type InitiateTrackingResponse = z.infer<typeof InitiateTrackingResponseSchema>;

/**
 * Request payload for adding geolocation to a ride
 */
export const AddGeolocationRequestSchema = z.object({
  driverId: z.string(),
  position: PositionSchema,
  trackingId: z.string(),
  rideStatus: RideStatusSchema,
});
export type AddGeolocationRequest = z.infer<typeof AddGeolocationRequestSchema>;

/**
 * Response from add geolocation endpoint
 */
export const AddGeolocationResponseSchema = z.object({
  message: z.string(),
  geoLocationId: z.string(),
  timestamp: z.string(), // ISO 8601 format
});
export type AddGeolocationResponse = z.infer<typeof AddGeolocationResponseSchema>;

/**
 * Request payload for sending location updates (legacy format)
 * @deprecated Use AddGeolocationRequestSchema instead
 * Note: The backend API has a typo "trackinngId" (with 3 n's)
 */
export const LocationUpdateRequestSchema = z.object({
  driverId: z.string(),
  trackinngId: z.string(), // Backend typo preserved for compatibility
  position: StringPositionSchema,
});
export type LocationUpdateRequest = z.infer<typeof LocationUpdateRequestSchema>;

/**
 * Position schema that handles both camelCase and PascalCase from backend
 */
const ResponsePositionSchema = z
  .object({
    latitude: z.number().optional(),
    Latitude: z.number().optional(),
    longitude: z.number().optional(),
    Longitude: z.number().optional(),
  })
  .transform((data) => ({
    latitude: data.latitude ?? data.Latitude ?? 0,
    longitude: data.longitude ?? data.Longitude ?? 0,
  }));

/**
 * Location object in latest location response.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const LocationDataSchema = z
  .object({
    id: z.string().optional(),
    Id: z.string().optional(),
    driverId: z.string().optional(),
    DriverId: z.string().optional(),
    rideId: z.string().optional(),
    RideId: z.string().optional(),
    position: ResponsePositionSchema.optional(),
    Position: ResponsePositionSchema.optional(),
  })
  .transform((data) => ({
    id: data.id ?? data.Id ?? '',
    driverId: data.driverId ?? data.DriverId ?? '',
    rideId: data.rideId ?? data.RideId ?? '',
    position: data.position ?? data.Position ?? { latitude: 0, longitude: 0 },
  }));
export type LocationData = z.infer<typeof LocationDataSchema>;

/**
 * Response from get latest location endpoint.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const LatestLocationResponseSchema = z
  .object({
    location: LocationDataSchema.optional(),
    Location: LocationDataSchema.optional(),
    rideStatus: RideStatusSchema.optional(),
    RideStatus: RideStatusSchema.optional(),
    isRideActive: z.boolean().optional(),
    IsRideActive: z.boolean().optional(),
  })
  .transform((data) => ({
    location: data.location ?? data.Location ?? undefined,
    rideStatus: data.rideStatus ?? data.RideStatus ?? 'Ongoing',
    isRideActive: data.isRideActive ?? data.IsRideActive ?? true,
  }));
export type LatestLocationResponse = z.infer<typeof LatestLocationResponseSchema>;

/**
 * Request payload for closing a tracking session
 */
export const CloseTrackingRequestSchema = z.object({
  arrivedSafely: z.boolean().optional(),
  driverId: z.string().optional(),
  rideStatus: RideStatusSchema.optional(),
});
export type CloseTrackingRequest = z.infer<typeof CloseTrackingRequestSchema>;

/**
 * Response from close tracking endpoint.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const CloseTrackingResponseSchema = z
  .object({
    message: z.string().optional(),
    Message: z.string().optional(),
    id: z.string().optional(),
    Id: z.string().optional(),
    rideId: z.string().optional(),
    RideId: z.string().optional(),
    isRideActive: z.literal(false).optional(),
    IsRideActive: z.literal(false).optional(),
    rideStatus: RideStatusSchema.optional(),
    RideStatus: RideStatusSchema.optional(),
    closedAt: z.string().optional(),
    ClosedAt: z.string().optional(),
  })
  .transform((data) => ({
    message: data.message ?? data.Message ?? '',
    id: data.id ?? data.Id ?? '',
    rideId: data.rideId ?? data.RideId ?? '',
    isRideActive: (data.isRideActive ?? data.IsRideActive ?? false),
    rideStatus: data.rideStatus ?? data.RideStatus ?? 'Ongoing',
    closedAt: data.closedAt ?? data.ClosedAt ?? '',
  }));
export type CloseTrackingResponse = z.infer<typeof CloseTrackingResponseSchema>;

// =============================================================================
// Google Maps Geocoding Types
// =============================================================================

/**
 * Single geocoding result from Google Maps API
 */
export const GeocodingResultItemSchema = z.object({
  formatted_address: z.string(),
  geometry: z
    .object({
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    })
    .optional(),
});

/**
 * Full geocoding response from Google Maps API
 */
export const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultItemSchema),
  status: z.string(),
});
export type GeocodingResponse = z.infer<typeof GeocodingResponseSchema>;

// =============================================================================
// API Error Types
// =============================================================================

/**
 * Standardized API error structure
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  retryable: boolean;
  originalError?: unknown;
}

/**
 * API response wrapper for typed responses
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize driver info from new API response format to consistent client format
 */
export function normalizeDriverInfo(
  driverInfo: DriverInfoResponse | undefined | null
): NormalizedDriverInfo | null {
  if (!driverInfo) return null;

  return {
    driverId: driverInfo.driverId,
    plateNumber: driverInfo.plateNumber,
    modelType: driverInfo.modelType,
    // Legacy fields not in new format - set to defaults
    firstName: null,
    lastName: null,
    rating: 0,
    carBrand: null,
    carModel: driverInfo.modelType, // Map modelType to carModel for compatibility
    pictureUrl: null,
    phone: null,
  };
}

/**
 * Normalize driver info from legacy API response format
 * @deprecated Use normalizeDriverInfo for new API format
 */
export function normalizeDriverInfoLegacy(
  driverInfo: DriverInfo | undefined | null
): NormalizedDriverInfo | null {
  if (!driverInfo) return null;

  return {
    driverId: '',
    plateNumber: driverInfo.LicensePlateNumber ?? '',
    modelType: driverInfo.CarModel ?? '',
    firstName: driverInfo.FirstName ?? null,
    lastName: driverInfo.LastName ?? null,
    rating: driverInfo.Rating ?? 0,
    carBrand: driverInfo.CarBrand ?? null,
    carModel: driverInfo.CarModel ?? null,
    pictureUrl: driverInfo.PictureAddress ?? null,
    phone: driverInfo.PhoneNumber ?? null,
  };
}

/**
 * Extract tracking ID from response
 */
export function extractTrackingId(
  response: InitiateTrackingResponse
): string {
  return response.id;
}
