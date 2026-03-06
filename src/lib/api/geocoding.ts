/**
 * Google Maps Geocoding Service
 *
 * Provides reverse geocoding functionality to convert
 * GPS coordinates to human-readable addresses.
 */

import { config, debugLog } from '@/lib/config';
import { GeocodingResponseSchema, Position } from './types';

/**
 * Convert GPS coordinates to a human-readable address
 *
 * Falls back to formatted coordinates if geocoding fails.
 *
 * @param position - GPS position with latitude and longitude
 * @returns Human-readable address or formatted coordinates
 */
export async function reverseGeocode(position: Position): Promise<string> {
  const { latitude, longitude } = position;
  const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  try {
    debugLog('Reverse geocoding:', { latitude, longitude });

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', config.googleMaps.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      debugLog('Geocoding request failed:', response.status);
      return fallbackAddress;
    }

    const data = await response.json();

    // Validate response schema
    const parseResult = GeocodingResponseSchema.safeParse(data);

    if (!parseResult.success) {
      debugLog('Geocoding response validation failed:', parseResult.error);
      return fallbackAddress;
    }

    const { results, status } = parseResult.data;

    if (status !== 'OK' || results.length === 0) {
      debugLog('Geocoding returned no results:', status);
      return fallbackAddress;
    }

    const address = results[0].formatted_address;
    debugLog('Geocoding result:', address);

    return address;
  } catch (error) {
    debugLog('Geocoding error:', error);
    return fallbackAddress;
  }
}

/**
 * Convert GPS coordinates to address (convenience alias)
 */
export async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  return reverseGeocode({ latitude, longitude });
}

/**
 * Batch reverse geocode multiple positions
 *
 * @param positions - Array of GPS positions
 * @returns Array of addresses in same order as input
 */
export async function batchReverseGeocode(
  positions: Position[]
): Promise<string[]> {
  // Process in parallel but with a small delay to avoid rate limiting
  const results: string[] = [];

  for (const position of positions) {
    const address = await reverseGeocode(position);
    results.push(address);

    // Small delay between requests to avoid rate limiting
    if (positions.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
