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
  'Initiated',
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
});
export type AddGeolocationRequest = z.infer<typeof AddGeolocationRequestSchema>;

/**
 * Response from add geolocation endpoint
 */
export const AddGeolocationResponseSchema = z.object({
  message: z.string().optional(),
  Message: z.string().optional(),
  geoLocationId: z.string().optional(),
  GeoLocationId: z.string().optional(),
  timestamp: z.string().optional(),
  Timestamp: z.string().optional(),
  isTrackingFinished: z.boolean().optional(),
  IsTrackingFinished: z.boolean().optional(),
}).transform((data) => ({
  message: data.message ?? data.Message ?? '',
  geoLocationId: data.geoLocationId ?? data.GeoLocationId ?? '',
  timestamp: data.timestamp ?? data.Timestamp ?? '',
  isTrackingFinished: data.isTrackingFinished ?? data.IsTrackingFinished ?? false,
}));
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
    eta: z.number().optional(),
    ETA: z.number().optional(),
    Eta: z.number().optional(),
    estimatedTimeOfArrival: z.number().optional(),
    EstimatedTimeOfArrival: z.number().optional(),
  })
  .transform((data) => ({
    location: data.location ?? data.Location ?? undefined,
    rideStatus: data.rideStatus ?? data.RideStatus ?? 'Ongoing',
    isRideActive: data.isRideActive ?? data.IsRideActive ?? true,
    eta: data.eta ?? data.ETA ?? data.Eta ?? data.estimatedTimeOfArrival ?? data.EstimatedTimeOfArrival ?? undefined,
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
// Get Tracking Info Types
// =============================================================================

/**
 * Normalized rider info for client use
 */
export interface NormalizedRiderInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

/**
 * Driver info as returned in tracking object (different from DriverInfoResponseSchema).
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
const TrackingDriverInfoSchema = z
  .object({
    firstName: z.string().optional(),
    FirstName: z.string().optional(),
    lastName: z.string().optional(),
    LastName: z.string().optional(),
    rating: z.number().optional(),
    Rating: z.number().optional(),
    carBrand: z.string().optional(),
    CarBrand: z.string().optional(),
    carModel: z.string().optional(),
    CarModel: z.string().optional(),
    plateNumber: z.string().optional(),
    PlateNumber: z.string().optional(),
    licensePlateNumber: z.string().optional(),
    LicensePlateNumber: z.string().optional(),
    pictureUrl: z.string().optional(),
    PictureUrl: z.string().optional(),
    pictureAddress: z.string().optional(),
    PictureAddress: z.string().optional(),
    phone: z.string().optional(),
    Phone: z.string().optional(),
    phoneNumber: z.string().optional(),
    PhoneNumber: z.string().optional(),
  })
  .transform((data) => ({
    firstName: data.firstName ?? data.FirstName ?? null,
    lastName: data.lastName ?? data.LastName ?? null,
    rating: data.rating ?? data.Rating ?? 0,
    carBrand: data.carBrand ?? data.CarBrand ?? null,
    carModel: data.carModel ?? data.CarModel ?? null,
    plateNumber: data.plateNumber ?? data.PlateNumber ?? data.licensePlateNumber ?? data.LicensePlateNumber ?? '',
    pictureUrl: data.pictureUrl ?? data.PictureUrl ?? data.pictureAddress ?? data.PictureAddress ?? null,
    phone: data.phone ?? data.Phone ?? data.phoneNumber ?? data.PhoneNumber ?? null,
  }));

/**
 * Rider info as returned in tracking object.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
const TrackingRiderInfoSchema = z
  .object({
    firstName: z.string().optional(),
    FirstName: z.string().optional(),
    lastName: z.string().optional(),
    LastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    PhoneNumber: z.string().optional(),
  })
  .transform((data) => ({
    firstName: data.firstName ?? data.FirstName ?? '',
    lastName: data.lastName ?? data.LastName ?? '',
    phoneNumber: data.phoneNumber ?? data.PhoneNumber ?? '',
  }));

/**
 * Position schema for tracking response (reuses dual-case pattern).
 */
const TrackingPositionSchema = z
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
 * Response from GET /tracking/{trackingId}.
 * Returns the full tracking object with driver info, rider info, positions.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const GetTrackingResponseSchema = z
  .object({
    deviceCode: z.string().optional(),
    DeviceCode: z.string().optional(),
    driverIdFromDispatchService: z.string().optional(),
    DriverIdFromDispatchService: z.string().optional(),
    driverId: z.string().optional(),
    DriverId: z.string().optional(),
    rideId: z.string().optional(),
    RideId: z.string().optional(),
    trackingRecipients: z.string().optional(),
    TrackingRecipients: z.string().optional(),
    initialPosition: TrackingPositionSchema.optional(),
    InitialPosition: TrackingPositionSchema.optional(),
    destinationPosition: TrackingPositionSchema.optional(),
    DestinationPosition: TrackingPositionSchema.optional(),
    destinationAddress: z.string().optional(),
    DestinationAddress: z.string().optional(),
    driverInfo: TrackingDriverInfoSchema.optional(),
    DriverInfo: TrackingDriverInfoSchema.optional(),
    riderInfo: TrackingRiderInfoSchema.optional(),
    RiderInfo: TrackingRiderInfoSchema.optional(),
    rideStatus: RideStatusSchema.optional(),
    RideStatus: RideStatusSchema.optional(),
    isRideActive: z.boolean().optional(),
    IsRideActive: z.boolean().optional(),
  })
  .transform((data) => ({
    deviceCode: data.deviceCode ?? data.DeviceCode ?? data.driverIdFromDispatchService ?? data.DriverIdFromDispatchService ?? data.driverId ?? data.DriverId ?? '',
    rideId: data.rideId ?? data.RideId ?? '',
    trackingRecipients: data.trackingRecipients ?? data.TrackingRecipients ?? '',
    initialPosition: data.initialPosition ?? data.InitialPosition ?? { latitude: 0, longitude: 0 },
    destinationPosition: data.destinationPosition ?? data.DestinationPosition ?? { latitude: 0, longitude: 0 },
    destinationAddress: data.destinationAddress ?? data.DestinationAddress ?? '',
    driverInfo: data.driverInfo ?? data.DriverInfo ?? undefined,
    riderInfo: data.riderInfo ?? data.RiderInfo ?? undefined,
    rideStatus: data.rideStatus ?? data.RideStatus ?? 'Initiated',
    isRideActive: data.isRideActive ?? data.IsRideActive ?? true,
  }));
export type GetTrackingResponse = z.infer<typeof GetTrackingResponseSchema>;

// =============================================================================
// SOS Emergency Types
// =============================================================================

/**
 * Request payload for creating an SOS alert (driver emergency)
 */
export const CreateSOSRequestSchema = z.object({
  driverId: z.string(),
  driverPosition: PositionSchema,
  driverName: z.string(),
  driverPhone: z.string(),
  driverPlateNumber: z.string(),
  vehicleModel: z.string(),
});
export type CreateSOSRequest = z.infer<typeof CreateSOSRequestSchema>;

/**
 * Response from creating an SOS alert.
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const CreateSOSResponseSchema = z
  .object({
    sosId: z.string().optional(),
    SosId: z.string().optional(),
    id: z.string().optional(),
    Id: z.string().optional(),
    message: z.string().optional(),
    Message: z.string().optional(),
  })
  .transform((data) => ({
    sosId: data.sosId ?? data.SosId ?? data.id ?? data.Id ?? '',
    message: data.message ?? data.Message ?? '',
  }));
export type CreateSOSResponse = z.infer<typeof CreateSOSResponseSchema>;

/**
 * Response position for SOS polling.
 * Handles both PascalCase and camelCase.
 */
const SOSPositionSchema = z
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
 * Response from polling SOS status (GET /api/sos/{sosId}).
 * Handles both PascalCase (C# backend) and camelCase property names.
 */
export const SOSStatusResponseSchema = z
  .object({
    sosId: z.string().optional(),
    SosId: z.string().optional(),
    id: z.string().optional(),
    Id: z.string().optional(),
    driverId: z.string().optional(),
    DriverId: z.string().optional(),
    driverName: z.string().optional(),
    DriverName: z.string().optional(),
    driverPhone: z.string().optional(),
    DriverPhone: z.string().optional(),
    driverPlateNumber: z.string().optional(),
    DriverPlateNumber: z.string().optional(),
    vehicleModel: z.string().optional(),
    VehicleModel: z.string().optional(),
    driverPosition: SOSPositionSchema.optional(),
    DriverPosition: SOSPositionSchema.optional(),
    position: SOSPositionSchema.optional(),
    Position: SOSPositionSchema.optional(),
    isActive: z.boolean().optional(),
    IsActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    CreatedAt: z.string().optional(),
  })
  .transform((data) => ({
    sosId: data.sosId ?? data.SosId ?? data.id ?? data.Id ?? '',
    driverId: data.driverId ?? data.DriverId ?? '',
    driverName: data.driverName ?? data.DriverName ?? '',
    driverPhone: data.driverPhone ?? data.DriverPhone ?? '',
    driverPlateNumber: data.driverPlateNumber ?? data.DriverPlateNumber ?? '',
    vehicleModel: data.vehicleModel ?? data.VehicleModel ?? '',
    driverPosition: data.driverPosition ?? data.DriverPosition ?? data.position ?? data.Position ?? { latitude: 0, longitude: 0 },
    isActive: data.isActive ?? data.IsActive ?? true,
    createdAt: data.createdAt ?? data.CreatedAt ?? '',
  }));
export type SOSStatusResponse = z.infer<typeof SOSStatusResponseSchema>;

/**
 * Request payload for adding SOS geolocation update
 */
export const AddSOSGeolocationRequestSchema = z.object({
  driverId: z.string(),
  position: PositionSchema,
});
export type AddSOSGeolocationRequest = z.infer<typeof AddSOSGeolocationRequestSchema>;

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
