/**
 * Input Validation Schemas
 *
 * Comprehensive Zod schemas for validating all user inputs
 * in the ride tracking application.
 */

import { z } from 'zod';

// =============================================================================
// GPS Validation
// =============================================================================

/**
 * GPS coordinates schema with valid ranges
 */
export const GPSCoordinatesSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});
export type GPSCoordinates = z.infer<typeof GPSCoordinatesSchema>;

/**
 * GPS string format validation (e.g., "40.7128, -74.0060")
 */
export const GPSStringSchema = z
  .string()
  .min(1, 'Location is required')
  .refine(
    (val) => {
      const parts = val.split(',').map((s) => s.trim());
      if (parts.length !== 2) return false;
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      return (
        !isNaN(lat) &&
        !isNaN(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      );
    },
    {
      message: 'Invalid GPS format. Expected: latitude, longitude (e.g., 40.7128, -74.0060)',
    }
  );

/**
 * Parse GPS string to coordinates object
 *
 * @param gpsString - GPS string in "lat, lon" format
 * @returns Parsed coordinates or null if invalid
 */
export function parseGPSCoordinates(
  gpsString: string
): GPSCoordinates | null {
  const result = GPSStringSchema.safeParse(gpsString);

  if (!result.success) {
    return null;
  }

  const parts = gpsString.split(',').map((s) => parseFloat(s.trim()));
  return {
    latitude: parts[0],
    longitude: parts[1],
  };
}

/**
 * Validate GPS coordinates and return result
 */
export function validateGPSCoordinates(
  gpsString: string
): { valid: true; coordinates: GPSCoordinates } | { valid: false; error: string } {
  const result = GPSStringSchema.safeParse(gpsString);

  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors[0]?.message || 'Invalid GPS coordinates',
    };
  }

  const parts = gpsString.split(',').map((s) => parseFloat(s.trim()));
  return {
    valid: true,
    coordinates: {
      latitude: parts[0],
      longitude: parts[1],
    },
  };
}

// =============================================================================
// Phone Number Validation
// =============================================================================

/**
 * International phone number pattern
 * Supports formats like: +1234567890, 1234567890, +1 234 567 890
 */
export const PhoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform((val) => val.replace(/[\s\-()]/g, '')) // Remove formatting
  .refine(
    (val) => /^\+?[1-9]\d{6,14}$/.test(val),
    {
      message: 'Invalid phone number format',
    }
  );

/**
 * Validate a phone number
 */
export function validatePhoneNumber(
  phone: string
): { valid: true; normalized: string } | { valid: false; error: string } {
  const result = PhoneNumberSchema.safeParse(phone);

  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors[0]?.message || 'Invalid phone number',
    };
  }

  return {
    valid: true,
    normalized: result.data,
  };
}

// =============================================================================
// Contact Validation
// =============================================================================

/**
 * Contact entry schema (from contact picker or manual entry)
 */
export const ContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
});
export type Contact = z.infer<typeof ContactSchema>;

/**
 * Contact list schema (at least one contact required)
 */
export const ContactListSchema = z
  .array(z.string().min(1))
  .min(1, 'At least one contact is required');

// =============================================================================
// ETA Validation
// =============================================================================

/**
 * ETA in minutes (reasonable range for taxi rides)
 */
export const ETASchema = z
  .number()
  .min(1, 'ETA must be at least 1 minute')
  .max(480, 'ETA cannot exceed 8 hours');

/**
 * Parse ETA from string input
 */
export function parseETA(value: string | number): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(parsed) ? 20 : Math.max(1, Math.min(480, parsed));
}

// =============================================================================
// Ride Start Form Schema
// =============================================================================

/**
 * Complete ride start form validation schema
 */
export const RideStartFormSchema = z.object({
  currentLocation: GPSStringSchema,
  destination: GPSStringSchema,
  contacts: ContactListSchema,
  eta: ETASchema,
  driverId: z.string().optional(),
  deviceCode: z.string().optional(),
  rideId: z.string().optional(),
  plateNumber: z.string().optional(),
});
export type RideStartForm = z.infer<typeof RideStartFormSchema>;

/**
 * Validate ride start form data
 */
export function validateRideStartForm(
  data: unknown
): { valid: true; data: RideStartForm } | { valid: false; errors: Record<string, string> } {
  const result = RideStartFormSchema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });
    return { valid: false, errors };
  }

  return { valid: true, data: result.data };
}

// =============================================================================
// Driver Info Validation
// =============================================================================

/**
 * Driver information schema (from API response)
 */
export const DriverInfoSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  rating: z.number().min(0).max(5),
  carBrand: z.string().nullable(),
  carModel: z.string().nullable(),
  plateNumber: z.string().nullable(),
  pictureUrl: z.string().url().nullable().or(z.string().nullable()),
  phone: z.string().nullable(),
});
export type DriverInfo = z.infer<typeof DriverInfoSchema>;

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Safe URL validation (for driver picture URLs, etc.)
 */
export const SafeUrlSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL format' }
  );

/**
 * Validate a URL is safe to use
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const result = SafeUrlSchema.safeParse(url);
  return result.success;
}
